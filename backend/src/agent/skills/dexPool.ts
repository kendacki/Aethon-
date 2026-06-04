import { ethers } from "ethers";

const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

export type DexReserves = {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number;
  pairAddress: string;
  source: "on_chain_pair" | "mock_fallback";
};

/** Read live UniswapV2-style reserves from Somnia (or return null if pair unset). */
export async function fetchDexReserves(
  provider: ethers.Provider,
  pairAddress?: string,
): Promise<DexReserves | null> {
  const addr = pairAddress ?? process.env.SOMNIA_DEX_PAIR_ADDR ?? process.env.UNISWAP_V2_PAIR_ADDR;
  if (!addr || !addr.startsWith("0x")) return null;
  try {
    const pair = new ethers.Contract(addr, PAIR_ABI, provider);
    const [r0, r1, ts] = (await pair.getReserves()) as [bigint, bigint, number];
    return {
      reserve0: r0,
      reserve1: r1,
      blockTimestampLast: Number(ts),
      pairAddress: addr,
      source: "on_chain_pair",
    };
  } catch (err) {
    console.warn("[dexPool] getReserves failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Implied USD price of token0 from reserves when token1 is a stable (6 decimals). */
export function impliedPriceUsdFromReserves(
  reserves: DexReserves,
  token0Decimals = 18,
  token1Decimals = 6,
): number {
  if (reserves.reserve0 === 0n || reserves.reserve1 === 0n) return 0;
  const r0 = Number(ethers.formatUnits(reserves.reserve0, token0Decimals));
  const r1 = Number(ethers.formatUnits(reserves.reserve1, token1Decimals));
  return r1 / r0;
}

export function spreadBpsBetween(referenceUsd: number, dexUsd: number): number {
  if (referenceUsd <= 0 || dexUsd <= 0) return 0;
  return Math.round((Math.abs(dexUsd - referenceUsd) / referenceUsd) * 10_000);
}
