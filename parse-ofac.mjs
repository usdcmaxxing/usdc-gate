// Parse the official OFAC SDN list into a JSON snapshot of digital-currency addresses.
// Source: https://www.treasury.gov/ofac/downloads/sdn.csv
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "data", "sdn.csv"), "utf8");

const out = [];
const re = /Digital Currency Address - ([A-Z0-9]+) ([0-9a-zA-Z]+)/g;
const nameRe = /^\d+,"([^"]*)"/;

for (const line of src.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const nm = line.match(nameRe);
  const name = nm ? nm[1] : "";
  let mm;
  while ((mm = re.exec(line)) !== null) {
    out.push({ asset: mm[1], address: mm[2], name, list: "OFAC SDN" });
  }
}

const eth = out.filter((r) => r.asset === "ETH");
const byAsset = out.reduce((a, r) => ((a[r.asset] = (a[r.asset] || 0) + 1), a), {});

fs.writeFileSync(
  path.join(__dirname, "data", "ofac-sdn-digital.json"),
  JSON.stringify(
    {
      source: "https://www.treasury.gov/ofac/downloads/sdn.csv",
      fetched_at: new Date().toISOString(),
      total_addresses: out.length,
      by_asset: byAsset,
      records: out,
    },
    null,
    2
  )
);

console.log("total digital addresses:", out.length);
console.log("by asset:", JSON.stringify(byAsset));
console.log("ETH addresses:", eth.length);
console.log("sample ETH:", JSON.stringify(eth.slice(0, 6).map((e) => `${e.address} (${e.name})`), null, 2));
