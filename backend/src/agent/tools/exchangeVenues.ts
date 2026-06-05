import { withRetry } from "../utils/retry.js";
import { fetchJson } from "../skills/http.js";

export type ExchangeVenue = {
  id: string;
  exchange: string;
  priceUsd: number;
  volumeUsd: number;
  spreadPct: number;
  source: "coingecko_tickers";
};

type CoinGeckoTicker = {
  market?: { name?: string; identifier?: string };
  last?: number;
  converted_last?: { usd?: number };
  bid_ask_spread_percentage?: number;
  volume?: number;
  converted_volume?: { usd?: number };
};

type CoinGeckoTickersResponse = {
  tickers?: CoinGeckoTicker[];
};

const COINGECKO_COIN_IDS: Record<string, string> = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  somnia: "somnia",
  solana: "solana",
  "usd-coin": "usd-coin",
  tether: "tether",
};

export async function fetchExchangeVenues(assetId: string, maxVenues = 8): Promise<ExchangeVenue[]> {
  const coinId = COINGECKO_COIN_IDS[assetId] ?? assetId;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/tickers?include_exchange_logo=false&depth=true`;

  const body = await withRetry(() => fetchJson<CoinGeckoTickersResponse>(url), {
    attempts: 2,
    delayMs: 700,
    label: "coingecko_tickers",
  });

  const seen = new Set<string>();
  const venues: ExchangeVenue[] = [];

  for (const ticker of body.tickers ?? []) {
    const exchange = ticker.market?.name ?? ticker.market?.identifier ?? "unknown";
    const key = exchange.toLowerCase();
    if (seen.has(key)) continue;

    const priceUsd = ticker.converted_last?.usd ?? ticker.last;
    if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd <= 0) continue;

    const volumeUsd = ticker.converted_volume?.usd ?? ticker.volume ?? 0;
    seen.add(key);
    venues.push({
      id: `cex_${key.replace(/\s+/g, "_").slice(0, 32)}`,
      exchange,
      priceUsd,
      volumeUsd: typeof volumeUsd === "number" ? volumeUsd : 0,
      spreadPct: Number(ticker.bid_ask_spread_percentage ?? 0),
      source: "coingecko_tickers",
    });

    if (venues.length >= maxVenues) break;
  }

  return venues.sort((a, b) => b.volumeUsd - a.volumeUsd);
}
