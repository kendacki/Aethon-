import type { TaskPayload } from "../../shared/taskPayload.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const VAULTS = [
  { id: "somnia-stt-vault", apyBps: 620, risk: 2, tvlEth: 12_400 },
  { id: "dream-yield-core", apyBps: 840, risk: 4, tvlEth: 8_100 },
  { id: "shannon-liquidity", apyBps: 510, risk: 1, tvlEth: 22_000 },
  { id: "agent-stake-pool", apyBps: 710, risk: 3, tvlEth: 5_600 },
];

function riskAdjustedScore(apyBps: number, risk: number): number {
  return apyBps / Math.sqrt(risk);
}

export const executeYieldOpt: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "optimize_yield" && payload.action !== "swarm_execute") {
    return skillFail("YIELD_OPT", payload.action, `Unknown action: ${payload.action}`);
  }

  const amountEth = Number(payload.params.amountEth ?? 1);
  const tolerance = String(payload.params.riskTolerance ?? "moderate");
  const diversify = payload.params.diversify !== false;
  const maxRisk = tolerance === "conservative" ? 2 : tolerance === "aggressive" ? 5 : 3;

  const eligible = VAULTS.filter((v) => v.risk <= maxRisk)
    .map((v) => ({ ...v, score: riskAdjustedScore(v.apyBps, v.risk) }))
    .sort((a, b) => b.score - a.score);

  if (eligible.length === 0) {
    return skillFail("YIELD_OPT", payload.action, "No vaults match risk tolerance");
  }

  const primary = eligible[0];
  const secondary = eligible[1];

  let allocation: Array<{ vaultId: string; pct: number; apyBps: number }>;
  if (diversify && secondary && tolerance !== "aggressive") {
    allocation = [
      { vaultId: primary.id, pct: 65, apyBps: primary.apyBps },
      { vaultId: secondary.id, pct: 35, apyBps: secondary.apyBps },
    ];
  } else {
    allocation = [{ vaultId: primary.id, pct: 100, apyBps: primary.apyBps }];
  }

  const blendedApyBps = Math.round(
    allocation.reduce((s, a) => s + (a.apyBps * a.pct) / 100, 0),
  );
  const expectedYieldEth = (amountEth * blendedApyBps) / 10_000 / 365;

  return skillOk("YIELD_OPT", payload.action, {
    amountEth,
    riskTolerance: tolerance,
    recommendedVault: primary.id,
    expectedApyBps: blendedApyBps,
    allocation,
    expectedDailyYieldEth: Number(expectedYieldEth.toFixed(6)),
    confidence: Number(Math.min(0.92, 0.6 + eligible.length * 0.08).toFixed(2)),
    alternatives: eligible.map((v) => ({
      id: v.id,
      apyBps: v.apyBps,
      risk: v.risk,
      score: Number(v.score.toFixed(1)),
      tvlEth: v.tvlEth,
    })),
    recommendation: `Route ${amountEth} STT → ${allocation.map((a) => `${a.pct}% ${a.vaultId}`).join(", ")}`,
  });
};
