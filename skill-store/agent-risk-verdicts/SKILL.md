---
name: agent-risk-verdicts
description: "Underwrite AI agent risk with signed on-chain evidence: settlement attestation, credit tiers, and parametric triggers composed into one EIP-712 verdict a lender, insurer, or bonder can verify offline."
version: 1.0.0
author: toolweather
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [agent-risk, underwriting, eip712, x402, usdc, credit, insurance, bonding, oracles]
    related_skills: []
---

# Agent risk verdicts

Every agent-risk product — credit, insurance, bonding, escrow — needs a *measured,
verifiable* answer to two questions: **how risky is this agent, and did this payment
settle?** This skill shows how to build the oracle that answers both, in one signed
verdict.

It is written for founders and engineers building agent-risk infrastructure, not for
traders. It is a design and implementation guide, not legal, insurance, or investment
advice.

## The problem

- **Agents have income and no credential.** Agents earn on-chain income for the first
  time (x402 receipts), but that history is self-reported and therefore worthless to a
  lender or insurer.
- **Lenders cannot underwrite agents.** DeFi lending demands 1.25–1.43x collateral
  because agent cash flow is unverified. The on-chain credit oracles that exist are
  analytics, not wired to an enforceable limit.
- **Carriers have capacity and no trigger.** Parametric agent-insurance capacity exists,
  but a policy that pays in 30 seconds needs a neutral party to say *"this failure
  happened, here is the signed proof."*

The scarce resource is not capital or models. It is **proof**.

## The pattern: three oracles, one verdict

Do not build one monolithic risk score. Build three narrow oracles with separate keys
and separate failure modes, then compose them:

| Oracle | Question it answers | Primitive |
|---|---|---|
| **Settlement** | Did this USDC payment actually settle, and was it paid twice? | On-chain read of the Transfer + payee/amount match |
| **Credit** | What is this agent's verified history? | Score + tier from settled payments and defaults |
| **Trigger** | Did a verifiable failure condition occur? | Condition check against settlement evidence |

A **verdict** composes all three into one EIP-712 signed payload. One integration for
the buyer, and each layer can be swapped or re-priced independently.

## The three decision rules

Keep the decision logic explainable — a regulator or a judge should be able to follow
it:

1. A payment that did not settle is a **default**.
2. A score below the floor is a **reject**.
3. Otherwise **approve** with terms derived from the score (limit, rate, LTV).

No black-box model in the decision path. If you cannot state the rule in one sentence,
it does not belong in the verdict.

## Build order

1. **Settlement attestation first.** Verify the on-chain fact before anything else.
   Read the Transfer event, match `from`/`to`/`value` against the claim, and flag
   duplicate `txHash` reuse. This is the highest-value oracle and the easiest to get
   right.
2. **Credit from verified history only.** Score from settled payments and observed
   defaults. Never from self-reported claims, social reputation, or "trust".
3. **Trigger last.** A trigger is only as good as the settlement evidence it reads.
4. **Compose into the verdict.** Sign once, with the oracle key, over the normalized
   payload.

## EIP-712 signed verdicts

Sign a typed structure, not a JSON blob. The typehashes are part of the interface.

```ts
const domain = {
  name: 'AgentRisk',
  version: '1',
  chainId: 8453,               // Base
  verifyingContract: ORACLE_ADDRESS,
};

const types = {
  RiskVerdict: [
    { name: 'agent', type: 'address' },
    { name: 'score', type: 'uint8' },
    { name: 'tier', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'settled', type: 'bool' },
    { name: 'maxExposureUsd', type: 'uint256' },   // atomic USDC, 6 dp
    { name: 'annualRateBps', type: 'uint256' },
    { name: 'issuedAt', type: 'uint64' },
  ],
};
```

Rules that save debugging time:

- **Convert bigints before JSON.** Typed-data messages carry `uint256` as `bigint`;
  `JSON.stringify` throws. Stringify on the way out, revive on the way in.
- **`recoverTypedDataAddress` returns a promise.** `await` it. Forgetting is the
  classic "signature recovery failed" bug that looks like cryptography but is a type
  error.
- **Cross-check the digest.** Verify your `hashTypedData` against an independent
  implementation AND against the Solidity contract's `_hashTypedDataV4`. A placeholder
  typehash silently breaks on-chain verification.
- **Expose a verify endpoint.** Recover the signer from the signature and compare it to
  the published oracle address. `matchesOracle: true` is the whole trust model.

## Verifying offline

Anyone should be able to verify a verdict with no account and no API key:

```bash
curl -X POST <oracle>/v1/verify \
  -H 'content-type: application/json' \
  -d '{"typedData": {...}, "signature": "0x..."}'
```

The recovered address must equal the oracle address. If it does not, the verdict is
forgeable and worthless.

## Serving it as a paid API

- Charge per verdict in atomic USDC (6 dp). Verdicts are high-value, low-frequency, and
  the buyer is a business, not a consumer.
- Give away the **dossier** (the unsigned risk picture) for free. It is the credential
  an agent carries to a lender, and it is your distribution.
- Keep the paid route behind an x402 `exact` challenge, and serve the 402 at the origin
  root as well as the paid route — directories and consoles probe the root.

## Failure modes

- **Self-reported input.** If the agent supplies the evidence, the verdict is
  advertising. Read the chain.
- **Oracle key compromise.** One key signs everything. Rotate, and publish the address
  so buyers can pin it.
- **Stale settlement.** A payment that settled last week is not a payment that settled
  now. Bound the evidence window and say so in the verdict.
- **Unexplainable decisions.** A score with no stated rule is a liability.

## Checklist

- [ ] Settlement read matches `from`/`to`/`value`, not just `txHash` presence
- [ ] Duplicate payment flagged
- [ ] Credit score derived only from verified on-chain history
- [ ] Decision logic expressible as three rules
- [ ] EIP-712 typed data, bigints stringified, digest cross-checked
- [ ] Verify endpoint recovers the oracle address
- [ ] Free dossier route for distribution; paid verdict route behind x402
- [ ] Scope note: not legal, insurance, or investment advice
