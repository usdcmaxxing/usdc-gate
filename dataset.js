// Sanctions & risk dataset — served as a paid x402 endpoint.
// Agents pay per download in USDC. Data is static (snapshot 2026-11-07).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DATASET = null;

function loadDataset() {
  if (DATASET) return DATASET;
  try {
    const raw = fs.readFileSync(path.join(__dirname, "data", "sanctions-risk-list.json"), "utf8");
    DATASET = JSON.parse(raw);
  } catch {
    DATASET = { records: [], error: "dataset unavailable" };
  }
  return DATASET;
}

export function getSanctionsDataset() {
  return loadDataset();
}

export function querySanctions(query) {
  const ds = loadDataset();
  if (!ds.records) return { error: "dataset unavailable" };

  const q = (query || "").toLowerCase();
  if (!q) return ds;

  const matches = ds.records.filter(
    (r) =>
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.type && r.type.toLowerCase().includes(q)) ||
      (r.asset && r.asset.toLowerCase().includes(q))
  );

  return {
    ...ds,
    query: q,
    match_count: matches.length,
    matches: matches.slice(0, 100),
  };
}