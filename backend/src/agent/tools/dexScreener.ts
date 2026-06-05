import { withRetry } from "../utils/retry.js";
import { fetchJson } from "../skills/http.js";

export type DexScreenerPair = {
  id: string;
  dexId: string;
  priceUsd: number;
  liquidityUsd: number;
  source: "dexscreener";
};

type DexScreenerResponse = {
  pairs?: Array<{
    chainId?: string;
    dexId?: string;
    pairAddress?: string;
    priceUsd?: string;
    liquidity?: { usd?: number };
    baseToken?: { symbol?: string };
  }>;
};

export async function fetchDexScreenerPairs(query: string, limit = 6): Promise<DexScreenerPair[]> {
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  const body = await withRetry(() => fetchJson<DexScreenerResponse>(url), {
    attempts: 2,
    delayMs: 600,
    label: "dexscreener",
  });

  const pairs: DexScreenerPair[] = [];
  for (const p of body.pairs ?? []) {
    const priceUsd = Number(p.priceUsd);
    const liquidityUsd = Number(p.liquidity?.usd ?? 0);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;
    if (liquidityUsd < 10_000) continue;
    pairs.push({
      id: `dexscreener_${p.dexId ?? "dex"}_${(p.pairAddress ?? "").slice(0, 8)}`,
      dexId: p.dexId ?? "dex",
      priceUsd,
      liquidityUsd,
      source: "dexscreener",
    });
    if (pairs.length >= limit) break;
  }

  return pairs;
}
