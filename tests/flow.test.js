// Tests for the flow engine. All chain history is mocked — no network.
import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFlow,
  summarize,
  detectPeelChain,
  counterpartyRisk,
  mixers,
  ofacEvm,
} from "../flow.js";

const PAYER = "0x1111111111111111111111111111111111111111";
const PAYEE = "0x2222222222222222222222222222222222222222";
const FUNDER = "0x3333333333333333333333333333333333333333";
const OFAC_ADDR = "0x252a8bd2319d8a555b872990601221b3a2053bce"; // MESRI, Behzad (SDN)
const MIXER = "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D"; // Tornado 100 USDC (ethereum)

const row = (from, to, value, block) => ({
  from,
  to,
  value: BigInt(value),
  blockNumber: block,
  txHash: `0xtx${block}`,
  timestamp: null,
  source: "mock",
  chain: "base-sepolia",
});

/** Build a fetchTransfers replacement from a per-address row map. */
function mockFetch(map) {
  return async (_chain, address) => ({
    rows: map[address.toLowerCase()] || [],
    source: "mock",
    error: null,
  });
}

test("shared funder: a third party funded both sides", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({
      [PAYER]: [row(FUNDER, PAYER, 1000, 10)],
      [PAYEE]: [row(FUNDER, PAYEE, 1000, 11)],
    }),
  });
  assert.equal(f.shared_funder.flag, true);
  assert.deepEqual(f.shared_funder.addresses, [FUNDER]);
});

test("shared funder: one party paid the other directly", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({
      [PAYER]: [row(PAYER, PAYEE, 1000, 10)],
    }),
  });
  assert.equal(f.shared_funder.flag, true);
  assert.equal(f.shared_funder.direct, true);
});

test("mixer exposure: sanctioned funder is flagged on any chain", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({
      [PAYER]: [row(OFAC_ADDR, PAYER, 1000, 10)],
    }),
  });
  assert.equal(f.mixer_exposure.flag, true);
  assert.equal(f.mixer_exposure.hits[0].kind, "ofac_sdn");
  assert.equal(f.mixer_exposure.hits[0].direction, "payer_funder");
});

test("mixer exposure: mixer contract is chain-bound", () => {
  const onEth = counterpartyRisk(MIXER, "ethereum");
  const onBase = counterpartyRisk(MIXER, "base");
  assert.equal(onEth?.applies, true);
  assert.equal(onBase?.applies, false, "an Ethereum mixer address is not a mixer on Base");
});

test("peel chain: strictly decreasing outgoing transfers", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({
      [PAYER]: [
        row(PAYER, "0x4444444444444444444444444444444444444444", 1000, 10),
        row(PAYER, "0x5555555555555555555555555555555555555555", 700, 11),
        row(PAYER, "0x6666666666666666666666666666666666666666", 300, 12),
      ],
    }),
  });
  assert.equal(f.peel_chain.flag, true);
  assert.equal(f.peel_chain.length, 3);
});

test("no peel chain when amounts rise", () => {
  const rows = [
    row(PAYER, "0x4444444444444444444444444444444444444444", 100, 10),
    row(PAYER, "0x5555555555555555555555555555555555555555", 700, 11),
    row(PAYER, "0x6666666666666666666666666666666666666666", 900, 12),
  ];
  assert.equal(detectPeelChain(rows, PAYER).flag, false);
});

test("new payee proxy: no USDC history in the window", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({
      [PAYER]: [row(FUNDER, PAYER, 1000, 10)],
    }),
  });
  assert.equal(f.new_payee.flag, true);
});

test("no history at all: coverage none, no flags", async () => {
  const f = await analyzeFlow("base-sepolia", PAYER, PAYEE, {
    fetchTransfers: mockFetch({}),
  });
  assert.equal(f.coverage, "none");
  assert.equal(f.shared_funder.flag, false);
  assert.equal(f.mixer_exposure.flag, false);
  assert.equal(f.new_payee, null);
});

test("summarize counts counterparties once per unique address", () => {
  const rows = [
    row(FUNDER, PAYER, 10, 1),
    row(FUNDER, PAYER, 20, 2),
    row(PAYER, PAYEE, 5, 3),
  ];
  const s = summarize(rows, PAYER);
  assert.equal(s.transfers_in, 2);
  assert.equal(s.transfers_out, 1);
  assert.deepEqual(s.funders, [FUNDER]);
  assert.deepEqual(s.spends, [PAYEE]);
});

test("static data loads: mixers and OFAC EVM addresses", () => {
  assert.ok(mixers().size >= 5);
  assert.ok(ofacEvm().size >= 90);
});
