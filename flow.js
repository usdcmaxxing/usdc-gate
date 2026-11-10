// USDC Gate — flow / structural checks against real chain history.
//
// The verdict logic in check.js asks "is this counterparty safe?". This module
// answers the follow-up: "what does the money flow look like?" — the patterns
// that x402 measurement studies found make up most fictitious settlement count.
//
// Two history sources, both keyed on USDC Transfer logs:
//   * Blockscout (richer: address metadata, pagination) — used when reachable.
//   * eth_getLogs against a configurable RPC — the fallback, works on any chain.
//
// Everything here degrades: if history is unavailable the checks report
// `unknown` and never fail the verdict on their own.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { USDC } from "./usdc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const CHAIN_KEY = process.env.CHAIN_KEY || "base-sepolia";
const SOURCE = process.env.FLOW_SOURCE || "auto"; // auto | blockscout | logs
const WINDOW_BLOCKS = Number(process.env.FLOW_WINDOW_BLOCKS || 50_000);
const LIMIT = Number(process.env.FLOW_LIMIT || 200);
const TTL_MS = Number(process.env.FLOW_TTL_MS || 300_000);
const TIMEOUT_MS = Number(process.env.FLOW_TIMEOUT_MS || 4_000);

const RPCS = {
  "base-sepolia":
    process.env.RPC_BASE_SEPOLIA || "https://base-sepolia-rpc.publicnode.com",
  base: process.env.RPC_BASE || "https://base-rpc.publicnode.com",
};

const BLOCKSCOUT = {
  "base-sepolia":
    process.env.BLOCKSCOUT_BASE_SEPOLIA || "https://base-sepolia.blockscout.com",
  base: process.env.BLOCKSCOUT_BASE || "https://base.blockscout.com",
};

// ── static data ────────────────────────────────────────────────────────────

function loadJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, rel), "utf8"));
  } catch {
    return null;
  }
}

const MIXERS = loadJson("data/mixers.json")?.addresses || [];
const OFAC = loadJson("data/ofac-sdn-digital.json");

/** Mixer/privacy-pool contracts, keyed by lowercase address. */
function mixerIndex() {
  const m = new Map();
  for (const e of MIXERS) m.set(e.address.toLowerCase(), e);
  return m;
}

/**
 * OFAC SDN digital-currency addresses that are EVM-shaped (ETH / USDC / USDT on
 * Ethereum-family chains). Sanctions attach to the controller, not the chain, so
 * these match on any EVM chain — unlike mixer contracts, which are chain-bound.
 */
function ofacEvmIndex() {
  const m = new Map();
  for (const r of OFAC?.records || []) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(r.address || "")) continue;
    if (!["ETH", "USDC", "USDT"].includes(r.asset)) continue;
    m.set(r.address.toLowerCase(), { name: r.name, asset: r.asset, list: r.list });
  }
  return m;
}

let _mixers = null;
let _ofac = null;
function mixers() {
  return (_mixers ??= mixerIndex());
}
function ofacEvm() {
  return (_ofac ??= ofacEvmIndex());
}

// ── chain history ──────────────────────────────────────────────────────────

function rpcClient(chainKey) {
  return createPublicClient({
    chain: chainKey === "base" ? base : baseSepolia,
    transport: http(RPCS[chainKey] || RPCS.base),
  });
}

const addrTopic = (a) => "0x" + "0".repeat(24) + a.toLowerCase().replace(/^0x/, "");

async function ethGetLogs(chainKey, address, { fromBlock, toBlock, topicPos }) {
  const client = rpcClient(chainKey);
  const topics = [TRANSFER_TOPIC];
  topics[topicPos] = addrTopic(address);
  return client.getLogs({
    address: USDC[chainKey].address,
    topics,
    fromBlock,
    toBlock,
  });
}

function shrinkRange(fromBlock, toBlock, factor = 4) {
  const span = Math.max(1, toBlock - fromBlock);
  const next = Math.max(64, Math.floor(span / factor));
  return { fromBlock: Math.max(0n, toBlock - BigInt(next)), toBlock };
}

