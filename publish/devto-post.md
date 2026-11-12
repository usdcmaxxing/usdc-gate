---
title: "I built a paid data marketplace for AI agents — here's what I learned"
description: "Selling datasets to autonomous agents over x402. 12 paid endpoints, 7,248 records, $0.01–0.05 per call. No account, no API key, no subscription."
published: false
tags: [ai, agents, crypto, x402, data]
cover_image: https://usdc-gate-live.vercel.app/health
---

AI agents are transacting on-chain at massive scale. x402 processed **196 million transactions** in 2026, settling **$42 million** in USDC. 97% of onchain agent transactions now use x402.

But there's a gap: agents need **reliable data** — sanctions lists, risk scores, price history, trading signals — and almost nobody is selling it to them in a way they can buy programmatically.

So I built a paid data marketplace where agents pay per call in USDC.

## What I'm selling

| Dataset | Records | Price |
|---|---|---|
| Sanctions & Risk List | 623 | $0.02 |
| Memecoin Shadow Book | 2,969 | $0.02 |
| Memecoin Signals | 24 | $0.02 |
| Token Contract Registry | 500 | $0.02 |
| x402 Service Registry | 4,000 | $0.05 |
| Token Price History | 6 tokens × 721 points | $0.02 |
| Solana Trending Pools | 100 | $0.02 |
| Stablecoin Registry | 8 | $0.01 |

Plus three APIs: counterparty risk check ($0.02), token price ($0.02), wallet risk score ($0.03).

**Total: 12 paid endpoints, 7,248 records, $0.01–0.05 per call.**

## How it works

The stack is simple: Express + x402 payment middleware + JSON datasets.

```js
const routes = {
  "GET /v1/dataset/sanctions": {
    accepts: [{ scheme: "exact", price: "$0.02", network: "eip155:84532", payTo: PAY_TO }],
    description: "Sanctions & risk dataset",
    mimeType: "application/json",
  },
};

app.use(paymentMiddleware(routes, resourceServer));
```

When an agent requests the endpoint:
1. Middleware returns `402 Payment Required` with the price
2. Agent signs a USDC payment authorization (EIP-3009)
3. Facilitator verifies and settles on Base
4. Route handler returns the data

The agent never needs an account or API key. It just pays and gets data.

## The agent buyer's view

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");
let client = new x402Client();
client = registerExactEvmScheme(client, { signer: account, networks: ["eip155:84532"] });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment(
  "https://usdc-gate-live.vercel.app/v1/dataset/sanctions"
);
const data = await res.json();
```

## Why datasets, not just APIs

Datasets are the perfect product for agents:

1. **Static = cheap to serve.** No real-time API calls, no external dependencies.
2. **Composable.** Agents combine multiple datasets to build richer analysis.
3. **Verifiable.** The data is fixed at a version, so agents can reference it.
4. **No cold-start problem.** I already had the data — I just packaged it.

The memecoin shadow book is a great example: I built a paper trading system that recorded 2,969 picks with outcomes (taken AND skipped). That data was sitting in a SQLite database. Now it's a dataset agents pay $0.02 to download.

## What I learned

**1. The agent economy is real but early.** 196M transactions sounds huge, but most are agents paying for other agents' APIs, not buying data. The data market is still nascent.

**2. Price at $0.01–0.05.** The market rate for a paid API call is ~$0.008–0.02. Pricing too high kills adoption; too low leaves money on the table.

**3. Testnet vs mainnet matters.** I launched on Base Sepolia to prove the concept. But production agents use Base mainnet. To capture real demand, you need mainnet.

**4. Packaging existing data is the fastest path.** I didn't build new data pipelines — I packaged data I already had. If you have data, you can sell it today.

**5. Discovery is harder than payments.** The x402 payment flow is solved. Getting agents to find your service is the real challenge.

## Honest economics

This is a volume product, and agent-payment volume is thin. Independent measurements put genuine agentic x402 commerce at roughly **$5,000–$11,000 per month across the entire ecosystem**, with a median lifetime revenue of **$3.96** per recipient.

At $0.02/call, 50 calls/day is $1/day.

So:
- **Don't** build this as a primary income stream on agent demand alone.
- **Do** sell it to human compliance / risk teams (USDC-paid, same backend).
- **Do** give the agent endpoint away as the acquisition funnel.

## Try it

Live at **https://usdc-gate-live.vercel.app** (Base Sepolia testnet).

Human catalog: https://usdc-gate-live.vercel.app/catalog
Dashboard: https://usdc-gate-live.vercel.app/dashboard

Open source: https://github.com/usdcmaxxing/usdc-gate

If you have data that agents need, package it and sell it. The agent economy is waiting.