import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import fs from "node:fs";

const ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ABI = [
  {
    constant: true,
    inputs: [{ name: "_account", type: "address" }],
    name: "isBlacklisted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];

const RPCS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
];

const client = createPublicClient({ chain: mainnet, transport: http(RPCS[0]) });

const snapshot = JSON.parse(fs.readFileSync("data/ofac-sdn-digital.json", "utf8"));
const eth = snapshot.records.filter((r) => r.asset === "ETH");

let hits = [];
let errors = 0;
for (const r of eth) {
  try {
    const blacklisted = await client.readContract({
      address: ETH_USDC,
      abi: ABI,
      functionName: "isBlacklisted",
      args: [r.address],
    });
    if (blacklisted) hits.push(r);
  } catch (e) {
    errors++;
    if (errors === 1) console.log("first error:", String(e?.shortMessage || e?.message || e));
  }
}

console.log("checked", eth.length, "ETH addresses | errors:", errors);
console.log("CIRCLE-BLACKLISTED (isBlacklisted=true):", hits.length);
console.log(JSON.stringify(hits, null, 2));
fs.writeFileSync("data/circle-blacklisted-ofac.json", JSON.stringify({ checked: eth.length, hits }, null, 2));
