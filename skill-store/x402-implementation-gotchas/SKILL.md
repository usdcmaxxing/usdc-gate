---
name: x402-implementation-gotchas
description: "Build and publish paid x402 APIs on Cloudflare Workers: viem RPC reads, EIP-712 signing, openapi/payment headers, and the silent gotchas that break them."
version: 1.1.0
author: toolweather
license: MIT
platforms: [macos, linux]
metadata:
  hermes:
    tags: [x402, viem, cloudflare-workers, eip712, payments, agents]
    related_skills: []
---

# Building x402 services

A paid x402 API = Hono app + `@x402`-style manual middleware (or
`@x402/express`) + a viem chain read + an oracle key for signing. This
skill covers the **implementation gotchas** that cost real debugging time.

## 1. viem's `getLogs` silently ignores a bare `topics` array

`client.getLogs({ address, topics: [TRANSFER_TOPIC, ...] })` sends an
**UNFILTERED** query. viem only builds topics from an ABI `event` (plus
optional indexed `args`); the `topics` field is typed but never used.

Symptom: a public RPC rejects the query with "query exceeds max results
20000", or you get back far more logs than expected.

```ts
// WRONG — topics dropped, unfiltered query
await client.getLogs({ address: usdc, topics: [TRANSFER_TOPIC, toTopic(payer)] });

// RIGHT — viem encodes the topic from the ABI event + indexed args
await client.getLogs({
  address: usdc,
  event: TRANSFER_EVENT,          // { type:'event', name:'Transfer', inputs:[...] } as const
  args: { from: payer },          // indexed param → topics[1]
  fromBlock,
  toBlock,
});
```

When you only need the signature filter, pass `event` with no `args`.

## 2. Public Base RPCs rate-limit `eth_getLogs`

`https://mainnet.base.org` returns **429 "request limit reached"** on
`eth_getLogs` almost immediately. Even permissive endpoints cap result width
(publicnode: 20,000 logs) and reject wide ranges.

Build a **pool**: try the primary, fall through to the backups on any error.

```ts
async function withPool<T>(urls: string[], fn: (c: PublicClient) => Promise<T>): Promise<T> {
  let lastErr: any = null;
  for (const url of urls) {
    try { return await fn(node(url)); } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("no RPC configured");
}
```

Working public endpoints observed 2026-11: `base-rpc.publicnode.com`,
`rpc.ankr.com/base`, `base.drpc.org` (drpc returned 400 on one probe — keep it
as a later fallback, not the primary). In production, put a paid provider
first. Bound the window (≤24h) and shrink it when the RPC rejects the range.

Note: `getTransactionReceipt` for **old** transactions can return
"Archive requests require a personal token" on some public endpoints. Treat
that as `not_found`, not a crash — and surface the reason in the evidence.

## 3. EIP-712 typed data with bigints breaks `JSON.stringify`

Typed data messages carry `bigint` for `uint256` fields. Returning them
straight from `c.json()` / `res.json()` throws **"Do not know how to serialize
a BigInt"** — often caught by a broad try/catch and misreported as a chain
error.

Convert on the way out, revive on the way in:

```ts
export function toJSONTypedData(td: any): any {
  return JSON.parse(JSON.stringify(td, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function reviveTypedData(td: any): any {
  const types: Record<string, { name: string; type: string }[]> = td.types ?? {};
  const revive = (typeName: string, value: any): any => {
    const fields = types[typeName];
    if (!fields || value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((v) => revive(typeName, v));
    const out: any = {};
    for (const f of fields) {
      const v = value[f.name];
      if (v === undefined) continue;
      if (/^u?int/.test(f.type)) out[f.name] = typeof v === "bigint" ? v : BigInt(v);
      else if (types[f.type]) out[f.name] = revive(f.type, v);   // nested struct
      else out[f.name] = v;
    }
    return out;
  };
  return { ...td, message: revive(td.primaryType, td.message) };
}
```

Test the round-trip: sign → serialize → revive → recover must equal the
original digest. Without that test, the verify endpoint silently breaks.

**Cross-check the digest against an independent implementation.** viem's
`hashTypedData` should be verified against a spec implementation AND against
the Solidity contract's `_hashTypedDataV4` digest — the typehashes are part of
the interface, and a placeholder constant silently breaks on-chain
verification.

