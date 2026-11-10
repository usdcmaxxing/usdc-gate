// Token Price Oracle — fetches current prices from CoinGecko (free, no key needed).
// Returns USD price + 24h change for any token by symbol or CoinGecko ID.

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Common symbol → CoinGecko ID mapping
const SYMBOL_MAP = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  DOT: "polkadot",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  ARB: "arbitrum",
  OP: "optimism",
  BASE: "base",
};

export async function getTokenPrice(symbolOrId) {
  const key = symbolOrId.toUpperCase();
  const id = SYMBOL_MAP[key] || symbolOrId.toLowerCase();

  const url = `${COINGECKO_BASE}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();

  if (!data[id]) {
    throw new Error(`Unknown token: ${symbolOrId}`);
  }

  const info = data[id];
  return {
    token: symbolOrId,
    coingecko_id: id,
    price_usd: info.usd,
    change_24h_pct: info.usd_24h_change ?? null,
    market_cap_usd: info.usd_market_cap ?? null,
    fetched_at: new Date().toISOString(),
    source: "coingecko",
  };
}

export async function getMultiplePrices(symbols) {
  const ids = symbols.map((s) => SYMBOL_MAP[s.toUpperCase()] || s.toLowerCase());
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();

  return symbols.map((s) => {
    const id = SYMBOL_MAP[s.toUpperCase()] || s.toLowerCase();
    const info = data[id];
    return info
      ? { token: s, price_usd: info.usd, change_24h_pct: info.usd_24h_change ?? null }
      : { token: s, error: "not found" };
  });
}