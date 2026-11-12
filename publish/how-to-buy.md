# How to Buy Data from USDC Gate

*A guide for humans who want to access our datasets and APIs.*

---

## What is USDC Gate?

USDC Gate is a paid data marketplace for AI agents. We sell sanctions lists, memecoin
trading signals, token metadata, and more. Agents pay per call in USDC via the x402
protocol — no account, no API key, no subscription.

**Live service:** https://usdc-gate-live.vercel.app
**Catalog:** https://usdc-gate-live.vercel.app/catalog
**Dashboard:** https://usdc-gate-live.vercel.app/dashboard

---

## Option 1: Use the MCP server (free, rate-limited)

The fastest way to try it. The MCP server is free but limited to 30 calls/hour.

```bash
npm install -g @modelcontextprotocol/sdk
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "usdc-gate": {
      "command": "node",
      "args": ["/absolute/path/to/usdc-gate/mcp-server.js"]
    }
  }
}
```

Tools: `check_counterparty`, `service_info`.

---

## Option 2: Pay per call with x402 (agents)

If you're building an AI agent, use the x402 client:

```bash
npm install @x402/fetch
```

```js
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
let client = new x402Client();
client = registerExactEvmScheme(client, { signer: account, networks: ["eip155:84532"] });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Pay $0.02 and get the sanctions dataset
const res = await fetchWithPayment(
  "https://usdc-gate-live.vercel.app/v1/dataset/sanctions"
);
const data = await res.json();
console.log(data);
```

---

## Option 3: Pay manually with curl

You can also pay manually using the x402 flow:

```bash
# 1. Request the endpoint (get 402)
curl -i https://usdc-gate-live.vercel.app/v1/dataset/sanctions

# 2. Read the PAYMENT-REQUIRED header for the challenge
# 3. Sign the payment authorization (EIP-3009 TransferWithAuthorization)
# 4. Retry with the PAYMENT-SIGNATURE header
```

This is complex — use the x402 client library instead.

---

## What you need

| Requirement | Details |
|---|---|
| **Wallet** | Any EVM wallet (MetaMask, Coinbase Wallet, etc.) |
| **Network** | Base Sepolia (testnet) or Base mainnet |
| **USDC** | Testnet: free from https://faucet.circle.com · Mainnet: buy on an exchange |
| **Gas** | None needed — the facilitator pays gas (EIP-3009) |

---

## Pricing

| Endpoint | Price |
|---|---|
| Sanctions & Risk List | $0.02 |
| Memecoin Shadow Book | $0.02 |
| Memecoin Signals | $0.02 |
| Token Contract Registry | $0.02 |
| x402 Service Registry | $0.05 |
| Token Price History | $0.02 |
| Solana Trending Pools | $0.02 |
| Stablecoin Registry | $0.01 |
| Memecoin Filter Attribution | $0.01 |
| Counterparty Risk Check | $0.02 |
| Token Price | $0.02 |
| Wallet Risk Score | $0.03 |

---

## FAQ

**Do I need an account?** No. Just a wallet with USDC.

**Do I need an API key?** No. The payment is the authentication.

**What if the payment fails?** The facilitator returns a clear error. Common causes:
- Insufficient USDC balance
- Address flagged by KYT (403, non-retryable)
- Amount mismatch (exact scheme is strict equality)

**Can I get a refund?** Payments are settled on-chain. Refunds are manual — contact us.

**Is there a subscription?** No. Pay per call.

**Can I resell the data?** The data is licensed per-call. Contact us for resale terms.

---

## Contact

- **GitHub:** https://github.com/usdcmaxxing/usdc-gate
- **Issues:** https://github.com/usdcmaxxing/usdc-gate/issues