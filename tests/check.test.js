// Tests for the verdict logic. No network: the blacklist read and flow history
// are both injected. FLOW_ENABLED must be set before check.js is evaluated, so
// the import is dynamic (static imports hoist above the assignment).
import test from "node:test";
import assert from "node:assert/strict";

process.env.FLOW_ENABLED = "false";
const { checkCounterparty } = await import("../check.js");

const PAYER = "0x1111111111111111111111111111111111111111";
const PAYEE = "0x2222222222222222222222222222222222222222";
const NATIVE = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const OFAC_ADDR = "0x252a8bd2319d8a555b872990601221b3a2053bce"; // MESRI, Behzad (SDN)
const NON_NATIVE = "0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F";

const clean = () => ({
  blacklisted: false,
  checked_at_block: 1,
  contract: NATIVE,
  evidence: "mock",
  token: "mock",
});

const noBlacklist = async () => clean();

test("clean payment approves", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYEE, amount: "0.02" },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "APPROVE");
  assert.deepEqual(v.reason_codes, []);
  assert.equal(v.asset.kind, "native");
  assert.equal(v.issuer_blacklist.payer.blacklisted, false);
});

test("self-send rejects", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYER, amount: "0.02" },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "REJECT");
  assert.ok(v.reason_codes.includes("SELF_SEND"));
});

test("invalid address rejects", async () => {
  const v = await checkCounterparty(
    { payer: "0x123", payee: PAYEE, amount: "0.02" },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "REJECT");
  assert.ok(v.reason_codes.includes("INVALID_ADDRESS"));
});

test("non-native asset holds", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYEE, amount: "0.02", asset: NON_NATIVE },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "HOLD");
  assert.ok(v.reason_codes.includes("NON_NATIVE_USDC"));
  assert.equal(v.asset.freezable_by_issuer, false);
});

test("OFAC SDN match rejects", async () => {
  const v = await checkCounterparty(
    { payer: OFAC_ADDR, payee: PAYEE, amount: "0.02" },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "REJECT");
  assert.ok(v.reason_codes.includes("OFAC_SDN_MATCH"));
  assert.equal(v.sanctions.payer.name, "MESRI, Behzad");
});

test("issuer blacklist rejects", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYEE, amount: "0.02" },
    {
      isBlacklisted: async (chain, addr) => {
        const c = clean();
        return addr.toLowerCase() === PAYEE.toLowerCase()
          ? { ...c, blacklisted: true }
          : c;
      },
    }
  );
  assert.equal(v.verdict, "REJECT");
  assert.ok(v.reason_codes.includes("ISSUER_BLACKLISTED"));
});

test("amount over ceiling holds", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYEE, amount: "200000" },
    { isBlacklisted: noBlacklist }
  );
  assert.equal(v.verdict, "HOLD");
  assert.ok(v.reason_codes.includes("AMOUNT_OVER_CEILING"));
});

test("blacklist read failure holds rather than rejecting", async () => {
  const v = await checkCounterparty(
    { payer: PAYER, payee: PAYEE, amount: "0.02" },
    {
      isBlacklisted: async () => {
        throw new Error("rpc down");
      },
    }
  );
  assert.equal(v.verdict, "HOLD");
  assert.ok(v.reason_codes.includes("ISSUER_READ_FAILED"));
});
