---
name: memecoin-rug-check
description: "Check whether a new memecoin is a rug before you buy: the ten on-chain security checks, the bundled-launch pattern, honeypot detection, and a verdict you can act on in one pass."
version: 1.0.0
author: toolweather
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [memecoin, solana, rugcheck, security, due-diligence, web3, trading]
    related_skills: []
---

# Memecoin rug check

A fast, repeatable security pass on a newly launched memecoin. It answers one
question: **can you exit, and can the dev take your money?**

This is a due-diligence procedure, not a buy recommendation and not financial advice.
A clean pass means the token is *not obviously a rug* — it does not mean it is a good
bet. Most new memecoins lose anyway.

## When to use

- You are about to buy a token that is seconds to days old.
- You are reviewing a token someone sent you.
- You want a structured second opinion before committing size.

## The ten checks

Run them in order. Stop and walk away at the first hard fail.

### 1. Mint authority
If the mint authority is **active**, the dev can print unlimited supply and dilute you
to zero. Check on the token's account (Solana) or the contract (EVM).

- **Pass:** mint authority revoked / null.
- **Fail:** mint authority set and not renounced.

### 2. Freeze authority
If the freeze authority is **active**, the dev can freeze your wallet so you cannot
sell. This is the silent honeypot.

- **Pass:** freeze authority revoked.
- **Fail:** freeze authority set.

### 3. LP burned or verifiably locked
Uniswap-style liquidity should be burned to a dead address or locked with a verifiable
locker. Check the **lock expiry** and **who owns the locker** — a locker the dev
controls is not a lock.

- **Pass:** burned, or locked with a known locker and a long expiry.
- **Fail:** LP held in a wallet the dev controls, or a lock that expires soon.

### 4. Transfer hooks / Token-2022 extensions
A transfer hook can block your sell while allowing buys — the definition of a honeypot.
On Solana, check for Token-2022 extensions (transfer hook, permanent delegate,
transfer fee). On EVM, check for blacklists and trading-switch patterns.

- **Pass:** no hook, no permanent delegate, no transfer fee.
- **Fail:** any hook or extension that can restrict transfers.

### 5. Holder concentration
Look at the top 10 holders **after clustering related wallets** (same funding source,
same first-block buy). A single wallet >5% is a red flag; top-10 >30% means the exit is
fragile.

- **Pass:** top-10 <30% after clustering; no wallet >5%.
- **Fail:** concentrated, or clustering reveals a hidden dev cluster.

### 6. Bundled launch (the #1 rug pattern)
Multiple fresh wallets, funded from one source, that bought in the **first blocks**.
This is the dev buying a hidden share at launch. Devs + bundled wallets took
**$579M+** after fees across 8.2M launches; **21%** of launches had dev wallets in
block 0, with a median **10%** of supply.

- **Pass:** no cluster of fresh wallets buying together in block 0.
- **Fail:** a cluster of fresh, commonly-funded wallets buying in the first blocks.

### 7. Dev history
Look up the deployer's wallet. Repeat deployers with a trail of dead tokens are a
pattern, not bad luck.

- **Pass:** no history, or a history of tokens that survived.
- **Fail:** serial deployer with multiple rugs.

### 8. Sell-back test
**The only check that cannot be faked.** Buy the smallest possible amount and sell it
immediately. If the sell fails, or returns far less than expected, walk away.

- **Pass:** sell executes, return is close to expected after fees.
- **Fail:** sell reverts, is blocked, or returns a fraction.

### 9. Taxes
Buy/sell tax >10%, or a tax the owner can change, is a red flag. A changing tax is a
dev lever.

- **Pass:** tax ≤10% and immutable.
- **Fail:** tax >10%, or owner-changeable.

### 10. Liquidity depth vs market cap
A $5M market cap on $40k liquidity means you cannot exit without moving the price to
zero. Compare your intended exit size to pool depth.

- **Pass:** depth comfortably exceeds your position size.
- **Fail:** shallow pool relative to market cap or your size.

## Tools

- **Solana:** RugCheck, SolSniffer, GMGN, DexScreener, GeckoTerminal, Bubblemaps
  (wallet clustering).
- **EVM:** GoPlus, Honeypot.is, TokenSniffer, Bubblemaps, DexScreener.
- **On-chain reads:** Solana RPC / Yellowstone gRPC for first-block buys; a block
  explorer for authority and LP state.

## The verdict

Report a single line, then the evidence:

```
VERDICT: PASS / FAIL / WALK AWAY
Hard fails: <list>
Concentration: top-10 X% after clustering; largest wallet Y%
LP: burned/locked until <date> by <locker>
Sell-back test: passed/failed (returned Z%)
Depth: $<pool> liquidity vs $<size> intended exit
```

**WALK AWAY** if any hard fail: active mint or freeze authority, dev-controlled LP,
transfer hook, or a failed sell-back test. A bundled launch is a strong walk-away
unless the size is trivial.

## What a clean pass does not tell you

- It does not predict price. **98.6%** of pump.fun tokens collapse below $1,000
  liquidity, and ~2/3 of Solana memecoins are dead within a day.
- It does not protect you from a market-wide dump or a dev who waits weeks.
- It is a rug filter, not an edge. The edge is in entry timing and exit discipline.

## Checklist

- [ ] Mint authority revoked
- [ ] Freeze authority revoked
- [ ] LP burned or verifiably locked (expiry + owner checked)
- [ ] No transfer hooks / Token-2022 extensions
- [ ] Holder concentration <30% top-10 after clustering; no wallet >5%
- [ ] No bundled launch (fresh, commonly-funded wallets in block 0)
- [ ] Dev history checked
- [ ] Sell-back test executed and passed
- [ ] Taxes ≤10% and immutable
- [ ] Liquidity depth supports your exit size
- [ ] Verdict reported with evidence
