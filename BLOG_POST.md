# How We Built a Paid Data Marketplace for AI Agents

*A developer's guide to selling datasets to autonomous agents over x402 — and why the agent economy needs paid data.*

---

## The problem: agents need data, but nobody's selling it to them

AI agents are transacting on-chain at massive scale. x402 processed **196 million transactions** in 2026, settling **$42 million** in USDC. 97% of onchain agent transactions now use x402.

But there's a gap: agents need **reliable data** — sanctions lists, risk scores, price history, trading signals — and almost nobody is selling it to them in a way they can buy programmatically.

Most data is either:
- **Free** (no incentive to maintain quality)
- **Behind enterprise contracts** (agents can't sign contracts)
- **On centralized APIs** (require API keys, accounts, human approval)

None of these work for an autonomous agent that needs to make a decision *right now* and pay *automatically*.

## The solution: x402 + datasets

We built **USDC Gate** — a paid data marketplace where agents pay per call in USDC via the x402 protocol. No account, no API key, no subscription. The agent requests data, gets a `402 Payment Required` challenge, pays in USDC, and receives the data.

Here's what we're selling:

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

Plus three APIs: counterparty risk check ($0.02), token price ($0.02), and wallet risk score ($0.03).

**Total: 12 paid endpoints, 7,248 records, $0.01–0.05 per call.**

## How it works technically

The stack is simple:

```
Express server → x402 payment middleware → route handlers → datasets
```

The key piece is the `@x402/express` middleware. You register routes with a price, and it handles the 402 challenge/verify/settle flow automatically:

```js
const routes = {
  "GET /v1/dataset/sanctions": {
    accepts: [{ scheme: "exact", price: "$0.02", network: "eip155:84532", payTo: PAY_TO }],
    description: "Sanctions & risk dataset",
    mimeType: "application/json",
    extensions: sanctionsBazaar,
  },
};

app.use(paymentMiddleware(routes, resourceServer));
```

When an agent requests the endpoint:
1. The middleware returns `402 Payment Required` with the price
2. The agent signs a USDC payment authorization
3. The facilitator verifies and settles on Base
4. The route handler returns the data

The agent never needs an account or API key. It just pays and gets data.

## Why datasets, not just APIs

Datasets are the perfect product for agents because:

1. **Static = cheap to serve**. No real-time API calls, no external dependencies. Just JSON files on disk.
2. **Composable**. Agents can combine multiple datasets to build richer analysis.
3. **Verifiable**. The data is fixed at a version, so agents can reference it in their reasoning.
4. **No cold-start problem**. We already had the data (from building other products); we just packaged it.

The memecoin shadow book is a great example: we built a paper trading system that recorded 2,969 picks with outcomes (taken and skipped). That data was just sitting in a SQLite database. Now it's a dataset agents pay $0.02 to download.

## The discovery problem

The hardest part isn't the payments — it's **discovery**. Agents need to find your service before they can pay.

There are three layers:

1. **Protocol-level discovery**: `/.well-known/x402` manifest, OpenAPI document, A2A agent card. These let any agent discover your service programmatically.
2. **Directory listing**: Agentic.Market (Coinbase's x402 catalog) auto-indexes services after the first settled payment. 4.4M payments/month, 29K buyers.
3. **Human discovery**: A catalog page, blog posts, documentation. This is what drives initial adoption.

We built all three:
- `/.well-known/x402` + `/openapi.json` + `/.well-known/agent.json` + `/llms.txt`
- Settled payments on every endpoint (triggers Agentic.Market indexing)
- A human-readable catalog at `/catalog` and a dashboard at `/dashboard`

## What we learned

**1. The agent economy is real but early.** 196M transactions sounds huge, but most are agents paying for other agents' APIs, not buying data. The data market is still nascent.

**2. Price at $0.01–0.05.** The market rate for a paid API call is ~$0.008–0.02. Pricing too high kills adoption; pricing too low leaves money on the table. We settled on $0.01 for small datasets, $0.02 for large ones, and $0.05 for the comprehensive x402 directory.

**3. Testnet vs mainnet matters.** We launched on Base Sepolia (testnet) to prove the concept. But production agents use Base mainnet. To capture real demand, you need to be on mainnet with real USDC.

**4. Packaging existing data is the fastest path.** We didn't build new data pipelines — we packaged data we already had (sanctions lists, trading signals, token metadata). If you have data, you can sell it today.

**5. Discovery is harder than payments.** The x402 payment flow is solved. Getting agents to find your service is the real challenge. That's why we built a catalog page, wrote documentation, and listed on every directory.

## Try it

The service is live at **https://usdc-gate-live.vercel.app** (Base Sepolia testnet).

Quick start:
```bash
npm install @x402/fetch
```

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

Or browse the human-readable catalog: **https://usdc-gate-live.vercel.app/catalog**

## What's next

We're expanding the dataset catalog, moving to Base mainnet for real payments, and building more risk APIs. The goal is to become the default data layer for agents that need to verify counterparties, assess risk, and analyze markets.

If you have data that agents need, package it and sell it. The agent economy is waiting.

---

*USDC Gate is open source at [github.com/usdcmaxxing/usdc-gate](https://github.com/usdcmaxxing/usdc-gate).*