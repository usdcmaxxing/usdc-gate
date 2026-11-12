# X / Twitter Thread

**Tweet 1 (hook):**

I built a paid data marketplace for AI agents.

12 paid endpoints. 7,248 records. $0.01–0.05 per call. Pay in USDC via x402.

No account. No API key. No subscription.

Here's what I learned 🧵

**Tweet 2:**

AI agents are transacting on-chain at massive scale.

x402 processed 196M transactions in 2026, settling $42M in USDC.

But agents need data — sanctions lists, risk scores, price history — and almost nobody sells it in a way they can buy programmatically.

**Tweet 3:**

Most data is either:
• Free (no quality incentive)
• Behind enterprise contracts (agents can't sign)
• On centralized APIs (require API keys)

None of these work for an autonomous agent that needs to decide *right now* and pay *automatically*.

**Tweet 4:**

So I built USDC Gate: Express + x402 middleware + JSON datasets.

Agents request an endpoint, get a 402, pay in USDC, get data.

The stack is ~100 lines of code.

**Tweet 5:**

What's for sale:
• Sanctions & risk dataset (623 records, $0.02)
• Memecoin shadow book (2,969 picks, $0.02)
• Token contract registry (500 tokens, $0.02)
• x402 service registry (4,000 services, $0.05)
• Plus 8 more datasets and 3 APIs

**Tweet 6:**

The interesting part: I didn't build new data pipelines.

I packaged data I already had:
• Sanctions lists from OFAC
• Trading signals from a paper trading system
• Token metadata from CoinGecko

If you have data, you can sell it today.

**Tweet 7:**

Honest economics:

Agent-payment volume is thin (~$5-11K/month across the entire ecosystem).

At $0.02/call, 50 calls/day = $1/day.

This isn't a primary income stream. It's an acquisition funnel.

The real revenue is selling the same backend to human compliance teams.

**Tweet 8:**

Try it: https://usdc-gate-live.vercel.app

Open source: https://github.com/usdcmaxxing/usdc-gate

If you have data that agents need, package it and sell it.

The agent economy is waiting.