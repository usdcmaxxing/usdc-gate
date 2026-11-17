---
name: trenches-base-rates
description: "Trade the earliest, riskiest stage of memecoins with the base rates in view: bonding-curve lifecycle, the ten security checks, MEV and slippage math, staged exits, and the honest ledger audit that shows why most trench positions lose."
version: 1.0.0
author: toolweather
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [memecoin, solana, pump-fun, trading, risk, mev, base-rates, security]
    related_skills: []
---

# Trenches base rates

The trenches are the earliest, riskiest stage of memecoin trading: tokens seconds to
hours old, primarily on Solana, primarily on pump.fun's bonding curve. The defining
fact is the **0% → 95% bonding-curve window** — that is where most of the alpha and
most of the rugs live.

This skill is a **mental model and a survival checklist**, not a signal. It is built
from on-chain base rates and a real traded ledger, and it is honest that the game is
PvP: the platform earns fees whether or not any coin works.

**This is not financial advice.** Treat every position as money you can afford to lose
entirely. Nothing here is a recommendation to buy anything.

## The base rates (the numbers that matter)

| Fact | Source |
|---|---|
| 8.2M pump.fun launches checked; **38%** had a non-dev buyer in block 0 | Bitquery |
| **21%** of launches had dev wallets in block 0 (bundled); median **10%** of supply | Bitquery |
| Devs + bundled wallets made **$579M+** after fees; sniper bots made **$31.5M** | Bitquery |
| **65%** of devs sold within a minute of launch | Bitquery |
| **98.6%** of pump.fun tokens collapsed below $1,000 liquidity | Solidus Labs |
| Graduation rate: <1.4% historically, **~0.26%** by mid-2026 | DEXTools |
| ~2/3 of Solana memecoins dead within a day; 80%+ lose >90% within a week | Bitget |
| **6.85M sandwiches** in a year (~20k/day); $29.7M taken; **96% on pump.fun coins** | Bitquery |
| Median sandwich: **$2.33**; for every $1 a bot takes the victim loses **$1.20–$1.30** | Bitquery |
| At 20–50% slippage: **148/10,000** swaps sandwiched; at 1–3%: **8/10,000** | Bitquery |
| **82–90%** of retail sniper users lose money long-term | on-chain data |

**The single most important number:** devs took $579M, snipers took $15–31M. The dev's
edge is structural — they set the supply, the curve, and the timing. The sniper's edge
is thin and mostly eaten by other bots and MEV.

## The lifecycle

1. **Launch / block 0.** Dev creates; bundled wallets and sniper bots buy in the same
   block. The dev can buy in the same transaction as the create.
2. **Bonding curve (0–95%).** Price climbs the constant-product curve. Buyers are mostly
   bots and early degens. The dev's bag is hidden across wallets.
3. **Graduation (~85 SOL / ~$69K MC).** The curve closes and liquidity migrates to
   PumpSwap. This is the "graduation play".
4. **Post-graduation.** The asymmetric entry is usually gone. Most tokens dump.
5. **Death.** Median memecoin peaks 17.2 days after listing; 81% fall ≥90% from ATH;
   only 3.3% recover.

**Meta rotation is the real cycle:** origin → expansion → saturation → rotation. The
origin is mostly unfindable; the repeatable skill is recognizing **expansion before
saturation**.

## The ten security checks (the only shield)

Run all of these before buying. Data is your only shield.

1. **Mint authority revoked** — if active, the dev can print unlimited supply.
2. **Freeze authority revoked** — if active, the dev can freeze your wallet.
3. **LP burned or verifiably locked** — check the lock expiry and owner.
4. **No transfer hooks / Token-2022 extensions** — a hook can block your sell (honeypot).
5. **Holder concentration** — top-10 <30% after clustering related wallets; a single
   wallet >5% is a red flag.
6. **No bundled launch** — multiple fresh wallets funded from one source that bought in
   the first blocks. This is the #1 rug pattern.
7. **Dev history** — repeat deployers with dead tokens.
8. **Sell-back test** — buy the smallest amount and sell immediately; if it fails or
   returns far less, walk away.
9. **Taxes** — buy/sell tax >10%, or a tax the owner can change, is a red flag.
10. **Liquidity depth vs market cap** — a $5M MC on $40k liquidity means you cannot exit.

Tools: RugCheck / SolSniffer (Solana), GoPlus / Honeypot.is / TokenSniffer (EVM),
Bubblemaps (clusters), GMGN / Nansen (wallets), DexScreener / GeckoTerminal (markets).

## MEV and latency (the hidden tax)

- **Tight slippage (1–3%)** cuts the sandwich rate from 148/10,000 to 8/10,000. Wide
  slippage is an invitation.
