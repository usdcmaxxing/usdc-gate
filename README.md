# USDC Gate

**Pre-flight counterparty risk for USDC payments. USDC only.**

A paid API that an AI agent (or any client) calls *before* it sends USDC, to answer three
questions in one request:

1. **Is the counterparty real?** — is the asset actually Circle-native USDC on that chain?
2. **Is it safe to pay?** — is either address on Circle's **live, on-chain issuer blacklist**,
   or on the OFAC SDN list?
3. **Will it work?** — structural checks (self-send, amount policy, non-native asset).

The wedge is check #2: **Circle's `isBlacklisted(address)` is live on-chain state, readable at
any block height.** OFAC is a dated, downloadable snapshot — a floor, not a live signal. An
address frozen mid-relationship is invisible to a list check and obvious to an on-chain read.

---

## Why this exists

The x402 facilitator screens payments at **both verification and settlement**. A decline
returns `kyt_risk_detected` with a **403**, and it is **not retryable** — *"an address was
declined rather than a request, so the same buyer is declined again until they pay from a
different account."*

So for an autonomous agent, a failed payment is **invisible until it happens, and it is
unrecoverable.** The failure modes the x402 FAQ lists as most common are:

| Cause | Where it shows up | Pre-flight checkable? |
|---|---|---|
| Invalid signature | 402 retry | no |
| Amount mismatch (exact scheme is strict equality) | 402 retry | yes (policy) |
| **Insufficient USDC or flagged by KYT** | **403, non-retryable** | **yes — this service** |

`USDC Gate` is the pre-flight read that turns a silent 403 into a known condition.

---

## The USDC-specific insight

Circle's USDC (`FiatTokenV2`) exposes `isBlacklisted(address)`. When true, the address can
neither send **nor** receive USDC — `transfer`, `transferFrom`, `approve`, `mint` and `burn`
all revert. Circle can set it with a single `blacklist()` call, and has — for example, all
**91 ETH addresses** on the OFAC SDN list are blacklisted on the Ethereum USDC contract
(verified against the live contract; see `data/circle-blacklisted-ofac.json`).

Two traps the service handles:

- **Function-name trap:** USDC is `isBlacklisted`; USDT is `isBlackListed`. One letter.
- **Native vs bridged:** Circle can only freeze *native* USDC. Bridged/wrapped USDC has a
  different freeze surface. Screening logic that treats them as identical is wrong — so the
  verdict reports `asset.kind` and `freezable_by_issuer` explicitly.

---

## The flow layer (real chain history)

The issuer blacklist answers "is this address frozen *right now*?". The flow layer
answers "what does the money look like on the way in and out?" — the patterns that
x402 measurement studies found make up most fictitious settlement count.

`flow.js` pulls **USDC Transfer logs** for both addresses from two pluggable
sources, then derives:

| Check | What it catches | Verdict |
|---|---|---|
| `shared_funder` | A third party that funded both sides, or one party funding the other | HOLD |
| `mixer_exposure` | A counterparty on Circle's OFAC-derived SDN set, or a known mixer/privacy-pool contract | HOLD |
| `peel_chain` | ≥3 outgoing transfers of strictly decreasing size (money peeled through fresh addresses) | HOLD |
| `new_payee` | No USDC history at all in the window (proxy for a fresh address) | HOLD |

Two things worth knowing about the sources:

- **Blockscout** (richer — address metadata, pagination) is used when reachable.
  Base Sepolia works today; Base mainnet's Blockscout sits behind a bot wall, so
  production falls through to logs.
- **eth_getLogs** against a configurable RPC is the fallback. It is bounded to a
  block window (`FLOW_WINDOW_BLOCKS`, default 50,000 ≈ 2.8 days on Base) and
  shrinks automatically when a provider rejects the range.

Mixer contracts are **chain-bound** — the Tornado Cash 100 USDC pool on Ethereum
is not that pool on Base — so `data/mixers.json` carries a `chains` list and a
non-matching chain does not flag. OFAC SDN addresses are the opposite: sanctions
attach to the controller, not the chain, so they match on any EVM chain.

If history is unavailable the checks report `unknown` and never fail a verdict on
their own. Every verdict carries the raw evidence under `flow.evidence` (source,
coverage, window, hits) so a caller can audit the call rather than trust it.

---

## Files

| File | Purpose |
|---|---|
| `server.js` | Express + x402 middleware; the paid endpoint |
| `check.js` | Verdict logic (no x402 coupling) |
| `flow.js` | Real chain-history flow checks (Blockscout / eth_getLogs) |
| `usdc.js` | On-chain reads of `isBlacklisted`, token identity |
| `client.mjs` | x402 buyer — reads the 402, signs, retries |
| `demo.sh` | One-command end-to-end demo |
| `demo-verdict.mjs` | Runs the live verdict logic on real cases |
| `parse-ofac.mjs` | Builds the OFAC SDN snapshot from the official download |
| `data/ofac-sdn-digital.json` | 527 real OFAC SDN digital-currency addresses |
| `data/circle-blacklisted-ofac.json` | Which of those are Circle-blacklisted (all of them) |
| `data/mixers.json` | Curated EVM mixer / privacy-pool contracts (chain-bound) |
| `tests/` | Unit tests — verdict logic + flow engine, no network |
| `.env.example` | Configuration template |
| `.buyer` / `.seller` | Throwaway Base Sepolia keys for the demo (gitignored) |

---

## Run it

```bash
npm install
cp .env.example .env      # optional: set RPC / flow window / seller key
node parse-ofac.mjs       # build the OFAC snapshot (already committed in data/)
node server.js            # listens on :4021
npm test                  # 18 unit tests, no network
```

