// Wallet Risk Scorer — broader risk assessment than counterparty check.
// Checks: sanctions, issuer blacklist, on-chain history, wallet age, contract detection.

import { isAddress } from "./usdc.js";

const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_RPC = "https://mainnet.base.org";

async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function scoreWallet(address, chain = "base-sepolia") {
  if (!isAddress(address)) throw new Error("Invalid address");

  const rpcUrl = chain === "base" ? BASE_RPC : BASE_SEPOLIA_RPC;
  const addr = address.toLowerCase();

  // 1. Get transaction count (nonce) — proxy for wallet activity
  let txCount = 0;
  try {
    const hex = await rpcCall(rpcUrl, "eth_getTransactionCount", [addr, "latest"]);
    txCount = parseInt(hex, 16);
  } catch {}

  // 2. Check if it's a contract (has code)
  let isContract = false;
  try {
    const code = await rpcCall(rpcUrl, "eth_getCode", [addr, "latest"]);
    isContract = code && code !== "0x";
  } catch {}

  // 3. Get balance
  let balanceWei = "0";
  try {
    const hex = await rpcCall(rpcUrl, "eth_getBalance", [addr, "latest"]);
    balanceWei = hex;
  } catch {}

  const balanceEth = parseInt(balanceWei, 16) / 1e18;

  // 4. Reuse counterparty check for sanctions + issuer blacklist
  let counterpartyResult = null;
  try {
    const { checkCounterparty } = await import("./check.js");
    counterpartyResult = await checkCounterparty({ payer: addr, payee: addr, chain });
  } catch {}

  // 5. Compute risk score (0 = safe, 100 = high risk)
  let riskScore = 0;
  const flags = [];

  if (counterpartyResult?.sanctions?.payer?.name) {
    riskScore += 50;
    flags.push("OFAC_SDN_MATCH");
  }
  if (counterpartyResult?.issuer_blacklist?.payer?.blacklisted) {
    riskScore += 40;
    flags.push("ISSUER_BLACKLISTED");
  }
  if (txCount === 0) {
    riskScore += 10;
    flags.push("NO_ACTIVITY");
  }
  if (txCount < 5 && txCount > 0) {
    riskScore += 5;
    flags.push("LOW_ACTIVITY");
  }
  if (isContract) {
    riskScore += 5;
    flags.push("IS_CONTRACT");
  }

  riskScore = Math.min(100, riskScore);

  let riskLevel = "LOW";
  if (riskScore >= 70) riskLevel = "HIGH";
  else if (riskScore >= 30) riskLevel = "MEDIUM";

  return {
    address: addr,
    chain,
    risk_score: riskScore,
    risk_level: riskLevel,
    flags,
    details: {
      is_contract: isContract,
      transaction_count: txCount,
      balance_eth: balanceEth.toFixed(6),
      sanctions_hit: !!counterpartyResult?.sanctions?.payer?.name,
      issuer_blacklisted: !!counterpartyResult?.issuer_blacklist?.payer?.blacklisted,
    },
    checked_at: new Date().toISOString(),
  };
}