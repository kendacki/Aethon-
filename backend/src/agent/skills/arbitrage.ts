import type { TaskPayload } from "../../shared/taskPayload.js";
import { JsonRpcProvider } from "ethers";
import { fetchExchangeVenues } from "../tools/exchangeVenues.js";
import { fetchDexScreenerPairs } from "../tools/dexScreener.js";
import { estimateSwapGasCost } from "../tools/liveGas.js";
import { fetchSpotQuote } from "./http.js";
import { fetchDexReserves, impliedPriceUsdFromReserves, spreadBpsBetween } from "./dexPool.js";
import { proseClean } from "../../shared/skillReport.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

function confidenceFromSpread(spreadBps: number, minSpreadBps: number): number {
  if (spreadBps < minSpreadBps) return 0.2;
  const margin = spreadBps - minSpreadBps;
  return Math.min(0.98, 0.55 + margin / 100);
}

export const executeArbitrage: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "check_spread" && payload.action !== "swarm_execute") {
    return skillFail("ARBITRAGE", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const asset = String(payload.params.asset ?? "ethereum");
    const minSpreadBps = Number(payload.params.minSpreadBps ?? 15);
    const slippageBps = Number(payload.params.slippageBps ?? 30);
    const notionalEth = Number(payload.params.notionalEth ?? 1);

    const quote = await fetchSpotQuote(asset);
    const provider = new JsonRpcProvider(ctx.rpcUrl);
    const gas = await estimateSwapGasCost(provider);

    const onChainReserves = await fetchDexReserves(provider);
    let dexImpliedUsd = 0;
    let dexSource = "none";

    if (onChainReserves) {
      dexImpliedUsd = impliedPriceUsdFromReserves(onChainReserves);
      dexSource = `on_chain_pair:${onChainReserves.pairAddress}`;
    }

    let exchangeVenues: Awaited<ReturnType<typeof fetchExchangeVenues>> = [];
    try {
      exchangeVenues = await fetchExchangeVenues(asset, 8);
    } catch (err) {
      console.warn("[ARBITRAGE] Exchange tickers unavailable:", err instanceof Error ? err.message : err);
    }

    let dexPairs: Awaited<ReturnType<typeof fetchDexScreenerPairs>> = [];
    if (exchangeVenues.length === 0 && !onChainReserves) {
      try {
        dexPairs = await fetchDexScreenerPairs(asset === "ethereum" ? "WETH" : asset, 6);
      } catch (err) {
        console.warn("[ARBITRAGE] DexScreener fallback unavailable:", err instanceof Error ? err.message : err);
      }
    }

    type VenueRow = { id: string; priceUsd: number; source: string; exchange?: string };
    const venues: VenueRow[] = [];

    if (onChainReserves && dexImpliedUsd > 0) {
      venues.push({
        id: `dex_${onChainReserves.pairAddress.slice(0, 10)}`,
        priceUsd: dexImpliedUsd,
        source: dexSource,
      });
    }

    for (const v of exchangeVenues) {
      venues.push({
        id: v.id,
        priceUsd: v.priceUsd * (1 - slippageBps / 10_000),
        source: "coingecko_tickers",
        exchange: v.exchange,
      });
    }

    for (const p of dexPairs) {
      venues.push({
        id: p.id,
        priceUsd: p.priceUsd * (1 - slippageBps / 10_000),
        source: "dexscreener",
        exchange: p.dexId,
      });
    }

    if (venues.length === 0) {
      return skillFail(
        "ARBITRAGE",
        payload.action,
        "No live venue prices available (configure SOMNIA_DEX_PAIR_ADDR or retry when exchange APIs respond)",
      );
    }

    const prices = venues.map((v) => v.priceUsd);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    let spreadBps = Math.round(((maxPrice - minPrice) / quote.price) * 10_000);

    if (onChainReserves && dexImpliedUsd > 0) {
      const dexSpread = spreadBpsBetween(quote.price, dexImpliedUsd);
      spreadBps = Math.max(spreadBps, dexSpread);
    }

    const notionalWei = BigInt(Math.floor(notionalEth * 1e18));
    const grossWei = (notionalWei * BigInt(spreadBps)) / 10_000n;
    const netWei = grossWei > gas.totalCostWei ? grossWei - gas.totalCostWei : 0n;
    const profitable = spreadBps >= minSpreadBps && netWei > 0n;
    const confidence = confidenceFromSpread(spreadBps, minSpreadBps);

    const bestBuy = venues.reduce((a, b) => (a.priceUsd < b.priceUsd ? a : b));
    const bestSell = venues.reduce((a, b) => (a.priceUsd > b.priceUsd ? a : b));
    const proceed = profitable;

    const recommendation = profitable
      ? proseClean(
          `Execute from ${bestBuy.id} to ${bestSell.id} at ${spreadBps} basis points net positive after live gas.`,
        )
      : proseClean(
          `Hold. Spread is ${spreadBps} basis points, below your threshold or gas adjusted profit is negative.`,
        );

    const criteriaMet = profitable && spreadBps >= minSpreadBps;

    return skillOk(
      "ARBITRAGE",
      payload.action,
      enrichSkillData(
        "ARBITRAGE",
        payload,
        {
          asset,
          referenceUsd: quote.price,
          priceSource: quote.source,
          dexSource,
          onChainReserves: onChainReserves
            ? {
                pair: onChainReserves.pairAddress,
                reserve0: onChainReserves.reserve0.toString(),
                reserve1: onChainReserves.reserve1.toString(),
                impliedUsd: dexImpliedUsd,
              }
            : undefined,
          venues: venues.map((v) => ({
            id: v.id,
            priceUsd: v.priceUsd,
            source: v.source,
            exchange: v.exchange,
          })),
          venueCount: venues.length,
          bestBuyVenue: bestBuy.id,
          bestSellVenue: bestSell.id,
          spreadBps,
          minSpreadBps,
          slippageBps,
          notionalEth,
          profitable,
          proceed,
          confidence: Number(confidence.toFixed(2)),
          estimatedProfitWei: netWei.toString(),
          gasEstimateWei: gas.totalCostWei.toString(),
          gasSource: gas.source,
          recommendation,
          summary: proseClean(
            `${asset} spread ${spreadBps} basis points across ${venues.length} live venues. ${profitable ? "Actionable opportunity after gas." : "No trade recommended."}`,
          ),
        },
        criteriaMet,
      ),
    );
  } catch (err) {
    return skillFail("ARBITRAGE", payload.action, err instanceof Error ? err.message : "Spread check failed");
  }
};
