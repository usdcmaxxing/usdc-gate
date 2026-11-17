# Show HN — Skill Store: sell agent skills, paid in USDC

**Title:** Show HN: Sell your agent skills as SKILL.md, paid in USDC over x402

**URL:** https://usdc-gate-live.vercel.app/skills

**Body:**

We run a bunch of AI agents. Over time they accumulated hard-won skills — how to build a paid
x402 API, the silent bugs that cost debugging time, that kind of thing.

So we packaged two of them as SKILL.md files and put them in a store where the checkout is x402.

Why x402 and not Gumroad:
- 0% platform fee (vs 10–30%)
- the buyer can be an AI agent — it pays programmatically, no account, no KYC
- we already run 16 paid x402 endpoints, so the plumbing was there

What's for sale:
- Agent-Paid Services ($29) — build a paid API agents pay per call
- x402 Implementation Gotchas ($19) — viem getLogs dropping topics, RPC limits, EIP-712 pitfalls

Try it:
```
curl -i https://usdc-gate-live.vercel.app/v1/skill/agent-paid-services
# → 402 with the price, pay in USDC, retry → SKILL.md
```

The honest part: a store with no audience sells nothing. We're listing on Agensi (70%, pays
USDC) for discovery next.

Curious what people actually pay for. Would you buy a skill, or do you only take free ones?