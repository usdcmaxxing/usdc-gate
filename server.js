import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  declareDiscoveryExtension,
  bazaarResourceServerExtension,
  withBazaar,
} from "@x402/extensions/bazaar";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { USDC } from "./usdc.js";
import { checkCounterparty, OFAC } from "./check.js";
import { getTokenPrice, getMultiplePrices } from "./prices.js";
import { scoreWallet } from "./walletscore.js";
import { openApiDocument } from "./openapi.js";

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
      "GET /v1/token-price": "$0.01 — real-time token prices (CoinGecko). ?symbol=ETH or ?symbols=ETH,BTC,SOL",
      "POST /v1/wallet-score": "$0.03 — wallet risk score (0-100): sanctions, blacklist, activity, contract detection",
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

// AgentCash / x402scan discovery document (OpenAPI 3.1 + x-payment-info)
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument(ORIGIN));
});

// ── Machine-readable discovery ────────────────────────────────────────────
// These are UNGATED on purpose: a crawler must be able to read what the
// service sells before it pays for a call. Every x402 directory
// (agent402.tools, the CDP Bazaar, Celo's index) probes a public origin, so
// these routes are the difference between being listed and being invisible.
//
// They still do not make the service discoverable on their own — the
// directories require a public HTTPS origin, and the CDP Bazaar only
// indexes a resource after it has settled a real payment. See README.

const ORIGIN = process.env.PUBLIC_ORIGIN || `http://localhost:${PORT}`;

const ENDPOINTS = [
  {
    path: "/v1/check-counterparty",
    method: "POST",
    price: PRICE,
    network: NETWORK,
    scheme: "exact",
    asset: USDC["base-sepolia"].address,
    payTo: PAY_TO,
    description:
      "Pre-flight counterparty risk check for a USDC payment. USDC only.",
    inputSchema: {
      type: "object",
      properties: {
        payer: { type: "string", description: "Payer address (0x…)" },
        payee: { type: "string", description: "Payee address (0x…)" },
        chain: { type: "string", enum: ["base-sepolia", "base"] },
        asset: { type: "string" },
        amount: { type: "string" },
      },
      required: ["payer", "payee"],
    },
    outputExample: {
      verdict: "APPROVE",
      reason_codes: [],
      issuer_blacklist: { payer: { blacklisted: false } },
    },
  },
  {
    path: "/v1/check-counterparty",
    method: "GET",
    price: PRICE,
    network: NETWORK,
    scheme: "exact",
    asset: USDC["base-sepolia"].address,
    payTo: PAY_TO,
    description: "Same check as POST; query parameters instead of a body.",
    inputSchema: {
      type: "object",
      properties: {
        payer: { type: "string" },
        payee: { type: "string" },
        chain: { type: "string", enum: ["base-sepolia", "base"] },
      },
      required: ["payer", "payee"],
    },
    outputExample: { verdict: "APPROVE", reason_codes: [] },
  },
];

app.get("/.well-known/x402", (_req, res) => {
  res.json({
    origin: ORIGIN,
    x402Version: 2,
    service: "USDC Gate",
    description: "Pre-flight counterparty risk for USDC payments. USDC only.",
    endpoints: ENDPOINTS,
    freeEndpoints: ["/v1/sample", "/health", "/"],
    assets: {
      "base-sepolia": USDC["base-sepolia"],
      base: USDC.base,
    },
    payTo: PAY_TO,
  });
});

// A2A agent card — lets another agent discover and delegate to this service.
app.get("/.well-known/agent.json", (_req, res) => {
  res.json({
    name: "USDC Gate",
    description:
      "Pre-flight counterparty risk for USDC payments: Circle issuer " +
      "blacklist, OFAC SDN, and on-chain flow checks. Paid per call in USDC.",
    url: ORIGIN,
    version: "0.2.0",
    provider: { name: "USDC Gate", url: ORIGIN },
    schemaVersion: "1.0",
    capabilities: { streaming: false, pushNotifications: false },
    securitySchemes: { x402: { type: "x402", network: NETWORK, price: PRICE } },
    skills: [{
      id: "check-counterparty",
      name: "Check counterparty",
      description: "Is this address safe to pay in USDC?",
      tags: ["compliance", "risk", "usdc", "x402"],
      endpoint: `${ORIGIN}/v1/check-counterparty`,
      price: PRICE,
      network: NETWORK,
    }],
  });
});

