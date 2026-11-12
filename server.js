import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import {
  getSanctionsDataset,
  getMemecoinShadowBook,
  getMemecoinSignals,
  getMemecoinFilterAttribution,
  getTokenContractRegistry,
  getX402ServiceRegistry,
  getTokenPriceHistory,
  getSolanaTrendingPools,
  getStablecoinRegistry,
  listDatasets,
} from "./dataset.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Landing page — human-readable
app.get("/", (_req, res) => {
  res.type("text/html").sendFile(path.join(__dirname, "public", "index.html"));
});

// Service metadata — machine-readable
app.get("/v1/service-info", (_req, res) => {
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
      "GET /v1/dataset/sanctions": "$0.02 — crypto sanctions & risk dataset (527 OFAC SDN + 91 Circle blacklist + 5 mixers). ?query= to filter.",
      "GET /v1/dataset/memecoin-shadow-book": "$0.02 — 2,969 memecoin picks with outcomes (survivorship-bias-free).",
      "GET /v1/dataset/memecoin-signals": "$0.02 — historical memecoin trading signals with P&L.",
      "GET /v1/dataset/memecoin-filter-attribution": "$0.01 — filter attribution analysis (venue, liquidity, post-age).",
      "GET /v1/dataset/token-contracts": "$0.02 — top 500 tokens by market cap with contract addresses.",
      "GET /v1/dataset/x402-services": "$0.05 — all 4,000 x402-paid services on Agentic.Market with pricing.",
      "GET /v1/dataset/token-price-history": "$0.02 — 30-day price history for top tokens.",
      "GET /v1/dataset/solana-trending-pools": "$0.02 — 100 trending Solana DEX pools with liquidity and volume.",
      "GET /v1/dataset/stablecoins": "$0.01 — major stablecoins with verified contract addresses across chains.",
      "GET /v1/datasets": "free list of all available datasets",
      "GET /v1/sample": "free static example of the verdict shape",
      "GET /health": "liveness",
    },
    assets: {
      "base-sepolia": USDC["base-sepolia"],
      base: USDC.base,
      ethereum: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    },
    payTo: PAY_TO,
    catalog: `${ORIGIN}/catalog`,
    dashboard: `${ORIGIN}/dashboard`,
    stats: `${ORIGIN}/v1/stats`,
  });
});

app.get("/health", (_req, res) => res.json({ ok: true, payTo: PAY_TO }));

// Agent Data Catalog — HTML page listing everything we sell
app.get("/catalog", (_req, res) => {
  res.type("text/html").sendFile(path.join(__dirname, "public", "catalog.html"));
});

// AgentCash / x402scan discovery document (OpenAPI 3.1 + x-payment-info)
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument(ORIGIN));
});

// Favicon — SVG icon served at root
app.get("/favicon.ico", (_req, res) => {
  res.type("image/svg+xml").send(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">' +
    '<rect width="32" height="32" rx="8" fill="#2775CA"/>' +
    '<circle cx="16" cy="16" r="9" fill="none" stroke="white" stroke-width="2"/>' +
    '<path d="M16 11 L16 21 M12 13.5 Q16 11 20 13.5 M12 18.5 Q16 21 20 18.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="16" cy="16" r="1.5" fill="white"/></svg>'
  );
});

