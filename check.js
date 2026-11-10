// USDC Gate — verdict logic. No x402 coupling, no express.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isBlacklisted, isAddress, USDC } from "./usdc.js";
import { analyzeFlow } from "./flow.js";

// Flow checks hit chain history (Blockscout / eth_getLogs). Off only when a
// deployment explicitly wants the fast, history-free verdict.
const FLOW_ENABLED = String(process.env.FLOW_ENABLED ?? "true") !== "false";
let OFAC = { records: [], fetched_at: null, total_addresses: 0 };
try {
  const mod = await import("./data/ofac-sdn-digital.json", { assert: { type: "json" } });
  OFAC = mod.default || mod;
} catch {
  try {
    const fs = (await import("node:fs")).default;
    const path = (await import("node:path")).default;
    const { fileURLToPath } = await import("node:url");
    const dir = path.dirname(fileURLToPath(import.meta.url));
    OFAC = JSON.parse(fs.readFileSync(path.join(dir, "data", "ofac-sdn-digital.json"), "utf8"));
  } catch {
    // sanctions layer disabled
  }
}
const OFAC_INDEX = new Map(
  OFAC.records.filter((r) => r.asset === "ETH").map((r) => [r.address.toLowerCase(), r])
);

const CHAIN_KEY = process.env.CHAIN_KEY || "base-sepolia";

function baseVerdict() {
  return {
    verdict: "APPROVE",
    reason_codes: [],
    asset: null,
    issuer_blacklist: null,
    sanctions: null,
    flow: null,
    policy: null,
    checked_at: new Date().toISOString(),
  };
}

function push(v, code) {
  v.reason_codes.push(code);
}

function finalize(v) {
  const reject = v.reason_codes.some((c) =>
    ["OFAC_SDN_MATCH", "ISSUER_BLACKLISTED", "SELF_SEND", "INVALID_ADDRESS"].includes(c)
  );
  const hold = v.reason_codes.some((c) =>
    [
      "AMOUNT_OVER_CEILING",
      "AMOUNT_BELOW_FLOOR",
      "ISSUER_READ_FAILED",
      "MIXER_EXPOSURE",
      "PEEL_CHAIN",
      "SHARED_FUNDER",
      "VANITY_SUFFIX_BATCH",
      "NEW_PAYEE",
      "NON_NATIVE_USDC",
    ].includes(c)
  );
  v.verdict = reject ? "REJECT" : hold ? "HOLD" : "APPROVE";
  return v;
}

