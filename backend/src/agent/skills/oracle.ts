import type { TaskPayload } from "../../shared/taskPayload.js";
import { fetchSpotUsd } from "./http.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

export const executeOracle: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "fetch_price" && payload.action !== "swarm_execute") {
    return skillFail("ORACLE", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const asset = String(payload.params.asset ?? "ethereum");
    const currency = String(payload.params.currency ?? "usd");
    const maxStalenessSec = Number(payload.params.maxStalenessSec ?? 120);
    const fetchedAt = Math.floor(Date.now() / 1000);
    const price = await fetchSpotUsd(asset);

    const attestation = {
      asset,
      currency,
      price,
      fetchedAt,
      agent: ctx.agentAddress,
      maxStalenessSec,
    };
    const digest = JSON.stringify(attestation);
    const signature = await ctx.signMessage(digest);

    return skillOk("ORACLE", payload.action, {
      ...attestation,
      attestation: digest,
      signature,
      stale: false,
    });
  } catch (err) {
    return skillFail("ORACLE", payload.action, err instanceof Error ? err.message : "Oracle fetch failed");
  }
};
