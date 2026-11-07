// x402 buyer: pays the USDC Gate endpoint in USDC on Base Sepolia.
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";

const BUYER_KEY = process.env.BUYER_PRIVATE_KEY || fs.readFileSync(".buyer", "utf8").split("\n")[0].trim();
const account = privateKeyToAccount(BUYER_KEY);

const URL = process.env.GATE_URL || "http://localhost:4021/v1/check-counterparty";
const PAYEE = process.env.PAYEE ||
  (fs.existsSync(".seller") ? fs.readFileSync(".seller", "utf8").split("\n")[1].trim() : "0x0000000000000000000000000000000000000000");

const body = {
  payer: account.address,
  payee: PAYEE,
  amount: "0.02",
};

console.log("buyer wallet:", account.address);
console.log("chain: base-sepolia (84532)");
console.log("request:", JSON.stringify(body));

let client = new x402Client();
client = registerExactEvmScheme(client, {
  signer: account,
  networks: ["eip155:84532"],
});
client.setSpendControls({ maxAmount: 20000 }); // hard cap: 0.02 USDC (atomic)

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

try {
  const res = await fetchWithPayment(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("\n--- response ---");
  console.log("status:", res.status, res.statusText);
  const paymentResponse = res.headers.get("x-payment-response");
  if (paymentResponse) console.log("x-payment-response:", paymentResponse);
  const text = await res.text();
  console.log(text);
} catch (e) {
  console.error("client error:", String(e?.message || e));
}
