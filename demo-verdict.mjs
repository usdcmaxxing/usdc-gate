// Show the live verdict logic running (no payment needed — this calls the
// check directly, the same function the paid endpoint calls).
import { checkCounterparty } from "./check.js";
import fs from "node:fs";

const seller = fs.readFileSync(".seller", "utf8").split("\n")[1].trim();
const buyer = fs.readFileSync(".buyer", "utf8").split("\n")[1].trim();

// A real OFAC SDN ETH address (MESRI, Behzad) — from the official SDN list.
const sanctioned = "0x252a8bd2319d8a555b872990601221b3a2053bce";

const cases = [
  {
    label: "clean counterparty (buyer paying seller)",
    body: { payer: buyer, payee: seller, amount: "0.02" },
  },
  {
    label: "sanctioned payer (real OFAC SDN address)",
    body: { payer: sanctioned, payee: seller, amount: "0.02" },
  },
  {
    label: "self-send",
    body: { payer: buyer, payee: buyer, amount: "0.02" },
  },
  {
    label: "non-native asset",
    body: { payer: buyer, payee: seller, amount: "0.02", asset: "0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F" },
  },
];

for (const c of cases) {
  const r = await checkCounterparty(c.body);
  console.log("=".repeat(70));
  console.log("CASE:", c.label);
  console.log("verdict:", r.verdict, "| reason_codes:", JSON.stringify(r.reason_codes));
  console.log("asset.kind:", r.asset?.kind, "| freezable_by_issuer:", r.asset?.freezable_by_issuer);
  console.log(
    "issuer_blacklist:",
    r.issuer_blacklist?.error
      ? r.issuer_blacklist.error
      : JSON.stringify({
          payer: r.issuer_blacklist?.payer?.blacklisted,
          payee: r.issuer_blacklist?.payee?.blacklisted,
          block: r.issuer_blacklist?.payer?.at_block,
          contract: r.issuer_blacklist?.contract,
        })
  );
  console.log(
    "sanctions:",
    JSON.stringify({
      payer: r.sanctions?.payer?.name ?? null,
      payee: r.sanctions?.payee?.name ?? null,
      snapshot: r.sanctions?.addresses_in_snapshot,
    })
  );
}
