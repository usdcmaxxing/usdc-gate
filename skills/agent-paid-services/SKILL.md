---
name: agent-paid-services
description: "Build paid services for AI agents with x402 and USDC."
version: 1.0.0
author: finder
license: MIT
metadata:
  hermes:
    tags: [x402, usdc, agent-payments, crypto, api, monetization]
    related_skills: []
---

# Agent-paid-services

Building a service that AI agents pay for, per call, in crypto (x402 + USDC).

## When to Use

Use when building or extending a service that AI agents pay for per call — an x402 endpoint,
a USDC risk/compliance check, a paid API for agent commerce, or the free funnel that feeds it.
Also use when deciding whether such a service is worth building (see the economics section).

## The model

- The seller exposes an HTTP endpoint protected by x402. The buyer gets a 402 with a payment
  challenge, signs an EIP-3009 `TransferWithAuthorization`, and retries; a facilitator verifies
  and settles.
- The seller **never custodies funds** — it names a `payTo` address. The buyer signs; the
  facilitator pays gas.
- A decline at verification is a **403 and non-retryable**: the same buyer is refused until they
  pay from a different account. That is the wedge for a pre-flight risk check.

## Build order

1. **Seller wallet = an address, not a key.** The server only puts `payTo` into the requirements;
   it never signs with it. Run with `PAY_TO=0x…` and keep the private key offline. Deriving the
   address from a key is a convenience, not a requirement.
2. **Resource server**: `x402ResourceServer(facilitatorClient).register(network, new
   ExactEvmScheme())`, then `paymentMiddleware(routes, resourceServer)`. Initialize the
   facilitator before serving; a failed init is a warning, not a crash.
3. **Paid route**: `accepts: [{scheme:"exact", price:"$0.02", network:"eip155:84532",
   payTo}]`. Price is a display string; the on-chain amount is atomic units (`20000` = $0.02
   USDC).
4. **Discovery (Bazaar)**: `declareDiscoveryExtension({method, input, inputSchema, bodyType,
   output})` returns `{bazaar: …}`; put it in the route's `extensions`, register
   `bazaarResourceServerExtension` on the server, and wrap the facilitator client with
   `withBazaar`. The 402 then carries the endpoint's input/output schema, so crawlers catalog it
   from the challenge alone.
5. **Free funnel**: a stdio MCP server exposing the check as a tool, rate-limited, whose response
   points production traffic at the paid endpoint. Agents are the acquisition channel, not the
   revenue line.

## Risk layer (the actual product)

- **Live on-chain reads beat snapshots.** Circle's `isBlacklisted(address)` is live issuer state
  at any block; an OFAC SDN download is a dated floor. Read the live layer, report the snapshot
  as a floor.
- **Chain-bound vs controller-bound.** A mixer contract on one chain is not that mixer on
  another — tag mixer addresses with chains. Sanctions attach to the controller, so an SDN
  address matches on any EVM chain.
- **Flow checks from real history**: shared funder (a third party that funded both sides),
  mixer/sanctioned counterparties, peel chains (≥3 strictly decreasing outgoing transfers),
  fresh-address proxies. Pull USDC Transfer logs from Blockscout when reachable, else
  `eth_getLogs` with a bounded block window.
- Every verdict carries the raw evidence (source, coverage window, hits) — an auditable call,
  not a black box.

## Economics

This is a volume product and agent-payment volume is thin. Sell the same backend to human
compliance/risk/orchestration teams; give the agent endpoint away as the funnel and the data
source.

## Pitfalls

- The facilitator must be initialized before serving; a missing facilitator means no 402s.
- Testnet vs mainnet: `X402_NETWORK=eip155:84532` (Base Sepolia) vs `eip155:8453` (Base). The
  native USDC address differs per chain — screen the chain explicitly and report `asset.kind`
  (native vs bridged).
- If the check is the product, a non-retryable 403 is the failure mode you are selling against:
  the pitch is "know before you pay".
- Keep the paid endpoint and the free funnel as separate surfaces with separate ledgers; never
  let the free tool become the product.
