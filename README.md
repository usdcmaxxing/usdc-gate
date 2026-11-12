# USDC Gate

**Paid data and risk APIs for AI agents. Pay per call in USDC via x402.**

A marketplace where AI agents (or any client) pay per call for sanctions screening,
memecoin signals, token data, and more — no account, no API key, no subscription.

**Live:** https://usdc-gate-live.vercel.app · **Catalog:** `/catalog` · **Dashboard:** `/dashboard`

---

## What's for sale

### Risk & compliance
| Endpoint | Price | Records | Description |
|---|---|---|---|
| `POST /v1/check-counterparty` | $0.02 | — | Counterparty risk: Circle blacklist + OFAC + flow checks |
| `POST /v1/wallet-score` | $0.03 | — | Wallet risk score 0-100 |
| `GET /v1/dataset/sanctions` | $0.02 | 623 | OFAC SDN + Circle blacklist + mixers |

### Market data
| Endpoint | Price | Records | Description |
|---|---|---|---|
| `GET /v1/token-price` | $0.02 | — | Real-time token prices (CoinGecko) |
| `GET /v1/dataset/token-contracts` | $0.02 | 500 | Top 500 tokens with contract addresses |
| `GET /v1/dataset/token-price-history` | $0.02 | 6 | 30-day hourly price history |
| `GET /v1/dataset/solana-trending-pools` | $0.02 | 100 | Trending Solana DEX pools |
| `GET /v1/dataset/stablecoins` | $0.01 | 8 | Stablecoin contract addresses |

### Trading signals
| Endpoint | Price | Records | Description |
|---|---|---|---|
| `GET /v1/dataset/memecoin-shadow-book` | $0.02 | 2,969 | Survivorship-bias-free picks |
| `GET /v1/dataset/memecoin-signals` | $0.02 | 24 | Historical signals with P&L |
| `GET /v1/dataset/memecoin-filter-attribution` | $0.01 | 24 | Filter attribution analysis |

### Infrastructure
| Endpoint | Price | Records | Description |
|---|---|---|---|
| `GET /v1/dataset/x402-services` | $0.05 | 4,000 | All x402 services on Agentic.Market |

**Total: 12 paid endpoints, 7,248 records, $0.01–0.05 per call.**

See [DATASETS.md](DATASETS.md) for the full catalog.

---

