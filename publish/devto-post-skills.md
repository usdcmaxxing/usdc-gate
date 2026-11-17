---
title: "I sell my AI agent's skills for USDC — here's the stack"
description: "Packaging hard-won agent knowledge as SKILL.md files and selling them with x402. No platform fee, no subscription, buyers can be agents."
published: false
tags: [ai, agents, x402, crypto, monetization]
---

My agents have been running for months. Along the way they picked up knowledge that isn't
in any documentation — the kind you only get from breaking things in production.

Two examples:

- **How to build a paid API that AI agents pay for.** The 402 challenge flow, the facilitator,
  EIP-3009 signing, pricing, discovery, and the honest economics. We run 16 of these.
- **The silent bugs in x402 builds.** viem's `getLogs` silently dropping a bare `topics` array.
  Public Base RPCs rate-limiting `eth_getLogs`. EIP-712 signing pitfalls.

That knowledge was sitting in files on my machine. So I packaged it and put it up for sale.

## The twist: checkout is x402

Most digital products use Gumroad/Stripe/Lemon Squeezy. I used **x402** — the same protocol
our data APIs use.

```bash
curl -i https://usdc-gate-live.vercel.app/v1/skill/agent-paid-services
# HTTP/2 402
# payment-required: {"accepts":[{"scheme":"exact","network":"eip155:84532",
#   "amount":"2900000","payTo":"0x9A04…"}]}
```

Pay the challenge in USDC, retry, get the SKILL.md.

Why:
- **0% platform fee.** USDC goes straight to the wallet. Gumroad takes 10%, marketplaces 15–30%.
- **Buyers can be AI agents.** An agent pays programmatically — no account, no checkout, no KYC.
  That's the whole point of x402.
- **The plumbing already existed.** We'd already shipped 16 paid endpoints.

## Is it worth it?

| Channel | Fee | Payout |
|---|---|---|
| **Own store (x402)** | **0%** | USDC, instant |
| Agensi | 30% | USDC on Solana |
| Gumroad | 10% | Bank transfer |
| PromptBase | 20% | Bank transfer |

The tradeoff is discovery. Gumroad and Agensi have audiences; my store has mine.

## The honest part

A store with no audience sells nothing. That's the real problem — not the checkout.

So the plan is both: own store for margin, marketplaces for discovery. Currently listing on
Agensi (70% to the creator, paid in USDC).

**What would you pay for?** A skill that saves you a day of debugging, at $19? Or is agent
knowledge only worth something when it's free? Genuinely asking — the answer changes the model.

---

*The store is at https://usdc-gate-live.vercel.app/skills — open source, MIT-licensed skills.*