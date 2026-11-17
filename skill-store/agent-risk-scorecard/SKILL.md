---
name: agent-risk-scorecard
description: "Turn an AI agent's on-chain history into a risk scorecard: settlement evidence, credit tier, recommended limit and rate, and a one-line verdict. Read-only, no account, no key."
version: 1.0.0
author: toolweather
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [agent-risk, credit, underwriting, scorecard, on-chain, web3, verification]
    related_skills: []
---

# Agent risk scorecard

Turn an AI agent's on-chain history into a one-page risk scorecard a lender,
insurer, or bonder can act on. **Read-only**: it reads public chain data, moves
nothing, and needs no account or key.

This is a research and decision aid, not legal, insurance, or investment advice.

## When to use

- A lender or insurer asks "how risky is this agent?"
- You are deciding whether to extend credit, bond, or escrow to an agent.
- You want a structured second opinion on an agent's claimed history.
- You want to see the shape of a verdict before paying for a signed one.

## The core idea

Self-reported history is worthless. A scorecard must be built from **settled
on-chain facts**: payments that actually cleared, payees that match, amounts that
match, and failures that are visible on-chain. If the agent supplies its own
"evidence", the scorecard is advertising.

## What to gather

For an agent address, collect from public chain data:

| Signal | Why it matters |
|---|---|
| **Settled payments in** | Verified income. Count, total value, unique payers, recency. |
| **Settled payments out** | Does the agent pay its own obligations? |
| **Unique counterparties** | One payer paying repeatedly is weaker than many. |
| **Default evidence** | A payment that did not settle, or a payee/amount mismatch. |
| **Duplicate payment attempts** | Same tx reused, or a claim made twice. |
| **Account age and activity spread** | A one-day-old address with one payment is thin. |
| **Outstanding obligations** | Commitments the agent still owes. |

## Scoring

Keep the rules explicit — a judge should be able to follow them.

1. **Default rule.** Any verified non-settlement or payee/amount mismatch is a
   default. A default caps the tier, regardless of volume.
2. **Floor rule.** Below a minimum history threshold (few settled payments, or a
   very young address), the verdict is **reject** — not "risky", *reject*.
3. **Otherwise approve with terms from the score:**

| Tier | Score | Typical profile | Limit | Rate |
|---|---|---|---|---|
| A | 70–100 | Many settled payments, many counterparties, no defaults | 40–60% of verified income | low |
| B | 50–69 | Some history, few defaults | 20–40% | medium |
| C | 30–49 | Thin or mixed history | 10–20% | high |
| D | 0–29 | Defaults, or no verifiable history | reject | — |

Calibrate the bands to your own loss tolerance. Publish them so the decision is
reproducible.

## The verdict

One line, then the evidence:

```
VERDICT: APPROVE tier B, limit $1,200, rate 1,400 bps
Evidence: 9 settled payments, 6 counterparties, $4,100 verified volume, 0 defaults, address age 14 months
Rule: floor passed, no default, score 58 → tier B
```

Always state **which rule fired**. A score with no rule is a liability.

## What the scorecard does not tell you

- **Future behaviour.** It describes verified history, not intent.
- **Off-chain obligations.** Nothing on-chain says what the agent promised a human.
- **Capacity.** It sizes exposure; it does not supply the capital or the license.
- **That the agent is good.** It says the evidence does not contradict the claim.

## Common mistakes

- **Trusting self-reported volume.** Read the chain.
- **Counting a payment that settled last quarter as current.** Bound the evidence
  window and say so.
- **Ignoring payee/amount.** A settled tx to a different payee is not income.
- **Averaging away a default.** One default is a default; it caps the tier.
- **A score with no stated rule.** If you cannot say the rule, you cannot defend it.

## Verify, then decide

The scorecard is the read-only view. When a decision must be enforceable — a loan
documents, a policy trigger, a bond — use a **signed verdict**: the same evidence,
normalized and signed so a third party can verify it offline by recovering the
signer. A scorecard informs; a signed verdict binds.

## Checklist

- [ ] Address identified and account age noted
- [ ] Payments read from chain, not from the agent's claim
- [ ] Payee and amount matched, not just tx presence
- [ ] Duplicate payment attempts checked
- [ ] Unique counterparties counted
- [ ] Defaults identified
- [ ] Tier assigned from the published bands
- [ ] Rule that fired stated
- [ ] Evidence window stated
- [ ] Limits of the scorecard stated