- **Jito bundles** (up to 5 txs, atomic, sequential) are the standard primitive for
  sniping and MEV protection.
- **Detection:** Yellowstone gRPC / Geyser shreds decode a create while block 0 is still
  open. A slow path lands a block or two later at a worse price.
- **0-block inclusion is not guaranteed** — it depends on RPC/Geyser quality, network
  conditions, tip levels, and how early the mint is relative to the slot.
- **MEV is a tax on the whole economy.** For every $1 a bot takes, the victim loses
  $1.20–$1.30. Include it in your cost model.

## Entry tactics, in order of information

| Tactic | What it is | Evidence |
|---|---|---|
| **Block-0 snipe** | Buy in the create block via Geyser/Yellowstone + Jito bundle | Win rate 40–60%, high variance, survivorship-biased |
| **First-dip** | Wait for the 40–60% pullback, buy the first higher low once you see who sold | Higher information; most consistent profits |
| **Base** | Days later, after the flippers are gone and the token survived its first dump | Highest information, lowest multiple |
| **Graduation snipe** | Buy the migration to PumpSwap | Crowded: 9/12 pools below open price within the hour |
| **Narrative rotation** | Buy the #2 narrative early, sell when the leader tops 25–30% 7d | The core trencher skill |
| **Late chase** | Buy what is already trending | **Strongly negative EV** |

**The rule:** the edge is on the curve, not after it. By the time a human sees a coin,
bots have often already moved.

## Exit discipline (where the game is won)

Most trench positions lose. Skill changes **how much you lose on the losers and how much
you keep on the winners** — sizing, exits set at entry, not chasing.

- **Tranche:** 25% at 2x (return of principal), 25% at 5x, 25% at 10x, 25% moonbag.
- **Trailing stop:** 20–30% off peak, set **once you are in profit**, not at entry.
- **Time stop:** 10–15 min if the price never moves; 2h max for fresh launches.
- **Volume-spike-without-price** is an exit signal.
- **Sell into buy volume**, and check price impact for your tranche size against pool
  depth before executing.
- **Set the exit at the same time as the entry.** The decision happens while you are
  rational.
- **Never chase. Never average down. One trade per coin.**

## A real ledger, honestly read

A 16-trade trench ledger, audited:

- **12.5% win rate, −23.8%/trade expectancy, −$95.35 total.** Payoff 1.34, breakeven
  42.7%.
- **12 of 14 losers exceeded the −30% stop.** Median loss **−36.6%**. The take-profit
  ladder was never reached on a loser — it was decorative.
- **5 of 13 timed trades breached the 60-min gate** — all posted 2–3 AM and entered at
  8:13 AM, one cohort, likely a scheduling artifact.
- **5 "trades" were a bulk time-stop sweep** closed at one identical timestamp, worth
  **−$36.99 of the −$95.35 (39%)**. A bookkeeping artifact, not a market outcome.
- Only 2 winners, both trail-stops. Every hard stop and time stop lost.
- Counterfactual over the pick universe: no filter −$134.10, with filters −$55.93.
  **Filters removed ~58% of losses; survivors still lose.**
- The 60-min gate **blocked one of the two winners**.

**The lesson:** filters help, they do not fix it. Fix measurement before strategy.
Record every pick the feed emits, taken or not, with entry/exit marks and counterfactual
outcome. Track expectancy, hit rate, average winner, average loser, max drawdown, and
the result **without the best 3 trades**. 100+ trades before you believe anything.

## Risk management

- Position ≤2–5% of capital per trade; max 5 concurrent; daily loss cap.
- Cost model: **4% round trip + failed-tx rate**, not 2%.
- Only money you can afford to lose entirely.

## The honest hierarchy

1. **Hold the reserve asset / don't trade the trenches.** Most underrated.
2. **Follow proven smart money** with sub-second detection and mirrored exits (accept the
   imitation penalty).
3. **First-30-seconds sniper** with real infra (Geyser + Jito + geo hosting).
4. **Late chase** — a loser's game.

## Checklist

- [ ] Mint and freeze authorities revoked
- [ ] LP burned/locked, expiry and owner checked
- [ ] No transfer hooks / Token-2022 extensions
- [ ] Holder concentration checked after clustering
- [ ] No bundled launch (fresh wallets, one funding source, first blocks)
- [ ] Dev history checked
- [ ] Sell-back test passed
- [ ] Taxes ≤10% and immutable
- [ ] Liquidity depth supports your exit size
- [ ] Slippage 1–3%
- [ ] Exit tranches and time stop set at entry
- [ ] Every pick logged with counterfactual outcome
