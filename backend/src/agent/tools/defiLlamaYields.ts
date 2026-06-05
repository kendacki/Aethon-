import { withRetry } from "../utils/retry.js";
import { fetchJson } from "../skills/http.js";

export type LiveVault = {
  id: string;
  project: string;
  chain: string;
  symbol: string;
  apyBps: number;
  tvlUsd: number;
  risk: number;
  pool: string;
  source: "defillama";
};

type DefiLlamaPool = {
  chain?: string;
  project?: string;
  symbol?: string;
  tvlUsd?: number;
  apy?: number;
  apyBase?: number;
  pool?: string;
  ilRisk?: string;
  exposure?: string;
  stablecoin?: boolean;
};

type DefiLlamaResponse = {
  data?: DefiLlamaPool[];
};

const YIELDS_URL = "https://yields.llama.fi/pools";

const CHAIN_PRIORITY = ["Somnia", "Ethereum", "Base", "Arbitrum", "Optimism"];

function ilRiskToScore(ilRisk?: string, exposure?: string): number {
  const il = (ilRisk ?? "").toLowerCase();
  if (il === "no" || il === "none") return 1;
  if (il === "low") return 2;
  if (il === "medium") return 3;
  if (il === "high") return 5;
  const exp = (exposure ?? "").toLowerCase();
  if (exp === "multi") return 4;
  return 3;
}

function matchesAssetQuery(symbol: string, assetId: string): boolean {
  const sym = symbol.toUpperCase();
  if (assetId === "ethereum") {
    return sym.includes("ETH") || sym.includes("STETH") || sym.includes("WETH");
  }
  if (assetId === "somnia") return sym.includes("STT") || sym.includes("SOMNIA");
  if (assetId === "bitcoin") return sym.includes("BTC") || sym.includes("WBTC");
  return sym.includes(assetId.toUpperCase().slice(0, 4));
}

function chainRank(chain: string): number {
  const idx = CHAIN_PRIORITY.findIndex((c) => c.toLowerCase() === chain.toLowerCase());
  return idx >= 0 ? idx : CHAIN_PRIORITY.length + 1;
}

export async function fetchLiveVaults(assetId: string, limit = 12): Promise<LiveVault[]> {
  const body = await withRetry(() => fetchJson<DefiLlamaResponse>(YIELDS_URL), {
    attempts: 2,
    delayMs: 800,
    label: "defillama_yields",
  });

  const pools = (body.data ?? [])
    .filter((p) => {
      const apy = p.apy ?? p.apyBase ?? 0;
      const tvl = p.tvlUsd ?? 0;
      const symbol = p.symbol ?? "";
      return apy > 0 && tvl >= 100_000 && matchesAssetQuery(symbol, assetId);
    })
    .sort((a, b) => {
      const chainDiff = chainRank(a.chain ?? "") - chainRank(b.chain ?? "");
      if (chainDiff !== 0) return chainDiff;
      return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
    })
    .slice(0, limit);

  return pools.map((p) => {
    const apy = p.apy ?? p.apyBase ?? 0;
    const project = p.project ?? "unknown";
    const chain = p.chain ?? "unknown";
    const pool = p.pool ?? `${project}-${chain}`;
    return {
      id: `${project}-${chain}-${(p.symbol ?? "pool").replace(/\s+/g, "_")}`.slice(0, 64),
      project,
      chain,
      symbol: p.symbol ?? "UNKNOWN",
      apyBps: Math.round(apy * 100),
      tvlUsd: Math.round(p.tvlUsd ?? 0),
      risk: ilRiskToScore(p.ilRisk, p.exposure),
      pool,
      source: "defillama" as const,
    };
  });
}
