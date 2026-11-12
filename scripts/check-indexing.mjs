// Check indexing status across all directories.
// Usage: node scripts/check-indexing.mjs

const ORIGIN = "https://usdc-gate-live.vercel.app";

const checks = [];

// Agentic.Market
try {
  const r = await fetch(`https://api.agentic.market/v1/services/search?q=usdc-gate&limit=10`);
  const d = await r.json();
  const found = d.services?.some(s => s.domain === "usdc-gate-live.vercel.app");
  checks.push({ platform: "Agentic.Market", indexed: !!found, details: found ? "Found" : "Not found" });
} catch (e) {
  checks.push({ platform: "Agentic.Market", indexed: false, details: e.message });
}

// CDP Bazaar
try {
  const r = await fetch(`https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?query=${encodeURIComponent(ORIGIN)}`);
  const d = await r.json();
  const found = d.resources?.some(x => x.url?.includes("usdc-gate"));
  checks.push({ platform: "CDP Bazaar", indexed: !!found, details: found ? `${d.resources.length} resources` : "Not found" });
} catch (e) {
  checks.push({ platform: "CDP Bazaar", indexed: false, details: e.message });
}

// x402scan
try {
  const r = await fetch(`https://x402scan.com/api/v1/services?origin=${encodeURIComponent(ORIGIN)}`);
  const d = await r.json();
  const found = d.services?.length > 0;
  checks.push({ platform: "x402scan", indexed: !!found, details: found ? `${d.services.length} services` : "Not found" });
} catch (e) {
  checks.push({ platform: "x402scan", indexed: false, details: e.message });
}

// Agent402
try {
  const r = await fetch(`https://agent402.tools/api/index/status?origin=${encodeURIComponent(ORIGIN)}`);
  const d = await r.json();
  checks.push({ platform: "Agent402", indexed: !!d.registered, details: d.registered ? "Registered" : "Not registered" });
} catch (e) {
  checks.push({ platform: "Agent402", indexed: false, details: e.message });
}

console.log(`\nIndexing status for ${ORIGIN}\n`);
for (const c of checks) {
  console.log(`${c.indexed ? "✅" : "❌"} ${c.platform.padEnd(16)} ${c.details}`);
}

const indexed = checks.filter(c => c.indexed).length;
console.log(`\n${indexed}/${checks.length} platforms indexed`);