import type { TaskPayload } from "../../shared/taskPayload.js";
import { fetchSpotUsd } from "./http.js";
import { skillFail, skillOk, type SkillContext, type SkillExecutor } from "./types.js";

/** Synthetic secondary venue spread model (deterministic, no API key). */
function simulatedDexPrice(referenceUsd: number, venueSeed: number): number {
  const spreadBps = 12 + (venueSeed % 25);
  const direction = venueSeed % 2 === 0 ? 1 : -1;
  return referenceUsd * (1 + (direction * spreadBps) / 10_000);
}

export const executeArbitrage: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "check_spread" && payload.action !== "swarm_execute") {
    return skillFail("ARBITRAGE", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const asset = String(payload.params.asset ?? "ethereum");
    const minSpreadBps = Number(payload.params.minSpreadBps ?? 15);
    const reference = await fetchSpotUsd(asset);
    const venueA = simulatedDexPrice(reference, 7);
    const venueB = simulatedDexPrice(reference, 19);
    const spreadBps = Math.round((Math.abs(venueA - venueB) / reference) * 10_000);
    const gasWei = 350_000n * 20_000_000_000n;
    const notionalWei = 1_000_000_000_000_000_000n;
    const grossWei = (notionalWei * BigInt(spreadBps)) / 10_000n;
    const profitable = spreadBps >= minSpreadBps && grossWei > gasWei;

    return skillOk("ARBITRAGE", payload.action, {
      asset,
      referenceUsd: reference,
      venueAUsd: venueA,
      venueBUsd: venueB,
      spreadBps,
      minSpreadBps,
      profitable,
      estimatedProfitWei: profitable ? (grossWei - gasWei).toString() : "0",
    });
  } catch (err) {
    return skillFail("ARBITRAGE", payload.action, err instanceof Error ? err.message : "Spread check failed");
  }
};
