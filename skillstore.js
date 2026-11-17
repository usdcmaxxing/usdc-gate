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
  {
    slug: "memecoin-strategy-validation",
    name: "Memecoin Strategy Validation",
    tagline: "Test a memecoin trading edge against real baselines — not vibes.",
    description:
      "How to validate a memecoin strategy without fooling yourself: key on token address (never symbol), read win/loss records not just P&L, account for survivorship bias, benchmark against verified leader profiles, and spot the venue effect.",
    price: "$24",
    amount_atomic: "2400000",
    file: "skills/memecoin-strategy-validation/SKILL.md",
    tags: ["crypto", "trading", "backtest", "risk", "memecoin"],
    includes: [
      "Address-vs-symbol identity trap",
      "Verified leader profiles as baselines",
      "Survivorship-bias-free record keeping",
      "Venue routing: where the edge actually is",
      "A pre-registration discipline for claims",
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