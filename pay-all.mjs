// Pay for any USDC Gate endpoint (triggers Agentic.Market indexing)
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";

const BUYER_KEY = process.env.BUYER_PRIVATE_KEY || fs.readFileSync(".buyer", "utf8").split("\n")[0].trim();
const account = privateKeyToAccount(BUYER_KEY);
const PAYEE = fs.readFileSync(".seller", "utf8").split("\n")[1].trim();

const BASE = process.env.GATE_URL || "https://usdc-gate-live.vercel.app";

const calls = [
  { name: "check-counterparty", url: `${BASE}/v1/check-counterparty`, method: "POST",
    body: { payer: account.address, payee: PAYEE, amount: "0.02" } },
  { name: "token-price", url: `${BASE}/v1/token-price?symbol=ETH`, method: "GET" },
  { name: "wallet-score", url: `${BASE}/v1/wallet-score`, method: "POST",
    body: { address: account.address, chain: "base-sepolia" } },
  { name: "dataset-sanctions", url: `${BASE}/v1/dataset/sanctions`, method: "GET" },
  { name: "dataset-memecoin-shadow-book", url: `${BASE}/v1/dataset/memecoin-shadow-book`, method: "GET" },
  { name: "dataset-memecoin-signals", url: `${BASE}/v1/dataset/memecoin-signals`, method: "GET" },
  { name: "dataset-memecoin-filter-attribution", url: `${BASE}/v1/dataset/memecoin-filter-attribution`, method: "GET" },
  { name: "dataset-token-contracts", url: `${BASE}/v1/dataset/token-contracts`, method: "GET" },
  { name: "dataset-x402-services", url: `${BASE}/v1/dataset/x402-services`, method: "GET" },
  { name: "dataset-token-price-history", url: `${BASE}/v1/dataset/token-price-history`, method: "GET" },
  { name: "dataset-solana-trending-pools", url: `${BASE}/v1/dataset/solana-trending-pools`, method: "GET" },
  { name: "dataset-stablecoins", url: `${BASE}/v1/dataset/stablecoins`, method: "GET" },
];

let client = new x402Client();
client = registerExactEvmScheme(client, { signer: account, networks: ["eip155:84532"] });
client.setSpendControls({ maxAmount: 200000 }); // $2.00 cap

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

for (const call of calls) {
  console.log(`\n=== ${call.name} ===`);
  try {
    const opts = { method: call.method, headers: { "content-type": "application/json" } };
    if (call.body) opts.body = JSON.stringify(call.body);
    const res = await fetchWithPayment(call.url, opts);
    console.log("status:", res.status, res.statusText);
    const text = await res.text();
    console.log(text.slice(0, 300));
  } catch (e) {
    console.error("error:", String(e?.message || e));
  }
}