/** USDC Transfer logs for `address` as sender (topic1) and receiver (topic2). */
async function fetchViaLogs(chainKey, address) {
  const client = rpcClient(chainKey);
  let toBlock = await client.getBlockNumber();
  let fromBlock = toBlock - BigInt(WINDOW_BLOCKS);
  if (fromBlock < 0n) fromBlock = 0n;

  const out = [];
  for (const pos of [1, 2]) {
    let from = fromBlock;
    let to = toBlock;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const logs = await ethGetLogs(chainKey, address, {
          fromBlock: from,
          toBlock: to,
          topicPos: pos,
        });
        for (const log of logs) {
          out.push(normalizeLog(log, chainKey, address, pos));
        }
        break;
      } catch (e) {
        // Range too wide for the provider: shrink and retry, then give up.
        const msg = String(e?.shortMessage || e?.message || e);
        if (!/exceeds|max results|range|limit/i.test(msg)) break;
        const next = shrinkRange(from, to);
        from = next.fromBlock;
        to = next.toBlock;
        if (from === to) break;
      }
    }
  }
  return dedupe(out);
}

function normalizeLog(log, chainKey, address, pos) {
  const from = ("0x" + log.topics[1].slice(26)).toLowerCase();
  const to = ("0x" + log.topics[2].slice(26)).toLowerCase();
  return {
    from,
    to,
    value: BigInt(log.data || "0x0"),
    blockNumber: Number(log.blockNumber),
    txHash: log.transactionHash,
    timestamp: null,
    source: "eth_getLogs",
    chain: chainKey,
  };
}

