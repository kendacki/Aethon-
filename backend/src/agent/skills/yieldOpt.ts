import type { Provider } from "ethers";
import { JsonRpcProvider } from "ethers";
import type { TaskPayload } from "../../shared/taskPayload.js";
import { fetchLiveVaults } from "../tools/defiLlamaYields.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

function riskAdjustedScore(apyBps: number, risk: number): number {
  return apyBps / Math.sqrt(Math.max(risk, 1));
}

export const executeYieldOpt: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "optimize_yield" && payload.action !== "swarm_execute") {
    return skillFail("YIELD_OPT", payload.action, `Unknown action: ${payload.action}`);
  }

  const amountEth = Number(payload.params.amountEth ?? 1);
  const tolerance = String(payload.params.riskTolerance ?? "moderate");
  const diversify = payload.params.diversify !== false;
  const maxRisk = tolerance === "conservative" ? 2 : tolerance === "aggressive" ? 5 : 3;
  const asset = String(payload.params.asset ?? "ethereum");

  let vaults;
  try {
    vaults = await fetchLiveVaults(asset, 16);
  } catch (err) {
    return skillFail(
      "YIELD_OPT",
      payload.action,
      err instanceof Error ? err.message : "Failed to load live yield pools from DefiLlama",
    );
  }

  if (vaults.length === 0) {
    return skillFail("YIELD_OPT", payload.action, `No live yield pools found for ${asset} on DefiLlama`);
  }

  const eligible = vaults
    .filter((v) => v.risk <= maxRisk)
    .map((v) => ({ ...v, score: riskAdjustedScore(v.apyBps, v.risk) }))
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) {
    return skillFail(
      "YIELD_OPT",
      payload.action,
      `No live pools match ${tolerance} risk tolerance for ${asset}`,
    );
  }

  const primary = eligible[0];
  const secondary = eligible[1];

  let allocation: Array<{ vaultId: string; pct: number; apyBps: number; chain: string; project: string }>;
  if (diversify && secondary && tolerance !== "aggressive") {
    allocation = [
      {
        vaultId: primary.id,
        pct: 65,
        apyBps: primary.apyBps,
        chain: primary.chain,
        project: primary.project,
      },
      {
        vaultId: secondary.id,
        pct: 35,
        apyBps: secondary.apyBps,
        chain: secondary.chain,
        project: secondary.project,
      },
    ];
  } else {
    allocation = [
      {
        vaultId: primary.id,
        pct: 100,
        apyBps: primary.apyBps,
        chain: primary.chain,
        project: primary.project,
      },
    ];
  }

  const blendedApyBps = Math.round(
    allocation.reduce((s, a) => s + (a.apyBps * a.pct) / 100, 0),
  );
  const expectedYieldEth = (amountEth * blendedApyBps) / 10_000 / 365;
  const recommendation = `Route ${amountEth} ETH → ${allocation.map((a) => `${a.pct}% ${a.project} (${a.chain})`).join(", ")}`;

  return skillOk(
    "YIELD_OPT",
    payload.action,
    enrichSkillData(
      "YIELD_OPT",
      payload,
      {
        amountEth,
        riskTolerance: tolerance,
        recommendedVault: primary.id,
        expectedApyBps: blendedApyBps,
        allocation,
        expectedDailyYieldEth: Number(expectedYieldEth.toFixed(6)),
        confidence: Number(Math.min(0.95, 0.55 + eligible.length * 0.05).toFixed(2)),
        alternatives: eligible.slice(0, 6).map((v) => ({
          id: v.id,
          apyBps: v.apyBps,
          risk: v.risk,
          score: Number(v.score.toFixed(1)),
          tvlUsd: v.tvlUsd,
          chain: v.chain,
          project: v.project,
        })),
        dataSource: "defillama",
        poolsAnalyzed: vaults.length,
        recommendation,
        summary: `Blended APY ${(blendedApyBps / 100).toFixed(2)}% on ${amountEth} ETH (${tolerance} risk) from live DefiLlama pools.`,
      },
      true,
    ),
  );
};
