import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";

// Native USDC (Circle-issued) — the issuer can blacklist these on-chain.
export const USDC = {
  "base-sepolia": {
    chainId: 84532,
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    label: "Native USDC (Circle-issued, Base Sepolia)",
  },
  base: {
    chainId: 8453,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    label: "Native USDC (Circle-issued, Base)",
  },
};

// Minimal FiatTokenV2 ABI — only what the gate needs
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_account", type: "address" }],
    name: "isBlacklisted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "currency",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

const RPCS = {
  "base-sepolia": process.env.RPC_BASE_SEPOLIA || "https://sepolia.base.org",
  base: process.env.RPC_BASE || "https://mainnet.base.org",
};

export function clientFor(chainKey) {
  return createPublicClient({
    chain: chainKey === "base" ? base : baseSepolia,
    transport: http(RPCS[chainKey]),
  });
}

/** Live read of Circle's issuer blacklist for an address. */
export async function isBlacklisted(chainKey, address) {
  const client = clientFor(chainKey);
  const { address: usdcAddr, label } = USDC[chainKey];
  const blockNumber = await client.getBlockNumber();

  let blacklisted = null;
  let error = null;
  try {
    blacklisted = await client.readContract({
      address: usdcAddr,
      abi: USDC_ABI,
      functionName: "isBlacklisted",
      args: [address],
    });
  } catch (e) {
    error = String(e?.shortMessage || e?.message || e);
  }

  return {
    blacklisted,
    error,
    checked_at_block: blockNumber,
    contract: usdcAddr,
    evidence: "eth_call isBlacklisted(address)",
    token: label,
  };
}

/** True if the address looks like an EVM address. */
export function isAddress(a) {
  return typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
}

/** Read the token name/currency so we can prove which asset we screened. */
export async function tokenIdentity(chainKey) {
  const client = clientFor(chainKey);
  const { address: usdcAddr } = USDC[chainKey];
  try {
    const [name, currency] = await Promise.all([
      client.readContract({ address: usdcAddr, abi: USDC_ABI, functionName: "name" }),
      client.readContract({
        address: usdcAddr,
        abi: USDC_ABI,
        functionName: "currency",
      }),
    ]);
    return { name, currency };
  } catch (e) {
    return { name: null, currency: null, error: String(e?.message || e) };
  }
}