app.get("/favicon.svg", (_req, res) => {
  res.type("image/svg+xml").send(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">' +
    '<rect width="32" height="32" rx="8" fill="#2775CA"/>' +
    '<circle cx="16" cy="16" r="9" fill="none" stroke="white" stroke-width="2"/>' +
    '<path d="M16 11 L16 21 M12 13.5 Q16 11 20 13.5 M12 18.5 Q16 21 20 18.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="16" cy="16" r="1.5" fill="white"/></svg>'
  );
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
    skills: [
      {
        id: "check-counterparty",
        name: "Check counterparty",
        description: "Is this address safe to pay in USDC? Live Circle blacklist, OFAC SDN, and flow checks.",
        tags: ["compliance", "risk", "usdc", "x402"],
        endpoint: `${ORIGIN}/v1/check-counterparty`,
        price: PRICE,
        network: NETWORK,
      },
      {
        id: "sanctions-dataset",
        name: "Sanctions & risk dataset",
        description: "623 records: OFAC SDN + Circle blacklist + mixers. Filterable.",
        tags: ["compliance", "risk", "sanctions", "dataset"],
        endpoint: `${ORIGIN}/v1/dataset/sanctions`,
        price: "$0.02",
        network: NETWORK,
      },
      {
        id: "memecoin-shadow-book",
        name: "Memecoin shadow book",
        description: "2,969 memecoin picks with outcomes. Survivorship-bias-free.",
        tags: ["trading", "memecoin", "signals", "dataset"],
        endpoint: `${ORIGIN}/v1/dataset/memecoin-shadow-book`,
        price: "$0.02",
        network: NETWORK,
      },
      {
        id: "x402-service-registry",
        name: "x402 service registry",
        description: "All 4,000 x402-paid services with pricing and endpoints.",
        tags: ["directory", "x402", "services", "dataset"],
        endpoint: `${ORIGIN}/v1/dataset/x402-services`,
        price: "$0.05",
        network: NETWORK,
      },
      {
        id: "token-contracts",
        name: "Token contract registry",
        description: "Top 500 tokens by market cap with contract addresses across chains.",
        tags: ["tokens", "contracts", "metadata", "dataset"],
        endpoint: `${ORIGIN}/v1/dataset/token-contracts`,
        price: "$0.02",
        network: NETWORK,
      },
    ],
    documentationUrl: `${ORIGIN}/catalog`,
    dashboardUrl: `${ORIGIN}/dashboard`,
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
      "- `GET /v1/token-price` — $0.02 — real-time token prices (CoinGecko)",
      "- `POST /v1/wallet-score` — $0.03 — wallet risk score (0-100)",
      "",
      "### Datasets",
      "",
      "- `GET /v1/dataset/sanctions` — $0.02 — 623 records (OFAC SDN + Circle blacklist + mixers)",
      "- `GET /v1/dataset/memecoin-shadow-book` — $0.02 — 2,969 picks with outcomes",
      "- `GET /v1/dataset/memecoin-signals` — $0.02 — historical signals with P&L",
      "- `GET /v1/dataset/memecoin-filter-attribution` — $0.01 — filter attribution analysis",
      "- `GET /v1/dataset/token-contracts` — $0.02 — top 500 tokens with contract addresses",
      "- `GET /v1/dataset/x402-services` — $0.05 — all 4,000 x402 services",
      "- `GET /v1/dataset/token-price-history` — $0.02 — 30-day hourly price history",
      "- `GET /v1/dataset/solana-trending-pools` — $0.02 — 100 trending Solana pools",
      "- `GET /v1/dataset/stablecoins` — $0.01 — 8 stablecoins with addresses",
      "",
      "## Free, ungated",
      "",
      "- `GET /v1/datasets` — list all datasets",
      "- `GET /catalog` — human-readable catalog",
      "- `GET /dashboard` — usage dashboard",
      "- `GET /v1/sample` — static example of the verdict shape",
      "- `GET /health` — liveness",
      "- `GET /openapi.json` — OpenAPI spec (AgentCash / x402scan)",
      "- `GET /.well-known/x402` — x402 manifest",
      "- `GET /.well-known/agent.json` — A2A agent card",
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

const sanctionsDatasetBazaar = declareDiscoveryExtension({
  method: "GET",
  input: { query: "sanctions" },
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Filter by address, name, type, or asset" },
      type: { type: "string", enum: ["sanctions", "issuer_blacklist", "mixer"] },
    },
  },
  output: {
    example: { name: "Crypto Sanctions & Risk List", records: [{ type: "sanctions", asset: "ETH", address: "0x…" }] },
    schema: { type: "object" },
  },
});

