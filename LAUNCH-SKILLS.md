# 🚀 Skill Store — Launch Checklist

*The store is LIVE. Here's exactly what's done and what needs you.*

---

## ✅ Live right now

**Store page:** https://usdc-gate-live.vercel.app/skills
**JSON catalog:** https://usdc-gate-live.vercel.app/v1/skills

| Skill | Price | Endpoint |
|---|---|---|
| Agent-Paid Services | $29 | `GET /v1/skill/agent-paid-services` |
| x402 Implementation Gotchas | $19 | `GET /v1/skill/x402-implementation-gotchas` |

- Paid via **x402 in USDC** → **0% platform fee**, straight to the payTo wallet.
- Free catalog so buyers can see what's inside before paying.
- 18/18 tests pass; all endpoints verified returning a correct `402`.

**Why x402 and not Stripe:** the buyers are AI agents. An agent can pay programmatically
with no account, no KYC, no checkout. A human can still pay with any wallet via EIP-3009.

---

## ⬜ Needs you: the marketplaces

The direct store has **no built-in discovery**. Marketplaces have audiences. Both matter.

### 1. Agensi — 70% revenue, **pays in USDC on Solana**
- **Sign up:** https://www.agensi.io/auth → "Sign up"
- **Submit:** https://www.agensi.io/dashboard/submit
- Category: *Web3 & Crypto* or *Prompt & Skill Engineering*
- They run a security scan + AI + human review (24–48h)
- **This is the best fit** — USDC payouts, no KYC for the seller side

### 2. AgentAlley — 70% of net
- Apply to be a creator; each item is reviewed. $1–$500 price range.

### 3. AIMarket24 — 85% (95% for the first 50 sellers, 6 months)
- Free listing, $1 minimum. Good for volume.

### 4. MCP Marketplace — 85% via Stripe Connect

**Copy-paste listing text for every platform:** `skill-store/LISTINGS.md`

---

## ⬜ Needs you: traffic

The store has no audience yet. Realistic channels:

1. **Post the store** on the same places we prepared for USDC Gate
   (`publish/hn-post.md`, `publish/x-thread.md` — adapt the angle to "skills").
2. **Dev.to article**: "I packaged two agent skills and now sell them for USDC" —
   the build story sells better than the product.
3. **List in the agent directories** (Agent402, Circle Marketplace) — the skills are
   agent-native, so they belong there.
4. **Cross-sell to USDC Gate buyers** — a buyer of the x402 datasets is the exact
   persona for the x402 skills.

---

## 💡 Ideas to grow it

- **Add more skills.** We have ~40 bundled skills; the unique ones are packaged, but
  the good generic ones (PDF, weekly review, competitor monitor) could be repackaged.
- **Bundle pricing** — both skills for $39 (vs $48 separately).
- **Free sample** — a 1-page teaser for each, so buyers can judge before paying.
- **Version updates** — skills improve; charge for major versions.

---

## Files

```
usdc-gate/
├── skillstore.js              ← catalog + product definitions
├── skills/                    ← the actual SKILL.md files (paid downloads)
│   ├── agent-paid-services/SKILL.md
│   ├── x402-implementation-gotchas/SKILL.md

├── public/skills.html         ← store page
└── skill-store/LISTINGS.md    ← marketplace copy
```