/** The core check. `opts.isBlacklisted` is a test seam. */
export async function checkCounterparty(body, opts = {}) {
  const blacklistFn = opts.isBlacklisted || isBlacklisted;
  const v = baseVerdict();
  const payer = (body.payer || "").toLowerCase();
  const payee = (body.payee || "").toLowerCase();
  const chain = body.chain || CHAIN_KEY;
  const amount = body.amount != null ? String(body.amount) : null;

  // 1. address validity
  if (!isAddress(payer)) push(v, "INVALID_ADDRESS");
  if (!isAddress(payee)) push(v, "INVALID_ADDRESS");

  // 2. asset identity — is it native (issuer-freezable) USDC?
  const assetAddr = (body.asset || USDC[chain]?.address || "").toLowerCase();
  const expected = (USDC[chain]?.address || "").toLowerCase();
  const kind = assetAddr === expected ? "native" : "unknown/bridged";
  v.asset = {
    kind,
    freezable_by_issuer: kind === "native",
    contract: assetAddr || null,
    expected_native: expected || null,
    chain,
    note:
      kind === "native"
        ? "Circle-issued native USDC — the issuer can blacklist this contract"
        : "Not the Circle-native USDC address for this chain — different freeze surface",
  };
  if (kind !== "native") push(v, "NON_NATIVE_USDC");

  // 3. live issuer blacklist read (the wedge)
  if (isAddress(payer) && isAddress(payee)) {
    try {
      const [p, q] = await Promise.all([
        blacklistFn(chain, payer),
        blacklistFn(chain, payee),
      ]);
      v.issuer_blacklist = {
        chain,
        payer: { address: payer, blacklisted: p.blacklisted, at_block: String(p.checked_at_block) },
        payee: { address: payee, blacklisted: q.blacklisted, at_block: String(q.checked_at_block) },
        contract: p.contract,
        evidence: p.evidence,
        token: p.token,
      };
      if (p.blacklisted) push(v, "ISSUER_BLACKLISTED");
      if (q.blacklisted) push(v, "ISSUER_BLACKLISTED");
    } catch (e) {
      v.issuer_blacklist = { error: String(e?.message || e) };
      push(v, "ISSUER_READ_FAILED");
    }
  }

  // 4. OFAC SDN — exact match against the dated snapshot
  const payerOfac = OFAC_INDEX.get(payer) || null;
  const payeeOfac = OFAC_INDEX.get(payee) || null;
  v.sanctions = {
    list: "OFAC SDN",
    snapshot_fetched_at: OFAC.fetched_at,
    addresses_in_snapshot: OFAC.total_addresses,
    payer: payerOfac ? { name: payerOfac.name, address: payerOfac.address } : null,
    payee: payeeOfac ? { name: payeeOfac.name, address: payeeOfac.address } : null,
    caveat:
      "Exact match against a dated OFAC download — a floor, not a live signal. " +
      "Circle's issuer blacklist is the live layer.",
  };
  if (payerOfac || payeeOfac) push(v, "OFAC_SDN_MATCH");

  // 5. flow / structural heuristics (patterns x402 measurement flagged as fictitious)
  let flow = {
    self_send: payer === payee && isAddress(payer),
    shared_funder: false, // derived from chain history below
    vanity_suffix_batch: false, // not derivable from chain data
    mixer_exposure: false,
    peel_chain: false,
    new_payee: null,
  };
  v.flow = flow;
  if (flow.self_send) push(v, "SELF_SEND");

  // 5b. real chain-history flow checks (degrade to the values above on failure)
  if (FLOW_ENABLED && isAddress(payer) && isAddress(payee)) {
    try {
      const f = await analyzeFlow(chain, payer, payee);
      flow.shared_funder = Boolean(f.shared_funder?.flag);
      flow.mixer_exposure = Boolean(f.mixer_exposure?.flag);
      flow.peel_chain = Boolean(f.peel_chain?.flag);
      flow.new_payee = f.new_payee?.flag ?? null;
      flow.evidence = {
        source: f.source,
        coverage: f.coverage,
        window_blocks: f.window_blocks,
        shared_funder: f.shared_funder,
        mixer_exposure: f.mixer_exposure,
        peel_chain: f.peel_chain,
        new_payee: f.new_payee,
        payer_counters: f.payer && {
          funders: f.payer.funders?.length ?? 0,
          spends: f.payer.spends?.length ?? 0,
        },
        payee_counters: f.payee && {
          funders: f.payee.funders?.length ?? 0,
          spends: f.payee.spends?.length ?? 0,
        },
        errors: f.errors,
      };
      if (flow.shared_funder) push(v, "SHARED_FUNDER");
      if (flow.mixer_exposure) push(v, "MIXER_EXPOSURE");
      if (flow.peel_chain) push(v, "PEEL_CHAIN");
      if (flow.new_payee) push(v, "NEW_PAYEE");
    } catch (e) {
      flow.evidence = { error: String(e?.message || e) };
    }
  }

  // 6. policy
  const ceiling = Number(process.env.AMOUNT_CEILING || 100000);
  const floor = Number(process.env.AMOUNT_FLOOR || 0.000001);
  v.policy = {
    amount,
    ceiling,
    floor,
    over_ceiling: amount != null && Number(amount) > ceiling,
    below_floor: amount != null && Number(amount) < floor,
  };
  if (v.policy.over_ceiling) push(v, "AMOUNT_OVER_CEILING");
  if (v.policy.below_floor) push(v, "AMOUNT_BELOW_FLOOR");

  return finalize(v);
}

export { OFAC };
