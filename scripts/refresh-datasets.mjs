// Refresh all datasets from their sources. Run daily via cron or launchd.
// Usage: node scripts/refresh-datasets.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const now = new Date().toISOString();

// ── x402 Service Registry ────────────────────────────────────────────────
async function refreshX402Services() {
  console.log("Refreshing x402 service registry...");
  const allServices = [];
  let offset = 0;
  while (allServices.length < 4000) {
    const r = await fetch(`https://api.agentic.market/v1/services?limit=100&offset=${offset}`);
    if (!r.ok) break;
    const d = await r.json();
    if (!d.services?.length) break;
    allServices.push(...d.services);
    offset += 100;
    await new Promise((r) => setTimeout(r, 200));
  }
  const dataset = {
    name: "x402 Service Registry",
    description: "All x402-paid services on Agentic.Market with pricing, endpoints, and networks.",
    version: now.slice(0, 10),
    updated_at: now,
    source: "Agentic.Market",
    total_services: allServices.length,
    records: allServices.map((s) => ({
      id: s.id, name: s.name, domain: s.domain, provider: s.provider,
      category: s.category, networks: s.networks || [],
      endpoint_count: (s.endpoints || []).length,
      endpoints: (s.endpoints || []).slice(0, 3).map((e) => ({
        url: e.url, price: e.price, scheme: e.scheme,
      })),
    })),
  };
  fs.writeFileSync(path.join(DATA_DIR, "x402-service-registry.json"), JSON.stringify(dataset, null, 2));
  console.log(`  x402 services: ${dataset.records.length}`);
}

// ── Token Contract Registry ──────────────────────────────────────────────
async function refreshTokenContracts() {
  console.log("Refreshing token contract registry...");
  const allCoins = [];
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!r.ok) break;
    const coins = await r.json();
    if (!coins.length) break;
    allCoins.push(...coins);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const dataset = {
    name: "Token Contract Registry",
    description: "Top 500 tokens by market cap with contract addresses across chains.",
    version: now.slice(0, 10),
    updated_at: now,
    source: "CoinGecko",
    records: allCoins.map((coin) => ({
      id: coin.id,
      symbol: (coin.symbol || "").toUpperCase(),
      name: coin.name,
      market_cap_rank: coin.market_cap_rank,
      market_cap_usd: coin.market_cap,
      price_usd: coin.current_price,
      change_24h_pct: coin.price_change_percentage_24h,
      chains: Object.fromEntries(
        Object.entries(coin.platforms || {}).filter(([_, addr]) => addr && addr !== "")
      ),
    })),
  };
  fs.writeFileSync(path.join(DATA_DIR, "token-contract-registry.json"), JSON.stringify(dataset, null, 2));
  console.log(`  token contracts: ${dataset.records.length}`);
}

// ── Solana Trending Pools ────────────────────────────────────────────────
async function refreshSolanaPools() {
  console.log("Refreshing Solana trending pools...");
  const allPools = [];
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=${page}`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    if (!r.ok) break;
    const d = await r.json();
    if (!d.data?.length) break;
    allPools.push(...d.data);
    await new Promise((r) => setTimeout(r, 500));
  }
  const dataset = {
    name: "Solana Trending DEX Pools",
    description: "Trending Solana DEX pools with liquidity, volume, and price data.",
    version: now.slice(0, 10),
    updated_at: now,
    source: "GeckoTerminal",
    records: allPools.map((pool) => {
      const attrs = pool.attributes || {};
      return {
        address: attrs.address, name: attrs.name,
        base_token: attrs.base_token_symbol, quote_token: attrs.quote_token_symbol,
        price_usd: attrs.base_token_price_usd, liquidity_usd: attrs.reserve_in_usd,
        volume_24h: attrs.volume_usd_24h, price_change_24h: attrs.price_change_percentage_24h,
        transactions_24h: attrs.transactions_24h,
        dex: pool.relationships?.dex?.data?.id,
      };
    }),
  };
  fs.writeFileSync(path.join(DATA_DIR, "solana-trending-pools.json"), JSON.stringify(dataset, null, 2));
  console.log(`  solana pools: ${dataset.records.length}`);
}

// ── Run all ──────────────────────────────────────────────────────────────
console.log(`Refreshing datasets at ${now}`);
try {
  await refreshX402Services();
  await refreshTokenContracts();
  await refreshSolanaPools();
  console.log("Done.");
} catch (e) {
  console.error("Refresh failed:", e.message);
  process.exit(1);
}