---
name: memecoin-strategy-validation
description: "Validate a memecoin strategy against real baselines."
version: 1.0.0
author: finder
license: MIT
metadata:
  hermes:
    tags: [memecoin, trading, strategy, backtest, risk, paper-trading]
    related_skills: []
---

# Memecoin strategy validation

Running or evaluating a memecoin trading strategy (paper or live) and deciding whether it has an
edge.

## When to Use

Use when building, running, or judging a memecoin trading strategy — a paper trader, a live
bot, a backtest, or a claimed edge. Also use when comparing a strategy against what real top
traders actually do, or when a stop loss seems to be missing its target.

## Identity: token address, never symbol

Memecoin symbols collide constantly — many distinct tokens share a name (HABIBI ×6, POLAND ×5,
STARSHIP ×4, trump ×3 in one small sample). Any join, dedupe, price lookup, or position keyed on
`symbol` is wrong.

- Key every pick/trade/observation on the **token address**.
- Resolve price marks through `trades.pick_id → picks.id`, not `WHERE symbol=?`. A symbol lookup
  silently prices one token's position with another token's quote.
- Display a short token suffix (`SYMBOL·last4`) in reports so two same-named tokens are
  distinguishable.

## Compare against verified baselines before believing a result

- Use realized-PnL leaderboards (KOLScan, solanatracker, pump.fun) as the benchmark, and read the
  **win/loss record**, not just the PnL. Survivorship bias hides the losers.
- The verified leader profile: **high volume** (hundreds to thousands of trades/month), **win
  rate 35–56%** (often below 50%), **asymmetric payoffs** (a few 5–10x winners pay for many small
  losses), **~100-second holds**, and **velocity** (six figures traded/month, keeping ~1%).
- A strategy that wins 10% of trades is not "unlucky" — it is structurally different from the
  leaders, and the difference is usually the payoff shape and trade count, not the entry filter.

## Break-even math first

Compute the required win rate from the payoff geometry **and the measured round-trip cost**, then
compare to actual:

```
break_even = risk / (risk + reward)                          # before costs
break_even = (risk + cost) / (risk + cost + reward - cost)   # after costs
```

- Measure the round-trip cost per venue; the assumed constant is usually optimistic.
- If the required win rate exceeds what the leaders achieve, the geometry is the problem, not
  the discipline.

For a **running arm**, the break-even to compare the actual win rate against is the one derived
from its realized payoff, not the configured geometry:

```
payoff      = avg_win / abs(avg_loss)
break_even  = 1 / (1 + payoff)
```

- The structural formula needs the stop/take-profit geometry to be right; the realized formula
  needs only the ledger, and it is what the arm actually has to beat.
- Report both when they disagree — a gap means the configured exits are not what is happening.

## Gap risk: polling stops are not binding

A stop loss is only enforced at the next price poll. On a 5–15 minute cadence, a gap takes the
exit straight through the stop: a −30% or −50% stop can realize −90% to −103%.

- Count `*_gap` exit reasons separately; they are the difference between the modelled stop and
  the realized loss.
- Report the effective hold (poll interval + configured stop) as a property of the instrument,
  not a config error.
- A wider stop does not fix gap risk on a slow poll — it just changes the size of the gap.

## Parallel-arm discipline

When testing a new configuration against the baseline:

- Give each arm its **own database**; never mix ledgers.
- Keep the entry gates identical and change only the variable under test.
- **One variable per arm.** A treatment that moves two knobs at once cannot
  isolate either: if it underperforms, you learn nothing about which knob did it.
  Leaders2 raised the liquidity floor *and* extended the time stop together, so
  its failure did not falsify the time stop. When a multi-variable arm fails,
  say it is confounded and propose the clean single-variable test.
- **Verify the ledger is being fed before trusting its n.** A stale ledger reads
  as "quiet day" or "no edge". Check the runner's DB path and the ledger's
  last pick/trade timestamp: if nothing has been written for a day while the
  picks table also stops growing, the arm is not running — report it as an
  operational failure, not as a result.
