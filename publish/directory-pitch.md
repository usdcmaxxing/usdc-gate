# Directory Pitch — USDC Gate

*Ready-to-submit listing text for x402 directories and agent marketplaces.*

---

## One-liner

**USDC Gate** — Paid data and risk APIs for AI agents. 12 paid endpoints, 7,248 records, $0.01–0.05 per call in USDC via x402.

---

## Short description (for directories)

USDC Gate is a paid data marketplace for AI agents. Agents pay per call in USDC via x402 to access sanctions screening, memecoin trading signals, token metadata, and x402 service directories. No account, no API key, no subscription.

**Origin:** https://usdc-gate-live.vercel.app
**Categories:** Compliance, Risk, Data, Trading Signals, Market Data
**Networks:** Base Sepolia (eip155:84532), Base mainnet (eip155:8453)
**Asset:** USDC

---

## What's for sale

| Endpoint | Price | Records | Description |
|---|---|---|---|
| `POST /v1/check-counterparty` | $0.02 | — | Counterparty risk check |
| `POST /v1/wallet-score` | $0.03 | — | Wallet risk score |
| `GET /v1/token-price` | $0.02 | — | Real-time prices |
| `GET /v1/dataset/sanctions` | $0.02 | 623 | OFAC + Circle blacklist |
| `GET /v1/dataset/memecoin-shadow-book` | $0.02 | 2,969 | Survivorship-bias-free picks |
| `GET /v1/dataset/memecoin-signals` | $0.02 | 24 | Trading signals |
| `GET /v1/dataset/memecoin-filter-attribution` | $0.01 | 24 | Filter analysis |
| `GET /v1/dataset/token-contracts` | $0.02 | 500 | Token addresses |
| `GET /v1/dataset/x402-services` | $0.05 | 4,000 | x402 service directory |
| `GET /v1/dataset/token-price-history` | $0.02 | 6 | 30-day price history |
| `GET /v1/dataset/solana-trending-pools` | $0.02 | 100 | Solana DEX pools |
| `GET /v1/dataset/stablecoins` | $0.01 | 8 | Stablecoin addresses |

---

## Discovery surfaces

- `/.well-known/x402` — x402 manifest
- `/openapi.json` — OpenAPI 3.1 + x-payment-info
- `/.well-known/agent.json` — A2A agent card
- `/llms.txt` — LLM-readable index
- `/skill.md` — Agent402 skill file
- `/catalog` — human-readable catalog
- `/dashboard` — usage dashboard

---

## Why list USDC Gate

1. **Real payments.** All endpoints have settled payments (no "new seller" invisibility).
2. **Agent-friendly.** x402 native — agents pay programmatically, no API keys.
3. **Unique data.** Sanctions + memecoin + x402 directories in one place.
4. **Open source.** MIT licensed, self-hostable.
5. **Active.** Daily dataset refresh, monitoring, and regular updates.

---

## Submission checklist

- [ ] Agentic.Market — auto-indexed after settled payments
- [ ] x402scan — https://x402scan.com/resources/register
- [ ] CDP Bazaar — auto-indexed after settlement
- [ ] Agent402 — POST https://agent402.tools/api/index/register
- [ ] Glama — https://glama.ai/mcp/servers
- [ ] Smithery — smithery.yaml committed
- [ ] Loomal — https://loomal.com

---

## Contact

- **GitHub:** https://github.com/usdcmaxxing/usdc-gate
- **Live:** https://usdc-gate-live.vercel.app
- **Catalog:** https://usdc-gate-live.vercel.app/catalog