Or everything at once:

```bash
./demo.sh
```

### The paid endpoint

```
POST /v1/check-counterparty
Price: $0.02 USDC on Base Sepolia (eip155:84532)
```

```json
{ "payer": "0x…", "payee": "0x…", "chain": "base-sepolia", "asset": "0x…", "amount": "0.02" }
```

Response:

```json
{
  "verdict": "APPROVE | HOLD | REJECT",
  "reason_codes": [],
  "asset": { "kind": "native", "freezable_by_issuer": true, "contract": "0x…", "chain": "…" },
  "issuer_blacklist": {
    "chain": "base-sepolia",
    "payer": { "address": "0x…", "blacklisted": false, "at_block": "55593928" },
    "payee": { "address": "0x…", "blacklisted": false, "at_block": "55593928" },
    "contract": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "evidence": "eth_call isBlacklisted(address)"
  },
  "sanctions": {
    "list": "OFAC SDN",
    "snapshot_fetched_at": "2026-11-07T08:07:50.852Z",
    "addresses_in_snapshot": 527,
    "payer": null,
    "payee": null,
    "caveat": "Exact match against a dated OFAC download — a floor, not a live signal."
  },
  "flow": { "self_send": false, "shared_funder": false, "mixer_exposure": false },
  "policy": { "amount": "0.02", "ceiling": 100000, "floor": 0.000001 },
  "checked_at": "…"
}
```

Also free, ungated:

- `GET /v1/sample` — a static example verdict, so a buyer can see the shape before paying.
- `GET /health`
- `GET /` — service metadata

---

## The payment flow (what actually happens)

```
client                     server                    facilitator
  |  POST /v1/check-counterparty  |                         |
  |------------------------------>|                         |
  |                               | build 402 requirements   |
  |                               | (exact, $0.02, Base)    |
  |  402 + PAYMENT-REQUIRED hdr   |                         |
  |<------------------------------|                         |
  |  read challenge, sign EIP-3009 TransferWithAuthorization  |
  |  POST + PAYMENT-SIGNATURE     |                         |
  |------------------------------>|  verify + settle        |
  |                               |------------------------>|
  |                               |  ok / kyt_risk_detected |
  |  200 + verdict  (or 403)      |<------------------------|
  |<------------------------------|                         |
```

Observed on Base Sepolia with the public facilitator:

```
HTTP 402
PAYMENT-REQUIRED: {"x402Version":2,"accepts":[{"scheme":"exact","network":"eip155:84532",
                 "amount":"20000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                 "payTo":"0x9A04446dc4F72F61097093FeF4175211B384276f"}]}
```

`20000` atomic USDC = `$0.02`. No account, no API key, no gas token needed by the buyer
(EIP-3009 authorization; the facilitator pays gas).

---

## Seeing a real settlement

The demo buyer (`0xc7d6D4bb6956f25954f988449F23be01012b63fF`) is unfunded, so the live run
correctly returns the facilitator's real response:

```
{"error":"invalid_exact_evm_insufficient_balance"}
```

To see a full settle, fund that address with testnet USDC and re-run `./demo.sh`:

1. Go to **https://faucet.circle.com** (public, no account) → select **Base Sepolia** →
   paste `0xc7d6D4bb6956f25954f988449F23be01012b63fF` → claim 20 USDC.
2. `node client.mjs` → should return `HTTP 200` plus the live verdict JSON.

For mainnet, switch `X402_NETWORK` to `eip155:8453`, use a production facilitator, and fund
the wallet with real USDC on Base.

---

## Going to production

```bash
# Base mainnet
X402_NETWORK=eip155:8453 \
SELLER_PRIVATE_KEY=0x… \
FACILITATOR=<production facilitator> \
PRICE='$0.02' \
node server.js
```

Registration checklist (all free, do all of it):

- **x402 Bazaar** — ✅ done. The 402 carries a `bazaar` discovery extension
  (`declareDiscoveryExtension` + `bazaarResourceServerExtension`), so the
  endpoint's input/output schema is self-describing and facilitators can catalog
  it from the 402 alone. Verify with `curl -D - -o /dev/null -X POST …` and decode
  the `PAYMENT-REQUIRED` header.
- **Agent402 index** — submit the origin; their crawler probes it every 30 minutes.
- **MCP directories** — Glama, mcp.so, Smithery, MCP Marketplace (list as `type: "mcp"`).
- **ERC-8004** — register an agent identity so verdicts are attributable, then collect
  *grounded* feedback: every review references the x402 payment hash that proves the
  interaction happened. That is the fix for the known weakness of the Reputation Registry.

---

## Honest economics

This is a **volume product**, and agent-payment volume is currently thin. Independent
measurements put genuine agentic x402 commerce at roughly **$5,000–$11,000 per month across
the entire ecosystem**, and one population-scale study found the value that *"demonstrably
reaches a nameable service"* was **$187,861 over 280 days**, with a median lifetime revenue
of **$3.96** across recipients.

At `$0.02`/call, 50 calls/day is `$1/day`. So:

- **Do not** build this as a primary income stream on agent demand alone.
- **Do** sell it to human compliance / risk / agent-orchestration teams (USDC-paid, same
  backend) — that is the revenue line.
- **Do** give the agent endpoint away as the acquisition funnel and the data source.

The `flow` checks (`shared_funder`, `vanity_suffix_batch`, `closed_loop`, `mixer_exposure`)
are the patterns that measurement studies found make up the majority of x402 settlement
count — the difference between "manufacturability" and adoption. Wiring those to real
chain history is the next build.

---

## License

MIT. The OFAC snapshot is US government public-domain data.