async function fetchViaBlockscout(chainKey, address) {
  const base = BLOCKSCOUT[chainKey];
  if (!base) return null;
  const usdc = USDC[chainKey].address.toLowerCase();
  const out = [];
  for (const filter of ["from", "to"]) {
    let params = `?filter=${filter}`;
    for (let page = 0; page < 10; page++) {
      const url = `${base}/api/v2/addresses/${address}/token-transfers${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) break;
      const data = await res.json();
      for (const it of data.items || []) {
        if ((it.token?.address_hash || "").toLowerCase() !== usdc) continue;
        out.push({
          from: (it.from?.hash || "").toLowerCase(),
          to: (it.to?.hash || "").toLowerCase(),
          value: BigInt(it.total?.value || "0"),
          blockNumber: Number(it.block_number),
          txHash: it.transaction_hash,
          timestamp: it.timestamp,
          source: "blockscout",
          chain: chainKey,
        });
      }
      const next = data.next_page_params;
      if (!next || (out.length && out.length >= LIMIT)) break;
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) q.set(k, String(v));
      params = `?${q.toString()}`;
    }
  }
  return dedupe(out);
}

function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = `${r.txHash}:${r.from}:${r.to}:${r.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((a, b) => a.blockNumber - b.blockNumber);
}

// ── cache ──────────────────────────────────────────────────────────────────

const CACHE = new Map();

function cacheKey(chainKey, address) {
  return `${chainKey}:${address.toLowerCase()}`;
}

async function getTransfers(chainKey, address) {
  const key = cacheKey(chainKey, address);
  const hit = CACHE.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = { rows: [], source: "none", error: null };
  try {
    if (SOURCE !== "logs") {
      // null = source unavailable (network/HTTP error); [] = reachable, no history.
      const bs = await fetchViaBlockscout(chainKey, address).catch(() => null);
      if (bs !== null) {
        value.rows = bs;
        value.source = "blockscout";
      } else {
        const logs = await fetchViaLogs(chainKey, address);
        value.rows = logs;
        value.source = "eth_getLogs";
      }
    } else {
      const logs = await fetchViaLogs(chainKey, address);
      value.rows = logs;
      value.source = "eth_getLogs";
    }
  } catch (e) {
    value.error = String(e?.shortMessage || e?.message || e);
  }

  CACHE.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

// ── analysis ───────────────────────────────────────────────────────────────

const isEvm = (a) => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);

function counterpartyRisk(address, chainKey) {
  const a = address.toLowerCase();
  const mixer = mixers().get(a);
  if (mixer) {
    const chainOk = mixer.chains?.includes(chainKey) || mixer.chains?.includes("base");
    return {
      address: a,
      name: mixer.name,
      kind: "mixer",
      chain_bound: true,
      applies: chainOk,
      source: mixer.source,
    };
  }
  const ofac = ofacEvm().get(a);
  if (ofac) {
    return { address: a, name: ofac.name, kind: "ofac_sdn", asset: ofac.asset, applies: true };
  }
  return null;
}

function summarize(rows, address) {
  const funders = new Map();
  const spends = new Map();
  for (const r of rows) {
    if (r.from === address && isEvm(r.to)) {
      spends.set(r.to, (spends.get(r.to) || 0) + 1);
    }
    if (r.to === address && isEvm(r.from)) {
      funders.set(r.from, (funders.get(r.from) || 0) + 1);
    }
  }
  return {
    transfers_in: rows.filter((r) => r.to === address).length,
    transfers_out: rows.filter((r) => r.from === address).length,
    funders: [...funders.keys()],
    spends: [...spends.keys()],
  };
}

function detectPeelChain(rows, address) {
  const out = rows
    .filter((r) => r.from === address && isEvm(r.to))
    .sort((a, b) => a.blockNumber - b.blockNumber);
  let best = [];
  let run = [];
  for (const r of out) {
    if (!run.length) {
      run = [r];
      continue;
    }
    if (r.value < run[run.length - 1].value) {
      run.push(r);
    } else {
      if (run.length > best.length) best = run;
      run = [r];
    }
  }
  if (run.length > best.length) best = run;
  if (best.length < 3) return { flag: false, length: best.length };
  return {
    flag: true,
    length: best.length,
    pattern: best
      .slice(0, 5)
      .map((r) => ({ to: r.to, value: r.value.toString(), block: r.blockNumber })),
    evidence: `${best.length} consecutive outgoing transfers of strictly decreasing size`,
  };
}

/**
 * Analyse the money flow between a payer and payee.
 * Returns a plain object; `unknown` fields are null, never guesses.
 */
export async function analyzeFlow(chainKey, payer, payee, opts = {}) {
  const ck = chainKey || CHAIN_KEY;
  const p = payer.toLowerCase();
  const q = payee.toLowerCase();
  const fetchFn = opts.fetchTransfers || getTransfers;

  const [pr, qr] = await Promise.all([fetchFn(ck, p), fetchFn(ck, q)]);

  const payerSum = summarize(pr.rows, p);
  const payeeSum = summarize(qr.rows, q);

  const result = {
    source: pr.source === qr.source ? pr.source : `${pr.source}/${qr.source}`,
    chain: ck,
    window_blocks: WINDOW_BLOCKS,
    payer: { address: p, ...payerSum },
    payee: { address: q, ...payeeSum },
    shared_funder: { flag: false, addresses: [], evidence: null },
    mixer_exposure: { flag: false, hits: [] },
    peel_chain: { flag: false },
    new_payee: null,
    errors: [pr.error, qr.error].filter(Boolean),
  };

  if (!pr.rows.length && !qr.rows.length) {
    result.coverage = "none";
    return result;
  }
  result.coverage = "partial";

  // shared funder: a third party that funded both sides, or one side funded the other
  const shared = payerSum.funders.filter((f) => payeeSum.funders.includes(f));
  const payerFundedPayee = payerSum.spends.includes(q);
  const payeeFundedPayer = payeeSum.spends.includes(p);
  if (shared.length || payerFundedPayee || payeeFundedPayer) {
    result.shared_funder = {
      flag: true,
      addresses: [...new Set(shared)],
      direct: payerFundedPayee || payeeFundedPayer,
      evidence: shared.length
        ? `common funder(s): ${shared.join(", ")}`
        : "one party funded the other directly",
    };
  }

  // mixer / sanctioned counterparties
  const hits = [];
  for (const [label, set] of [
    ["payer_funder", payerSum.funders],
    ["payer_spend", payerSum.spends],
    ["payee_funder", payeeSum.funders],
    ["payee_spend", payeeSum.spends],
  ]) {
    for (const a of set) {
      const risk = counterpartyRisk(a, ck);
      if (risk && risk.applies) hits.push({ direction: label, ...risk });
    }
  }
  if (hits.length) {
    result.mixer_exposure = {
      flag: true,
      hits: hits.slice(0, 10),
      evidence: hits
        .slice(0, 3)
        .map((h) => `${h.direction}: ${h.name}`)
        .join("; "),
    };
  }

  // peel chain on the payer's outflow
  result.peel_chain = detectPeelChain(pr.rows, p);

  // new payee proxy: no USDC history at all in the window
  if (payeeSum.transfers_in === 0 && payeeSum.transfers_out === 0) {
    result.new_payee = {
      flag: true,
      evidence: `no USDC transfers in the last ${WINDOW_BLOCKS} blocks (proxy, not proof of a fresh address)`,
    };
  }

  return result;
}

export { TRANSFER_TOPIC, summarize, detectPeelChain, counterpartyRisk, mixers, ofacEvm };
