import type { TaskPayload } from "../../shared/taskPayload.js";
import { fetchSpotQuote } from "./http.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const VENUE_SEEDS = [7, 19, 31, 43];

function simulatedDexPrice(referenceUsd: number, venueSeed: number, slippageBps: number): number {
  const spreadBps = 8 + (venueSeed % 28);
  const direction = venueSeed % 2 === 0 ? 1 : -1;
  const raw = referenceUsd * (1 + (direction * spreadBps) / 10_000);
  return raw * (1 - slippageBps / 10_000);
}

function confidenceFromSpread(spreadBps: number, minSpreadBps: number): number {
  if (spreadBps < minSpreadBps) return 0.2;
  const margin = spreadBps - minSpreadBps;
  return Math.min(0.98, 0.55 + margin / 100);
}

export const executeArbitrage: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "check_spread" && payload.action !== "swarm_execute") {
    return skillFail("ARBITRAGE", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const asset = String(payload.params.asset ?? "ethereum");
    const minSpreadBps = Number(payload.params.minSpreadBps ?? 15);
    const slippageBps = Number(payload.params.slippageBps ?? 30);
    const notionalEth = Number(payload.params.notionalEth ?? 1);

    const quote = await fetchSpotQuote(asset);
    const venues = VENUE_SEEDS.map((seed, i) => ({
      id: `venue_${String.fromCharCode(65 + i)}`,
      priceUsd: simulatedDexPrice(quote.price, seed, slippageBps),
    }));

    const prices = venues.map((v) => v.priceUsd);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const spreadBps = Math.round(((maxPrice - minPrice) / quote.price) * 10_000);

    const gasWei = 380_000n * 22_000_000_000n;
    const notionalWei = BigInt(Math.floor(notionalEth * 1e18));
    const grossWei = (notionalWei * BigInt(spreadBps)) / 10_000n;
    const netWei = grossWei > gasWei ? grossWei - gasWei : 0n;
    const profitable = spreadBps >= minSpreadBps && netWei > 0n;
    const confidence = confidenceFromSpread(spreadBps, minSpreadBps);

    const bestBuy = venues.find((v) => v.priceUsd === minPrice)!;
    const bestSell = venues.find((v) => v.priceUsd === maxPrice)!;

    const recommendation = profitable
      ? `Execute ${bestBuy.id}→${bestSell.id} (${spreadBps} bps net-positive after gas)`
      : `Hold — spread ${spreadBps} bps below threshold or gas-adjusted PnL negative`;

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
          venues,
          bestBuyVenue: bestBuy.id,
          bestSellVenue: bestSell.id,
          spreadBps,
          minSpreadBps,
          slippageBps,
          notionalEth,
          profitable,
          confidence: Number(confidence.toFixed(2)),
          estimatedProfitWei: netWei.toString(),
          recommendation,
          summary: `${asset} spread ${spreadBps} bps — ${profitable ? "opportunity" : "no trade"}.`,
        },
        true,
      ),
    );
  } catch (err) {
    return skillFail("ARBITRAGE", payload.action, err instanceof Error ? err.message : "Spread check failed");
  }
};
