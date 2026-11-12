# HN: Show HN — USDC Gate: paid data APIs for AI agents

**Title:** Show HN: USDC Gate — paid data APIs for AI agents (x402)

**URL:** https://usdc-gate-live.vercel.app/catalog

**Body:**

I built a paid data marketplace where AI agents pay per call in USDC via x402. No account, no API key, no subscription.

Selling:
- Sanctions & risk dataset (623 records, $0.02)
- Memecoin shadow book (2,969 picks, $0.02)
- Token contract registry (500 tokens, $0.02)
- x402 service registry (4,000 services, $0.05)
- Plus 8 more datasets and 3 APIs

Total: 12 paid endpoints, 7,248 records.

The stack is Express + @x402/express middleware + JSON datasets. Agents request an endpoint, get a 402, pay in USDC, get data.

The interesting part: I didn't build new data pipelines. I packaged data I already had (sanctions lists from OFAC, trading signals from a paper trading system, token metadata from CoinGecko).

Why: AI agents need reliable data, but almost nobody sells it in a way agents can buy programmatically. Most data is either free (no quality incentive), behind enterprise contracts (agents can't sign), or on centralized APIs (require API keys).

The honest economics: agent-payment volume is thin (~$5-11K/month across the entire ecosystem). This isn't a primary income stream — it's an acquisition funnel and a data source. The real revenue is selling the same backend to human compliance teams.

Open source: https://github.com/usdcmaxxing/usdc-gate

Would love feedback on the pricing model and the discovery strategy.