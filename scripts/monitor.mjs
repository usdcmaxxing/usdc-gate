// Health monitor — checks the live service and reports status.
// Usage: node scripts/monitor.mjs
// Can be run via cron every 15 minutes.

const ORIGIN = process.env.PUBLIC_ORIGIN || "https://usdc-gate-live.vercel.app";

const checks = [
  { name: "health", path: "/health", expect: 200 },
  { name: "catalog", path: "/catalog", expect: 200 },
  { name: "dashboard", path: "/dashboard", expect: 200 },
  { name: "stats", path: "/v1/stats", expect: 200 },
  { name: "llms.txt", path: "/llms.txt", expect: 200 },
  { name: "openapi", path: "/openapi.json", expect: 200 },
  { name: "x402 manifest", path: "/.well-known/x402", expect: 200 },
  { name: "agent card", path: "/.well-known/agent.json", expect: 200 },
];

let failures = 0;
const results = [];

for (const check of checks) {
  try {
    const start = Date.now();
    const res = await fetch(`${ORIGIN}${check.path}`, { signal: AbortSignal.timeout(10000) });
    const ms = Date.now() - start;
    const ok = res.status === check.expect;
    if (!ok) failures++;
    results.push({ name: check.name, path: check.path, status: res.status, ok, ms });
    console.log(`${ok ? "✅" : "❌"} ${check.name.padEnd(16)} ${res.status} ${ms}ms`);
  } catch (e) {
    failures++;
    results.push({ name: check.name, path: check.path, status: "ERR", ok: false, error: e.message });
    console.log(`❌ ${check.name.padEnd(16)} ERROR ${e.message}`);
  }
}

// Summary
console.log(`\n${failures === 0 ? "✅ All checks passed" : `❌ ${failures} check(s) failed`}`);

// Write status to a file for dashboard use
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statusFile = path.join(__dirname, "..", "data", "monitor-status.json");
fs.writeFileSync(statusFile, JSON.stringify({
  checked_at: new Date().toISOString(),
  origin: ORIGIN,
  failures,
  results,
}, null, 2));

process.exit(failures > 0 ? 1 : 0);