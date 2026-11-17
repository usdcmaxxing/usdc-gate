# 🏪 Skill Store — Agent Skills

*SKILL.md packages for Agensi (**70% in USDC on Solana**). Current policy: **agent
engineering only — no crypto-trading content.***

---

## The lineup

These are **not** generic bundled skills — they are hard-won, specific knowledge from
systems that actually run.

| # | Skill | What it teaches | Price | Status |
|---|---|---|---|---|
| 1 | **agent-paid-services** | Build a paid x402/USDC API: 402 flow, facilitator, pricing, discovery, honest economics | $29 | **submitted** (agent monetization, not trading) |
| 2 | **x402-implementation-gotchas** | The silent bugs that cost real debugging time (viem `getLogs`, RPC rate limits, EIP-712) | $19 | submitted (v1.1 in review) |
| 3 | **agent-risk-verdicts** | Underwrite AI agent risk: settlement + credit + trigger composed into one EIP-712 verdict | $29 | submitted |
| 4 | **agent-risk-scorecard** | Read an agent's on-chain history as a risk scorecard — free funnel | **free** | submitted |

**Parked (crypto-trading, on hold by request):**

| Skill | What it teaches | Price |
|---|---|---|
| trenches-base-rates | Memecoin trench trading: base rates, security checks, MEV math, exit discipline, real ledger audit | $19 |
| memecoin-rug-check | Ten on-chain security checks before buying a new memecoin | free |

Both are written, scanned and draftable. Held back until you want them live.

**Why this shape:** the marketplace's top skills are free and generic (2,000+ uses);
paid niche skills get almost none. #1–#3 are the deep paid catalog built on the
verification/risk edge for agents — agent engineering, not speculation.

Agensi math at $29 × 100 sales = **$2,030** (70%).

---

## Ready-to-paste listings

### Agensi (70%, USDC or Stripe)
**Sign up:** https://www.agensi.io/auth → **Submit:** https://www.agensi.io/dashboard/submit
The `submit_skill` MCP tool does this directly — drafts are staged, then confirmed.

| Skill | Title | Category | Price |
|---|---|---|---|
| agent-paid-services | Build Paid APIs for AI Agents (x402 + USDC) | web3-crypto, apis-backend | $29 |
| x402-implementation-gotchas | x402 Implementation Gotchas — The Bugs That Actually Bite | web3-crypto, apis-backend, code-quality-review | $19 |
| agent-risk-verdicts | Agent Risk Verdicts — Underwrite AI Agents with Signed Proof | finance-accounting, web3-crypto | $29 |

---

### AgentAlley (70% of net)
**Title:** x402 Implementation Gotchas — The Bugs That Actually Bite
**Short description:**
> The silent failures in x402 service builds: viem's getLogs dropping a bare topics array, public Base RPC rate limits, EIP-712 signing pitfalls, and how to structure a paid route so the facilitator settles correctly.
**Category:** Software Development
**Tags:** x402, viem, web3, payments, debugging

---

### AIMarket24 (85%, 95% for the first 50 sellers)
List any of them; free listing, $1 minimum.

---

## Files

```
skill-store/
├── agent-paid-services/SKILL.md          # submitted
├── x402-implementation-gotchas/SKILL.md  # submitted (security flag under review)
├── agent-risk-verdicts/SKILL.md          # submitted
├── agent-risk-scorecard/SKILL.md       # submitted (free funnel)
├── trenches-base-rates/SKILL.md          # parked (crypto-trading)
├── memecoin-rug-check/SKILL.md           # parked (crypto-trading)
├── crosslist/AGENTS.md                   # AgentAlley + AIMarket24 paste text
└── LISTINGS.md                           ← this file
```

Each folder zips to a submission-ready package (SKILL.md + optional scripts/reference).

---

## Status

- ✅ **agent-paid-services** — **live** on Agensi since 2026-11-17, security approved, $29. Agent monetization, not trading. https://agensi.io/skills/build-paid-apis-for-ai-agents-x402-usdc
- 🟡 **agent-risk-verdicts** — submitted 2026-11-17, security scan **passed**, pending human review. $29. https://agensi.io/skills/agent-risk-verdicts-underwrite-ai-agents-with-signed-proof
- 🟡 **x402-implementation-gotchas** — v1.0 was flagged `security: fail` (no reason exposed). **v1.1 submitted** to replace it in review (`pending_update: 1.1`): removed the credential-file upload mechanics and the mock-facilitator payment-bypass framing, kept the engineering substance. v1.0's `fail` still shows until Agensi scans the new upload. $19. https://agensi.io/skills/x402-implementation-gotchas-the-bugs-that-actually-bite
- ⬜ **Parked:** `trenches-base-rates`, `memecoin-rug-check` — crypto-trading, held by request.
- ⬜ Optional: add a logo and a screenshot per listing at https://agensi.io/dashboard/submit?media-upload=logo.

The content is done and reviewed-by-us; Agensi runs its own security scan and review.
