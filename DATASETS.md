# Agent Data Catalog

USDC Gate sells paid data and risk APIs to AI agents over x402 (USDC on Base).
No account, no API key, no subscription — agents pay per call.

**Live service:** https://usdc-gate-live.vercel.app
**Human catalog:** https://usdc-gate-live.vercel.app/catalog
**Dashboard:** https://usdc-gate-live.vercel.app/dashboard
**Stats API:** https://usdc-gate-live.vercel.app/v1/stats

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
| `GET /v1/dataset/defi-protocols` | $0.01 | 10 | Major DeFi protocol addresses |

## How agents pay

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
let client = new x402Client();
client = registerExactEvmScheme(client, { signer: account, networks: ["eip155:84532"] });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment("https://usdc-gate-live.vercel.app/v1/dataset/sanctions");
const data = await res.json();
```

First request returns `402 Payment Required`. Pay the challenge in USDC, retry, get data.

## Discovery surfaces

| Surface | URL | Purpose |
|---|---|---|
| x402 manifest | `/.well-known/x402` | Payment requirements |
| OpenAPI | `/openapi.json` | AgentCash / x402scan discovery |
| A2A card | `/.well-known/agent.json` | Agent-to-agent discovery |
| LLM index | `/llms.txt` | LLM-readable index |
| Skill file | `/skill.md` | Agent402-style skill |
| Human catalog | `/catalog` | Human-readable catalog |
| Dashboard | `/dashboard` | Usage stats |
| MCP server | `mcp-server.js` | Stdio MCP tool |

## Adding a new dataset

1. Create `data/your-dataset.json` with `{ name, description, records: [...] }`
2. Add a loader in `dataset.js`
3. Add a route in `server.js` with a price
4. Add a handler in `server.js`
5. Deploy

See `BLOG_POST.md` for the full story.