## 4. `recoverTypedDataAddress` returns a PROMISE

`await` it. Forgetting the await is the classic "signature recovery failed"
bug that looks like a cryptography problem but is a type error.

## 5. x402 v2 payment headers

- The challenge goes in **`PAYMENT-REQUIRED`** (base64) *and* the JSON body.
- The client retries with **`PAYMENT-SIGNATURE`** (v2). v1 used `X-PAYMENT`.
  Accept both.
- `btoa`/`atob` throw on non-Latin1 characters — use a UTF-8-safe base64
  helper (TextEncoder → binary string → btoa).
- **Check payment before validating input.** A 400 on an empty probe is a
  failed health check for the vAPI console and the x402 probes.
- Amounts are **atomic USDC (6 dp)**: `1000` = `$0.001`.
- Serve 402 at the origin root `/` too — the console probes it.
- `/.well-known/x402` uses `version: 1`, NOT `x402Version`.

## 6. Cloudflare Workers env bindings

Workers do **not** expose vars/secrets via `process.env` — they arrive as
bindings on the `fetch` handler. The Worker entry must push them into config
on every request (`process.env` stays as the Node/local fallback):

```ts
export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    setWorkerEnv(env);
    return app.fetch(request, env as any, ctx as any);
  },
};
```

Keep credentials in your platform's own credential store and out of the repo;
never commit them, and rotate any that were ever exposed.

## 7. Testing the paid flow without a funded wallet

Point the service at a local stub of the facilitator that returns a
deterministic valid response, and exercise the real payment gate locally:

```bash
node scripts/stub-facilitator.mjs 4399     # local stub: { isValid: true }
X402_FACILITATOR=http://localhost:4399 npm run dev
```

Then run an HTTP test through the full gate → chain read → sign → verify path
with a locally signed payload. For the deployed Worker you can only test the
free routes plus a real `/v1/verify` signature (the paid routes need a funded
wallet).

Make HTTP tests **discover** a recent on-chain tx rather than hardcoding one —
a hardcoded tx ages out of the window and the test fails for the wrong reason.

## 8. Publishing to the vAPI Network

The console probes the origin, so a service that only 402s its paid routes
fails onboarding. Everything below has to be right before `vapi check` passes:

- **402 must carry the x402 v2 `exact` scheme** in BOTH the JSON body and a
  base64 `PAYMENT-REQUIRED` header, with CORS exposing `PAYMENT-REQUIRED` and
  `PAYMENT-RESPONSE`.
- **`/openapi.json`** needs `info.title` / `info.version`, `servers`, and each
  paid op with `x-payment-info` (flat: `scheme`, `network`, `amount`, `asset`,
  `payTo`, `maxTimeoutSeconds`, `extra`) plus
  `price: {mode:'fixed', currency:'USD', amount:'<decimal>'}` and a `402`
  response.
- **`/.well-known/x402`** must use the field `version: 1` (NOT `x402Version`).
- **Serve 402 at the origin root `/` too** — the console probes it.
- **Bazaar metadata** (`resource.serviceName`, `resource.tags`,
  `extensions.bazaar.{info,schema}`) avoids `bazaar_metadata_missing`.
- `vapi check <url>` is authoritative; the console Check button is stricter.
  It warns when `/openapi.json` omits a path that exists (e.g. `GET /`) —
  declare every probed path with `x-payment-info`.

Publish with:

```bash
vapi publish <url>/openapi.json --mode openapi \
  --name ... --description ... --category ... --yes
```

Publishing needs a vAPI API key (create at https://api.vapinetwork.ai/account,
then `vapi auth set-key` — interactive, so an agent cannot do it). Runtime
x402 amounts are atomic USDC (6 dp): `5000` = `$0.005`.

## Checklist

- [ ] `getLogs` uses `event` + `args`, never a bare `topics`
- [ ] RPC pool with fallbacks; window bounded
- [ ] Typed data JSON round-trip tested
- [ ] `recoverTypedDataAddress` awaited
- [ ] Payment checked before input validation
- [ ] 402 at `/` and the paid routes, with `PAYMENT-REQUIRED`
- [ ] Worker env bridging in the entry
- [ ] Free routes work without payment; paid routes 402 without it
