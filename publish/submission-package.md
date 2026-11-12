# Directory Submission Package

*Ready-to-submit listing details for USDC Gate. Copy-paste ready.*

---

## Circle Agent Marketplace

**Form:** https://forms.gle/7YFzvdmMcn1JH5tF6

**Endpoint URL:** `https://usdc-gate-live.vercel.app/v1/check-counterparty`

**Payout wallet:** `0x9A04446dc4F72F61097093FeF4175211B384276f`

**Short description:**
> USDC Gate is a pre-flight counterparty risk API for USDC payments. It checks Circle's live on-chain issuer blacklist, OFAC SDN, and on-chain flow patterns (shared funders, mixer exposure, peel chains) to return APPROVE / HOLD / REJECT before a payment settles. Also sells 9 datasets (sanctions lists, memecoin signals, token metadata, x402 directory) via x402.

**Category:** Compliance / Risk

**Networks:** Base Sepolia (eip155:84532) — migrating to Base mainnet

**OpenAPI:** https://usdc-gate-live.vercel.app/openapi.json

**Notes for reviewer:**
- All 12 paid endpoints return 402 when unpaid
- OpenAPI 3.1 spec with x-payment-info extensions published
- Service is live and health-checked (all 8 endpoints pass)
- Payout wallet is a fresh EOA, no sanctions exposure

---

## AgenticTrade

**Sign up:** https://agentictrade.io/providers

**Service name:** USDC Gate

**Description:**
> Paid data and risk APIs for AI agents. 12 paid endpoints covering sanctions screening, memecoin trading signals, token metadata, and x402 service directories. Pay per call in USDC via x402 — no API keys, no accounts.

**Price:** $0.01–0.05 per call

**Category:** Data & Analytics

**API docs:** https://usdc-gate-live.vercel.app/openapi.json

**Endpoint:** https://usdc-gate-live.vercel.app/v1/check-counterparty

---

## x402scan

**Register:** https://x402scan.com/resources/register

**Origin:** https://usdc-gate-live.vercel.app

**Note:** Requires favicon.ico at root and info.contact.email in openapi.json (both already present).

---

## Glama

**Add server:** https://glama.ai/mcp/servers

**Command:** `node /Users/asa/usdc-gate/mcp-server.js`

**Transport:** stdio

---

## Smithery

**Config:** `smithery.yaml` already committed in repo.

---

## Loomal

**URL:** https://loomal.com

**Listing:** Submit https://usdc-gate-live.vercel.app

---

## ERC-8004 (after mainnet)

**Register:** https://8004scan.io or https://8004agents.ai

**Agent card:** JSON with name, description, endpoints, supported trust models

**Chain:** Ethereum mainnet (singleton contracts)