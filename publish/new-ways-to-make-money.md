# 🧭 New Ways to Make Money — Research
*findy, 2026-11-16. Ideas outside our usual scan (hackathons / bounties / datasets / agent marketplaces).*

---

## The honest framing

We keep looking in the same place: **prize money and data sales**. Both are real but capped.
This research looked at five different asset classes and business models. Ranked by expected
value for *this* user (has agents + crypto, no audience, no trading capital, no idle GPU).

---

## 1. 🎯 Prediction markets — a new asset class

**What it is:** Trade real-world events (elections, sports, tech, war) on Polymarket and Kalshi.
Cash-settled, API-tradeable, 24/7.

**The numbers:**
- One trader reports **$65k profit in a year** (r/AMA).
- But **84% of Polymarket traders lose money**, and **70% of Kalshi profits come from 0.03% of users**.
- Kalshi is CFTC-regulated (real money, real withdrawal).

**What I built:** a scanner (`opportunity-radar/sources/prediction.mjs`) that pulls
Polymarket + Kalshi markets, finds in-market arbitrage and cross-venue mispricings, and
feeds them into the daily radar. Also live as `/v1/dataset/prediction-markets` on USDC Gate.

**Verdict:** ⚠️ **High risk, needs capital.** The edge is thin and the losers are numerous.
Only worth it with a small, risk-capital stake and a real edge (we don't have one yet).

---

## 2. 🤖 Sell AI agents as subscriptions

**What it is:** Package a bounded agent and sell access at $47–$197/mo.
A CommuniPass case study reports $8,000 → $39,000/mo in 90 days (unverified).

**The real math (vantaige, 2026):**
| Model | Price | Time to first dollar | Ceiling |
|---|---|---|---|
| Marketplace product | $20–200 one-time, $10–50/mo | 30–90 days | Unbounded |
| Agency (custom build) | $500–15,000 + $500–5,000/mo retainer | 7–30 days | Capped by hours |

**The #1 mistake:** launching a listing with no audience and no traffic plan.

**Verdict:** ⚠️ **We have agents but no audience.** The agency path (7–30 days to first dollar)
is the faster one but needs sales effort. Not buildable by me alone.

---

## 3. 🧩 Sell agent skills (SKILL.md) — pays in USDC

**What it is:** Package expertise as a `SKILL.md` and sell it on agent-skill marketplaces.

| Platform | Cut | Payout |
|---|---|---|
| **Agensi** | 70% to creator | **Stripe or USDC on Solana** |
| AgentAlley | 70% of net | Stripe |
| Graded Prompts | 85% | Stripe |
| AIMarket24 | 85% (95% first 6 mo) | Escrow |
| MCP Marketplace | 85% | Stripe Connect |
| UTIM | 95% of compute revenue | — |

- Agensi: 23,000+ skills, 21,000+ users, 3,800+ creators.
- PromptBase: 7,800+ agent skills, $2.99–$14.99 typical.

**Verdict:** ✅ **Best fit for the "paid in crypto" preference** (Agensi pays USDC). Zero marginal
cost. But crowded and needs account creation + review (human). We have real, battle-tested skills.

---

## 4. 🪂 Airdrop farming — the research says don't

**The numbers:** median active farmer captures $2,000–$5,000 per successful protocol, but
**88% of tokens lose value within 3 months**, and farming costs **$150–$3,000 in gas + capital**.
"Most small wallets with limited capital do not clear this threshold."

**Verdict:** ❌ **Poor risk-adjusted return without capital.** Skip.

---

## 5. 💤 Idle compute / bandwidth — real but tiny

Share unused bandwidth (Honeygain, EarnApp) or GPU (Vast.ai). Real payouts, ~$10–200/mo
depending on hardware. A MacBook has no GPU worth renting.

**Verdict:** ❌ **Negligible.** The Mac is already busy running our jobs.

---

## Ranking for this user

| Rank | Path | EV | Effort | Needs |
|---|---|---|---|---|
| 1 | **Agent skills (Agensi, USDC)** | Medium | Low | Account + packaging |
| 2 | **Prediction markets** | High variance | Medium | Capital + edge |
| 3 | **Agency (sell agent builds)** | High | High | Sales |
| 4 | Sell agent subscriptions | Medium | Medium | Audience |
| 5 | Airdrop farming | Low | Medium | Capital |
| 6 | Idle compute | Tiny | None | Nothing |

---

## My recommendation

**Do #1 (agent skills) — it's the only one that pays in crypto, needs no capital, and we
already own the inventory.** Package 3–5 of our best skills, list on Agensi (70%, USDC payout).

**Keep #2 (prediction markets) as a side bet** — the scanner is built and the data is live,
but only trade it with money you can lose.

**The thing I'd avoid:** airdrop farming and idle compute. The research is clear.

---

## What's already built

- `opportunity-radar/sources/prediction.mjs` — Polymarket + Kalshi scanner with edge detection
- USDC Gate `/v1/dataset/prediction-markets` — 40 live markets, $0.03
- Daily radar now includes a "prediction" category