app.get("/llms.txt", (_req, res) => {
  res.type("text/plain").send(
    [
      "# USDC Gate",
      "",
      "> Pre-flight counterparty risk for USDC payments. USDC only.",
      "",
      "## What it sells",
      "",
      `- \`POST /v1/check-counterparty\` — ${PRICE} USDC on ${NETWORK} (exact scheme)`,
      "  Input: { payer, payee, chain?, asset?, amount? }",
      "  Output: { verdict: APPROVE|HOLD|REJECT, reason_codes, issuer_blacklist, sanctions, flow, policy }",
      "",
      "## Why it exists",
      "",
      "Circle's USDC exposes isBlacklisted(address) on-chain. That is live",
      "issuer state, readable at any block. OFAC is a dated download — a floor,",
      "not a live signal. An address frozen mid-relationship is invisible to a",
      "list check and obvious to an on-chain read.",
      "",
      "The x402 facilitator screens at verification AND settlement, and a",
      "decline returns 403 non-retryably at the address level. This check runs",
      "before that happens.",
      "",
      "## Free, ungated",
      "",
      "- `GET /v1/sample` — static example of the verdict shape",
      "- `GET /health` — liveness",
      "- `GET /.well-known/x402` — this manifest",
      "",
      "## Assets",
      "",
      `- base-sepolia: ${USDC["base-sepolia"].address}`,
      `- base: ${USDC.base.address}`,
      `- ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`,
      "",
      `payTo: ${PAY_TO}`,
      "",
    ].join("\n"),
  );
});

// Agent402-style skill file. Agents read this to decide whether to call.
app.get("/skill.md", (_req, res) => {
  res.type("text/markdown").send(
    [
      "---",
      "name: usdc-gate",
      "description: Is this address safe to pay in USDC? Live Circle issuer blacklist, OFAC SDN, and on-chain flow checks. Paid per call in USDC.",
      "payment: x402",
      `price: ${PRICE}`,
      `network: ${NETWORK}`,
      "---",
      "",
      "# USDC Gate",
      "",
      "Pre-flight counterparty risk for USDC payments. USDC only.",
      "",
      "## When to use",
      "",
      "Before sending USDC to an address you do not fully trust — a payee,",
      "a payer, or a counterparty in an agent-to-agent settlement.",
      "",
      "## How to call",
      "",
      "```bash",
      `curl -X POST ${ORIGIN}/v1/check-counterparty \\`,
      "  -H 'content-type: application/json' \\",
      "  -d '{\"payer\":\"0x…\",\"payee\":\"0x…\",\"amount\":\"0.02\"}'",
      "```",
      "",
      "The first response is `402 Payment Required`. Pay the challenge in USDC",
      "and retry with the payment signature. No account, no API key.",
      "",
      "## Reading the verdict",
      "",
      "- `APPROVE` — no sanctions, not issuer-blacklisted, no flow flags.",
      "- `HOLD` — a tiered/variable venue with no tier supplied, or a first",
      "  interaction with a payee with no USDC history. Not a rejection.",
      "- `REJECT` — OFAC SDN match, issuer blacklist hit, or self-send.",
      "",
      "## Caveat",
      "",
      "`issuer_blacklist` is live and authoritative. `sanctions` is exact-match",
      "against a dated OFAC download — a floor, not a live signal. `flow` checks",
      "need chain history; when unavailable they report `unknown` and never",
      "fail a verdict alone.",
      "",
    ].join("\n"),
  );
});


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

// ── Bazaar discovery ───────────────────────────────────────────────────────
// Declares the endpoint's input/output shape in the 402 itself, so facilitators
// and crawlers can catalog it without reading this file. The server extension
// fills in the HTTP method at request time; withBazaar lets our facilitator
// client read the declaration back.
const INPUT_SCHEMA = {
  type: "object",
  properties: {
    payer: { type: "string", description: "Payer address (0x…)" },
    payee: { type: "string", description: "Payee address (0x…)" },
    chain: {
      type: "string",
      enum: ["base-sepolia", "base"],
      description: "Chain key (default: base-sepolia)",
    },
    asset: {
      type: "string",
      description: "Asset contract address (default: native USDC on the chain)",
    },
    amount: { type: "string", description: "Optional amount for policy checks" },
  },
  required: ["payer", "payee"],
};

