import { withRetry } from "../utils/retry.js";

const FETCH_TIMEOUT_MS = 8000;

export async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface SpotQuote {
  price: number;
  source: string;
  fetchedAt: number;
}

async function fetchCoinGeckoSpot(assetId: string): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(assetId)}&vs_currencies=usd`;
  const data = await fetchJson<Record<string, { usd?: number }>>(url);
  const price = data[assetId]?.usd;
  if (typeof price !== "number") throw new Error(`No USD price for ${assetId}`);
  return price;
}

/** Deterministic reference when external APIs fail (testnet resilience). */
function fallbackSpotUsd(assetId: string): number {
  const table: Record<string, number> = {
    bitcoin: 95_000,
    ethereum: 3_500,
    somnia: 0.42,
    solana: 180,
    "usd-coin": 1,
    tether: 1,
  };
  const price = table[assetId];
  if (price == null) throw new Error(`No fallback price for ${assetId}`);
  return price;
}

export async function fetchSpotUsd(assetId: string): Promise<number> {
  const quote = await fetchSpotQuote(assetId);
  return quote.price;
}

export async function fetchSpotQuote(assetId: string): Promise<SpotQuote> {
  const fetchedAt = Math.floor(Date.now() / 1000);
  try {
    const price = await withRetry(() => fetchCoinGeckoSpot(assetId), { attempts: 2, delayMs: 600 });
    return { price, source: "coingecko", fetchedAt };
  } catch {
    const price = fallbackSpotUsd(assetId);
    return { price, source: "fallback_table", fetchedAt };
  }
}
