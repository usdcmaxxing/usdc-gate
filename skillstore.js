// Skill Store — sell SKILL.md packages as x402-paid HTTP resources.
// 0% platform fee: the buyer pays USDC directly to our payTo address.
// The file IS the product; x402 is the checkout.

export const SKILLS = [
  {
    slug: "agent-paid-services",
    name: "Agent-Paid Services",
    tagline: "Build a paid API that AI agents pay for, per call, in USDC.",
    description:
      "The complete build guide for x402 + USDC paid services: the 402 challenge flow, the facilitator, EIP-3009 signing, pricing, discovery surfaces (Bazaar), the free MCP funnel, and the honest economics. Written while running 16 paid endpoints.",
    price: "$29",
    amount_atomic: "2900000",
    file: "skills/agent-paid-services/SKILL.md",
    tags: ["x402", "usdc", "agent-payments", "monetization", "api"],
    includes: [
      "The 402 → sign → settle flow, end to end",
      "Seller-wallet discipline (address, not key)",
      "Discovery/Bazaar extension wiring",
      "The risk-layer pattern (live on-chain vs snapshot)",
      "Economics: who actually pays, and how much",
    ],
  },
  {
    slug: "x402-implementation-gotchas",
    name: "x402 Implementation Gotchas",
    tagline: "The silent bugs that cost real debugging time in x402 builds.",
    description:
      "Hard-won implementation traps: viem's getLogs silently dropping a bare topics array, public Base RPC rate limits, EIP-712 signing pitfalls, and how to structure a paid route so the facilitator settles correctly the first time.",
    price: "$19",
    amount_atomic: "1900000",
    file: "skills/x402-implementation-gotchas/SKILL.md",
    tags: ["x402", "viem", "web3", "payments", "debugging"],
    includes: [
      "viem getLogs topics bug (with the fix)",
      "RPC rate-limit workarounds",
      "EIP-712 signing pitfalls",
      "Facilitator settlement structure",
    ],
  },
];

export function listSkills() {
  return {
    store: "USDC Gate Skill Store",
    model: "Pay per skill in USDC via x402 — no platform fee, no subscription",
    currency: "USDC",
    skills: SKILLS.map(({ slug, name, tagline, price, tags, includes }) => ({
      slug, name, tagline, price, tags, includes,
      endpoint: `/v1/skill/${slug}`,
    })),
  };
}

export function getSkill(slug) {
  return SKILLS.find((s) => s.slug === slug) || null;
}