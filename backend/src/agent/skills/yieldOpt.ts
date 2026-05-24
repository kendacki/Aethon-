import type { TaskPayload } from "../../shared/taskPayload.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const VAULTS = [
  { id: "somnia-stt-vault", apyBps: 620, risk: 2 },
  { id: "dream-yield-core", apyBps: 840, risk: 4 },
  { id: "shannon-liquidity", apyBps: 510, risk: 1 },
  { id: "agent-stake-pool", apyBps: 710, risk: 3 },
];

export const executeYieldOpt: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "optimize_yield" && payload.action !== "swarm_execute") {
    return skillFail("YIELD_OPT", payload.action, `Unknown action: ${payload.action}`);
  }

  const amountEth = Number(payload.params.amountEth ?? 1);
  const tolerance = String(payload.params.riskTolerance ?? "moderate");
  const maxRisk = tolerance === "conservative" ? 2 : tolerance === "aggressive" ? 5 : 3;

  const eligible = VAULTS.filter((v) => v.risk <= maxRisk);
  if (eligible.length === 0) {
    return skillFail("YIELD_OPT", payload.action, "No vaults match risk tolerance");
  }

  const best = eligible.reduce((a, b) => (b.apyBps > a.apyBps ? b : a));
  const scoreSum = eligible.reduce((s, v) => s + v.apyBps / v.risk, 0);
  const allocationPct = Math.round(((best.apyBps / best.risk) / scoreSum) * 100);

  return skillOk("YIELD_OPT", payload.action, {
    amountEth,
    riskTolerance: tolerance,
    recommendedVault: best.id,
    expectedApyBps: best.apyBps,
    allocationPct,
    alternatives: eligible.map((v) => ({ id: v.id, apyBps: v.apyBps, risk: v.risk })),
  });
};
