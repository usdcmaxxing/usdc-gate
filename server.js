import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { USDC } from "./usdc.js";
import { checkCounterparty, OFAC } from "./check.js";

// ── Config ────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 4021);
const NETWORK = process.env.X402_NETWORK || "eip155:84532"; // Base Sepolia
const PRICE = process.env.PRICE || "$0.02";
const FACILITATOR = process.env.FACILITATOR || "https://x402.org/facilitator";

// Seller wallet: env key, or generate one (testnet demo)
const SELLER_KEY =
  process.env.SELLER_PRIVATE_KEY ||
  (() => {
    const k = generatePrivateKey();
    console.log("[usdc-gate] no SELLER_PRIVATE_KEY set — generated throwaway key:");
    console.log("[usdc-gate]", k);
    return k;
  })();
const sellerAccount = privateKeyToAccount(SELLER_KEY);
const PAY_TO = process.env.PAY_TO || sellerAccount.address;

console.log(`[usdc-gate] payTo = ${PAY_TO}`);
console.log(`[usdc-gate] network = ${NETWORK} | price = ${PRICE} | facilitator = ${FACILITATOR}`);
console.log(
  `[usdc-gate] OFAC SDN snapshot: ${OFAC.total_addresses} addresses (fetched ${OFAC.fetched_at})`
);

// ── Server ────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "USDC Gate",
    description: "Pre-flight counterparty risk for USDC payments. USDC only.",
    endpoints: {
      "POST /v1/check-counterparty": {
        price: PRICE,
        network: NETWORK,
        accepts: "application/json",
        input: "{ payer, payee, chain?, asset?, amount? }",
      },
      "GET /v1/check-counterparty": "same check as POST (returns 402 until paid)",
      "GET /v1/sample": "free static example of the verdict shape",
      "GET /health": "liveness",
    },
    assets: {
      "base-sepolia": USDC["base-sepolia"],
      base: USDC.base,
      ethereum: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    },
    payTo: PAY_TO,
  });
});

app.get("/health", (_req, res) => res.json({ ok: true, payTo: PAY_TO }));

// Free sample verdict — lets a buyer see the output shape before paying.
// Clearly labelled: a static example, not a live check.
app.get("/v1/sample", (_req, res) => {
  res.json({
    sample: true,
    note: "Static example of the verdict shape. Call POST /v1/check-counterparty (paid) for a live check.",
    verdict: "REJECT",
    reason_codes: ["OFAC_SDN_MATCH", "ISSUER_BLACKLISTED"],
    asset: {
      kind: "native",
      freezable_by_issuer: true,
      contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      expected_native: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      chain: "base",
      note: "Circle-issued native USDC — the issuer can blacklist this contract",
    },
    issuer_blacklist: {
      chain: "base",
      payer: { address: "0x…", blacklisted: true, at_block: "54242012" },
      payee: { address: "0x…", blacklisted: false, at_block: "54242012" },
      contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      evidence: "eth_call isBlacklisted(address)",
      token: "Native USDC (Circle-issued, Base)",
    },
    sanctions: {
      list: "OFAC SDN",
      snapshot_fetched_at: OFAC.fetched_at,
      addresses_in_snapshot: OFAC.total_addresses,
      payer: { name: "EXAMPLE SANCTIONED ENTITY", address: "0x…" },
      payee: null,
      caveat:
        "Exact match against a dated OFAC download — a floor, not a live signal. " +
        "Circle's issuer blacklist is the live layer.",
    },
    flow: {
      self_send: false,
      shared_funder: false,
      vanity_suffix_batch: false,
      mixer_exposure: false,
      peel_chain: false,
      new_payee: null,
    },
    policy: { amount: "0.02", ceiling: 100000, floor: 0.000001, over_ceiling: false, below_floor: false },
    checked_at: new Date().toISOString(),
  });
});

const routes = {
  "POST /v1/check-counterparty": {
    accepts: [{ scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO }],
    description: "Pre-flight counterparty risk check for a USDC payment (USDC only)",
    mimeType: "application/json",
  },
  "GET /v1/check-counterparty": {
    accepts: [{ scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO }],
    description: "Pre-flight counterparty risk check for a USDC payment (USDC only)",
    mimeType: "application/json",
  },
};

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme()
);

// Fetch the facilitator's supported schemes before serving.
try {
  await resourceServer.initialize();
  console.log("[usdc-gate] facilitator initialized");
} catch (e) {
  console.warn("[usdc-gate] facilitator initialize failed:", String(e?.message || e));
}

app.use(paymentMiddleware(routes, resourceServer, undefined, undefined, false));

app.post("/v1/check-counterparty", async (req, res) => {
  try {
    const result = await checkCounterparty(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/v1/check-counterparty", async (req, res) => {
  const q = req.query;
  const result = await checkCounterparty({
    payer: q.payer,
    payee: q.payee,
    chain: q.chain,
    asset: q.asset,
    amount: q.amount,
  });
  res.json(result);
});

const server = app.listen(PORT, () => {
  console.log(`[usdc-gate] listening on http://localhost:${PORT}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