- Flag any deviation from the requested config in writing, with the reason.
- Compare after a pre-agreed sample size. Sample ladder: **n < 30 is variance** —
  report it as such, never as an edge; **n >= 200** is enough to promote a
  configuration to the main config.
- **Starvation is a failure, not a quiet day.** An arm that screens hundreds of candidates and
  takes zero is blocked by its own gates (liquidity floor, venue blocklist, security screen), not
  by lack of opportunity. Count picks screened vs taken per day; when taken is 0 and screened is
  high, report it as starvation and name the top skip reasons — never let "0 trades" read as
  "no setups today".
- Tightening gates (raising the liquidity floor, adding a security screen) can silently starve an
  arm. Re-check the screened/taken ratio after any gate change, before believing the arm is idle.

## Pre-register the decision, then script the check

Decide the promotion/retirement rule **before** the sample exists, write it down, and
turn it into a script that prints a verdict. Never renegotiate the rule after seeing
the result — if the rule is wrong, change it for the next candidate and say why.

- The rule must be mechanical: a sample-size floor, the sign of realized PnL, and
  win rate against the payoff-derived break-even. No judgement calls, no "this week".
- Script the check so the verdict is printed, not eyeballed (`--promote` applies it),
  and wire it into the daily report.
- Promote or retire by the rule, not by which arm "looks better" right now.
- Robustness (mean after removing the best N trades) is **expected** to go negative
  for an asymmetric-payoff strategy — that is the shape working, not a flaw. Report
  it; never use it as a veto.
- A boilerplate lives at `templates/pre-registered-decision.md`.

## A new exit gate changes the ledger, so re-baseline before judging the arm

Adding an exit-side gate (routability, sell-route, sanity) rewrites how existing
positions are BOOKED, not just which new ones are taken. The first trades under
the new gate are not comparable with the pre-gate history.

- Date the gate: find the first trade with the new `exit_reason` and the config
  backup that introduced it. If they coincide, every pre-gate number is a
  different measurement, not a control.
- Split the ledger at the gate date and report per-trade $ for each era
  separately. A cumulative mean across the boundary hides the change.
- A gate that books a flat total loss on an unroutable pool is a bookkeeping
  choice, not a measurement. Compare it against the shadow book's final
  multiple: if the cohort's average final multiple is >= 1.0x, a flat -100%
  overstates the loss and can flip a pre-registered verdict's margin.
- Venue concentration is the first thing to check on a new loss reason. If
  one venue holds both the arm's best per-trade $ and all the new losses, the
  lever is the EXIT for that venue, not a blanket venue block.

## Keep it honest with a daily watch

A strategy validated once drifts. Run a scheduled daily loop that:

- re-pulls the leaderboard baselines (they change),
- verifies each arm's ledger is actually being written by a live runner
  (compare last pick/trade timestamps against the runner's DB path — a stale
  ledger is an operational failure, not a quiet day),
- re-runs the arm comparison and reports each arm's sample size,
- re-checks the pre-registered rule and announces when the condition is met,
- writes the full note to a dated report and replies with a short summary.

Keep the reply short; the dated report carries the detail.

### The daily brief (compact delivery)

Deliver the numbers as a short fixed-shape block, not prose. A **no-agent script job** is the
right carrier: deterministic, instant, no LLM cost and no rate-limit risk. Shape:

```
MEMECOIN BRIEF — <Day Mon D> (<HH:MM> <TZ>)

<Arm>   <NT>  <NN% WR>  <+$x.xx> today | cum <+$x.xx> (n=<N>)
<Arm>     0T     -    $0.00 today | cum <+$x.xx> (n=<N>)
          starved: <N> picks screened, 0 taken

Consolidation <MET|not yet>: n=<N>/200, realized <+$x.xx>, WR <NN.N%> vs BE <NN.N%>
```

- One line per arm: trades today, win rate, day P&L, cumulative, sample size.
- The starvation line appears only when an arm screened candidates and took none.
- The consolidation verdict is always the last line.
- Day boundary is the user's local timezone, not UTC.