## Quick start

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
let client = new x402Client();
client = registerExactEvmScheme(client, { signer: account, networks: ["eip155:84532"] });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Pay $0.02 and get the sanctions dataset
const res = await fetchWithPayment(
  "https://usdc-gate-live.vercel.app/v1/dataset/sanctions"
);
const data = await res.json();
```

First request returns `402 Payment Required`. Pay the challenge in USDC, retry, get data.

---

## The counterparty check (flagship product)

The wedge: **Circle's `isBlacklisted(address)` is live on-chain state, readable at any
block height.** OFAC is a dated, downloadable snapshot — a floor, not a live signal. An
address frozen mid-relationship is invisible to a list check and obvious to an on-chain read.

The x402 facilitator screens payments at **both verification and settlement**. A decline
returns `kyt_risk_detected` with a **403**, and it is **not retryable**. This check runs
before that happens.

### The flow layer (real chain history)

`flow.js` pulls **USDC Transfer logs** for both addresses and derives:

| Check | What it catches | Verdict |
|---|---|---|
| `shared_funder` | A third party that funded both sides | HOLD |
| `mixer_exposure` | Counterparty on OFAC SDN or a known mixer | HOLD |
| `peel_chain` | ≥3 outgoing transfers of strictly decreasing size | HOLD |
| `new_payee` | No USDC history in the window | HOLD |

If history is unavailable the checks report `unknown` and never fail a verdict on
their own. Every verdict carries raw evidence under `flow.evidence`.

---

## Files

| File | Purpose |
|---|---|
| `server.js` | Express + x402 middleware; all paid endpoints |
| `mcp-server.js` | stdio MCP server — the free, rate-limited funnel |
| `check.js` | Verdict logic (no x402 coupling) |
| `flow.js` | Real chain-history flow checks |
| `usdc.js` | On-chain reads of `isBlacklisted`, token identity |
| `prices.js` | CoinGecko price fetching |
| `walletscore.js` | Wallet risk scoring |
| `dataset.js` | Dataset loaders and catalog |
| `openapi.js` | OpenAPI 3.1 + x-payment-info document |
| `public/catalog.html` | Human-readable data catalog |
| `public/dashboard.html` | Usage dashboard |
| `scripts/refresh-datasets.mjs` | Daily dataset refresh (launchd) |
| `client.mjs` | x402 buyer — reads the 402, signs, retries |
| `demo.sh` | One-command end-to-end demo |
| `data/` | Datasets (OFAC, Circle blacklist, mixers, etc.) |
| `tests/` | Unit tests — no network |
| `.env.example` | Configuration template |
| `.buyer` / `.seller` | Throwaway Base Sepolia keys (gitignored) |

---

## Run it

```bash
npm install
cp .env.example .env      # optional: set RPC / flow window / seller key
node server.js            # listens on :4021
npm test                  # unit tests, no network
```

Or everything at once:

```bash
./demo.sh
```

---

## MCP access

The same check is available as a stdio **MCP server**:

```bash
node mcp-server.js
```

Tools: `check_counterparty`, `service_info`.

Wire it into a client:

```json
{
  "mcpServers": {
    "usdc-gate": { "command": "node", "args": ["/absolute/path/to/usdc-gate/mcp-server.js"] }
  }
}
```

This is the **acquisition funnel**, not the product: free but rate-limited
(`MCP_RATE_LIMIT`, default 30 calls/hour).

---

## Discovery surfaces

| Route | What it is | Who reads it |
|---|---|---|
| `GET /.well-known/x402` | Manifest: endpoints, price, network, asset, payTo | agent402.tools, CDP Bazaar |
| `GET /openapi.json` | OpenAPI 3.1 + x-payment-info | AgentCash / x402scan |
| `GET /.well-known/agent.json` | A2A agent card | A2A / Google AP2 |
| `GET /llms.txt` | Plain-text service description | LLM crawlers |
| `GET /skill.md` | Agent402-style skill file | Agent402 |
| `GET /catalog` | Human-readable catalog | Humans |
| `GET /dashboard` | Usage stats | Humans |
| `GET /v1/stats` | JSON usage stats | Anyone |

---

## Deployment

**Base Sepolia (testnet)** — current deployment at https://usdc-gate-live.vercel.app

**Base mainnet** — switch `X402_NETWORK` to `eip155:8453`, use a production
facilitator, and fund the wallet with real USDC on Base.

```bash
X402_NETWORK=eip155:8453 \
SELLER_PRIVATE_KEY=0x… \
PUBLIC_ORIGIN=https://usdc-gate.example.com \
node server.js
```

Free hosting: Render, Railway, Fly, Vercel, Cloudflare Workers.

---

## Honest economics

This is a **volume product**, and agent-payment volume is currently thin. Independent
measurements put genuine agentic x402 commerce at roughly **$5,000–$11,000 per month across
the entire ecosystem**, with a median lifetime revenue of **$3.96** per recipient.

At $0.02/call, 50 calls/day is $1/day. So:

- **Do not** build this as a primary income stream on agent demand alone.
- **Do** sell it to human compliance / risk / agent-orchestration teams (USDC-paid, same backend).
- **Do** give the agent endpoint away as the acquisition funnel and the data source.

The datasets are packaged data we already had — the marginal cost of serving them is ~zero.

---

## License

MIT. The OFAC snapshot is US government public-domain data.

---

## Further reading

- [BLOG_POST.md](BLOG_POST.md) — the full story of building this
- [DATASETS.md](DATASETS.md) — the complete dataset catalog