const OUTPUT = {
  example: {
    verdict: "APPROVE",
    reason_codes: [],
    issuer_blacklist: { payer: { blacklisted: false } },
  },
  schema: { type: "object" },
};

const postBazaar = declareDiscoveryExtension({
  method: "POST",
  input: { payer: "0x…", payee: "0x…", chain: "base-sepolia", amount: "0.02" },
  inputSchema: INPUT_SCHEMA,
  bodyType: "json",
  output: OUTPUT,
});

const getQueryBazaar = declareDiscoveryExtension({
  method: "GET",
  input: { payer: "0x…", payee: "0x…" },
  inputSchema: {
    type: "object",
    properties: {
      payer: { type: "string" },
      payee: { type: "string" },
      chain: { type: "string", enum: ["base-sepolia", "base"] },
      asset: { type: "string" },
      amount: { type: "string" },
    },
    required: ["payer", "payee"],
  },
  output: OUTPUT,
});

const tokenPriceBazaar = declareDiscoveryExtension({
  method: "GET",
  input: { symbol: "ETH" },
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "Token symbol (e.g. ETH, BTC, SOL)" },
      symbols: { type: "string", description: "Comma-separated list of symbols" },
    },
  },
  output: {
    example: { token: "ETH", price_usd: 2132.11, change_24h_pct: 0.52 },
    schema: { type: "object" },
  },
});

const walletScoreBazaar = declareDiscoveryExtension({
  method: "POST",
  input: { address: "0x…", chain: "base-sepolia" },
  inputSchema: {
    type: "object",
    properties: {
      address: { type: "string", description: "Wallet address (0x…)" },
      chain: { type: "string", enum: ["base-sepolia", "base"] },
    },
    required: ["address"],
  },
  bodyType: "json",
  output: {
    example: { address: "0x…", risk_score: 10, risk_level: "LOW", flags: [] },
    schema: { type: "object" },
  },
});

const routes = {
  "POST /v1/check-counterparty": {
    accepts: [{ scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO }],
    description: "Pre-flight counterparty risk check for a USDC payment (USDC only)",
    mimeType: "application/json",
    extensions: postBazaar,
  },
  "GET /v1/check-counterparty": {
    accepts: [{ scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO }],
    description: "Pre-flight counterparty risk check for a USDC payment (USDC only)",
    mimeType: "application/json",
    extensions: getQueryBazaar,
  },
  "GET /v1/token-price": {
    accepts: [{ scheme: "exact", price: "$0.01", network: NETWORK, payTo: PAY_TO }],
    description: "Real-time token price from CoinGecko. Query: ?symbol=ETH or ?symbols=ETH,BTC,SOL",
    mimeType: "application/json",
    extensions: tokenPriceBazaar,
  },
  "POST /v1/wallet-score": {
    accepts: [{ scheme: "exact", price: "$0.03", network: NETWORK, payTo: PAY_TO }],
    description: "Wallet risk score (0-100): sanctions, issuer blacklist, on-chain activity, contract detection",
    mimeType: "application/json",
    extensions: walletScoreBazaar,
  },
};

const facilitatorClient = withBazaar(new HTTPFacilitatorClient({ url: FACILITATOR }));
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme())
  .registerExtension(bazaarResourceServerExtension);

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

// Token price oracle — real-time prices from CoinGecko
app.get("/v1/token-price", async (req, res) => {
  try {
    const { symbol, symbols } = req.query;
    if (symbols) {
      const result = await getMultiplePrices(symbols.split(","));
      res.json({ prices: result, fetched_at: new Date().toISOString() });
    } else if (symbol) {
      const result = await getTokenPrice(symbol);
      res.json(result);
    } else {
      res.status(400).json({ error: "Provide ?symbol=ETH or ?symbols=ETH,BTC,SOL" });
    }
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Wallet risk scorer — broader risk assessment
app.post("/v1/wallet-score", async (req, res) => {
  try {
    const { address, chain } = req.body || {};
    if (!address) return res.status(400).json({ error: "address required" });
    const result = await scoreWallet(address, chain || "base-sepolia");
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Export for Cloudflare Workers and Vercel (and other serverless platforms)
export default app;

// Only listen when running as a standalone Node.js process
if (!process.env.WORKER_MODE && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`[usdc-gate] listening on http://localhost:${PORT}`);
  });
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  process.on("SIGINT", () => server.close(() => process.exit(0)));
}