const datasetBazaar = (name, example) =>
  declareDiscoveryExtension({
    method: "GET",
    input: { query: "example" },
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Filter records" } },
    },
    output: { example, schema: { type: "object" } },
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
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
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
  "GET /v1/dataset/sanctions": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "Crypto sanctions & risk dataset: 527 OFAC SDN addresses, 91 Circle blacklisted, 5 mixers. ?query= to filter, ?type= to filter by type.",
    mimeType: "application/json",
    extensions: sanctionsDatasetBazaar,
  },
  "GET /v1/dataset/memecoin-shadow-book": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "2,969 memecoin picks with outcomes (survivorship-bias-free). ?query= to filter by symbol/venue/dex.",
    mimeType: "application/json",
    extensions: datasetBazaar("Memecoin Shadow Book", { records: [{ symbol: "EXAMPLE", decision: "taken", outcome_multiple: 1.5 }] }),
  },
  "GET /v1/dataset/memecoin-signals": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "Historical memecoin trading signals with entry/exit prices and P&L. Paper trading only.",
    mimeType: "application/json",
    extensions: datasetBazaar("Memecoin Signals", { records: [{ symbol: "EXAMPLE", pnl_pct: 50.0 }] }),
  },
  "GET /v1/dataset/memecoin-filter-attribution": {
    accepts: [{ scheme: "exact", price: "$0.01", network: NETWORK, payTo: PAY_TO }],
    description: "Filter attribution analysis: which filters correlate with winning trades (venue, liquidity, post-age).",
    mimeType: "application/json",
    extensions: datasetBazaar("Filter Attribution", { aggregates: { by_venue: {} } }),
  },
  "GET /v1/dataset/token-contracts": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "Top 500 tokens by market cap with contract addresses. ?query= to filter by symbol/name.",
    mimeType: "application/json",
    extensions: datasetBazaar("Token Contract Registry", { records: [{ symbol: "BTC", name: "Bitcoin" }] }),
  },
  "GET /v1/dataset/x402-services": {
    accepts: [{ scheme: "exact", price: "$0.05", network: NETWORK, payTo: PAY_TO }],
    description: "All 4,000 x402-paid services on Agentic.Market with pricing and endpoints. ?query= to filter.",
    mimeType: "application/json",
    extensions: datasetBazaar("x402 Service Registry", { records: [{ name: "example", price: "$0.01" }] }),
  },
  "GET /v1/dataset/token-price-history": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "30-day price history for top tokens (hourly). ?query= to filter by token.",
    mimeType: "application/json",
    extensions: datasetBazaar("Token Price History", { records: [{ token: "bitcoin", prices: [{ t: 0, price_usd: 0 }] }] }),
  },
  "GET /v1/dataset/solana-trending-pools": {
    accepts: [{ scheme: "exact", price: "$0.02", network: NETWORK, payTo: PAY_TO }],
    description: "100 trending Solana DEX pools with liquidity and volume. ?query= to filter by token.",
    mimeType: "application/json",
    extensions: datasetBazaar("Solana Trending Pools", { records: [{ name: "EXAMPLE/SOL", liquidity_usd: "1000" }] }),
  },
  "GET /v1/dataset/stablecoins": {
    accepts: [{ scheme: "exact", price: "$0.01", network: NETWORK, payTo: PAY_TO }],
    description: "Major stablecoins with verified contract addresses across chains. ?query= to filter.",
    mimeType: "application/json",
    extensions: datasetBazaar("Stablecoin Registry", { records: [{ symbol: "USDC", issuer: "Circle" }] }),
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

// Sanctions & risk dataset — 623 records (OFAC SDN + Circle blacklist + mixers)
app.get("/v1/dataset/sanctions", async (req, res) => {
  try {
    const { query, type } = req.query;
    if (query) {
      return res.json(getSanctionsDataset(query));
    }
    if (type) {
      const ds = getSanctionsDataset();
      const filtered = ds.records.filter((r) => r.type === type);
      return res.json({ ...ds, type_filter: type, match_count: filtered.length, records: filtered });
    }
    res.json(getSanctionsDataset());
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Memecoin shadow book — 2,969 picks with outcomes
app.get("/v1/dataset/memecoin-shadow-book", async (req, res) => {
  try {
    res.json(getMemecoinShadowBook(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Memecoin signals — historical trading signals with P&L
app.get("/v1/dataset/memecoin-signals", async (req, res) => {
  try {
    res.json(getMemecoinSignals(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Memecoin filter attribution — which filters correlate with wins
app.get("/v1/dataset/memecoin-filter-attribution", async (req, res) => {
  try {
    res.json(getMemecoinFilterAttribution(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Token contract registry — top 100 tokens by market cap
app.get("/v1/dataset/token-contracts", async (req, res) => {
  try {
    res.json(getTokenContractRegistry(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// List all datasets (free, ungated)
app.get("/v1/datasets", (_req, res) => {
  res.json(listDatasets());
});

// x402 service registry — all x402-paid services on Agentic.Market
app.get("/v1/dataset/x402-services", async (req, res) => {
  try {
    res.json(getX402ServiceRegistry(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Token price history — 30-day hourly data for top tokens
app.get("/v1/dataset/token-price-history", async (req, res) => {
  try {
    res.json(getTokenPriceHistory(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Solana trending pools — DEX pools with liquidity and volume
app.get("/v1/dataset/solana-trending-pools", async (req, res) => {
  try {
    res.json(getSolanaTrendingPools(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Stablecoin registry — major stablecoins with contract addresses
app.get("/v1/dataset/stablecoins", async (req, res) => {
  try {
    res.json(getStablecoinRegistry(req.query.query));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ── Usage tracking ───────────────────────────────────────────────────────
// In-memory stats: counts paid calls per endpoint. Resets on redeploy.
const stats = {
  endpoints: new Map(), // path -> { price, calls, revenue_usd, last_call }
  recent: [],           // last 20 paid calls
  total_calls: 0,
  total_revenue_usd: 0,
};

function priceToUsd(price) {
  const m = String(price).match(/\$([0-9.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

// Track paid calls: runs after payment middleware, before route handlers.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only track successful (200) responses on paid endpoints
    if (res.statusCode === 200 && req.route && req.path.startsWith("/v1/") && req.path !== "/v1/stats") {
      const path = req.route.path;
      const priceMap = {
        "/v1/check-counterparty": "$0.02",
        "/v1/token-price": "$0.02",
        "/v1/wallet-score": "$0.03",
        "/v1/dataset/sanctions": "$0.02",
        "/v1/dataset/memecoin-shadow-book": "$0.02",
        "/v1/dataset/memecoin-signals": "$0.02",
        "/v1/dataset/memecoin-filter-attribution": "$0.01",
        "/v1/dataset/token-contracts": "$0.02",
        "/v1/dataset/x402-services": "$0.05",
        "/v1/dataset/token-price-history": "$0.02",
        "/v1/dataset/solana-trending-pools": "$0.02",
        "/v1/dataset/stablecoins": "$0.01",
      };
      const price = priceMap[path] || "$0.01";
      const usd = priceToUsd(price);

      const ep = stats.endpoints.get(path) || { price, calls: 0, revenue_usd: 0, last_call: null };
      ep.calls += 1;
      ep.revenue_usd += usd;
      ep.last_call = new Date().toISOString();
      stats.endpoints.set(path, ep);

      stats.total_calls += 1;
      stats.total_revenue_usd += usd;

      stats.recent.unshift({
        time: new Date().toISOString(),
        path,
        status: "200",
        payer: req.body?.payer || req.query?.payer || "agent",
      });
      if (stats.recent.length > 20) stats.recent.pop();
    }
    return originalJson(body);
  };
  next();
});

app.get("/v1/stats", (_req, res) => {
  const endpoints = Array.from(stats.endpoints.entries()).map(([path, e]) => ({
    path, ...e,
  }));
  res.json({
    total_calls: stats.total_calls,
    total_revenue_usd: stats.total_revenue_usd,
    endpoint_count: endpoints.length,
    last_call: stats.recent[0]?.time || null,
    endpoints,
    recent_calls: stats.recent,
  });
});

// Dashboard — HTML page showing usage stats
app.get("/dashboard", (_req, res) => {
  res.type("text/html").sendFile(path.join(__dirname, "public", "dashboard.html"));
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
