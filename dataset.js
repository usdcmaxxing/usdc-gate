// Dataset loader — serves paid datasets via x402.
// Each dataset is a JSON file in data/. Agents pay per download in USDC.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CACHE = new Map();

function load(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  let data;
  try {
    const raw = fs.readFileSync(path.join(__dirname, "data", `${name}.json`), "utf8");
    data = JSON.parse(raw);
  } catch {
    data = { error: "dataset unavailable" };
  }
  CACHE.set(name, data);
  return data;
}

function query(dataset, q) {
  if (!dataset.records) return dataset;
  const needle = (q || "").toLowerCase();
  if (!needle) return dataset;
  const matches = dataset.records.filter((r) => {
    const hay = JSON.stringify(r).toLowerCase();
    return hay.includes(needle);
  });
  return {
    ...dataset,
    query: needle,
    match_count: matches.length,
    matches: matches.slice(0, 200),
  };
}

// ── Dataset definitions ──────────────────────────────────────────────────

export function getSanctionsDataset(q) {
  return query(load("sanctions-risk-list"), q);
}

export function getMemecoinShadowBook(q) {
  return query(load("memecoin-shadow-book"), q);
}

export function getMemecoinSignals(q) {
  return query(load("memecoin-signals"), q);
}

export function getMemecoinFilterAttribution(q) {
  return query(load("memecoin-filter-attribution"), q);
}

export function getTokenContractRegistry(q) {
  return query(load("token-contract-registry"), q);
}

// List all available datasets (free — lets agents discover what we sell)
export function listDatasets() {
  return {
    datasets: [
      {
        id: "sanctions-risk-list",
        endpoint: "/v1/dataset/sanctions",
        price: "$0.01",
        records: 623,
        description: "OFAC SDN + Circle blacklist + mixers",
      },
      {
        id: "memecoin-shadow-book",
        endpoint: "/v1/dataset/memecoin-shadow-book",
        price: "$0.01",
        records: 2969,
        description: "2,969 memecoin picks with outcomes (survivorship-bias-free)",
      },
      {
        id: "memecoin-signals",
        endpoint: "/v1/dataset/memecoin-signals",
        price: "$0.01",
        records: 24,
        description: "Historical memecoin trading signals with entry/exit/P&L",
      },
      {
        id: "memecoin-filter-attribution",
        endpoint: "/v1/dataset/memecoin-filter-attribution",
        price: "$0.01",
        records: 24,
        description: "Filter attribution analysis (liquidity, venue, post-age)",
      },
      {
        id: "token-contract-registry",
        endpoint: "/v1/dataset/token-contracts",
        price: "$0.01",
        records: 100,
        description: "Top 100 tokens by market cap with contract addresses",
      },
    ],
  };
}