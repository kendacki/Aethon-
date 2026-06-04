import { Contract, JsonRpcProvider } from "ethers";
import type { TaskPayload } from "../../shared/taskPayload.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const CB_ABI = [
  "function isPaused() view returns (bool)",
  "function consecutiveFailures() view returns (uint256)",
];

export const executeRiskMgmt: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "assess_protocol_risk" && payload.action !== "swarm_execute") {
    return skillFail("RISK_MGMT", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const minHealthy = Number(payload.params.minHealthyAgents ?? 3);
    const maxFailures = Number(payload.params.maxConsecutiveFailures ?? 2);
    const checkCb = payload.params.checkCircuitBreaker !== false;

    const provider = new JsonRpcProvider(ctx.rpcUrl);
    let circuitPaused = false;
    let consecutiveFailures = 0;
    let activeAgents = 0;
    let selfBalanceWei = 0n;

    if (checkCb && ctx.circuitBreakerAddr && ctx.circuitBreakerAddr !== "0x0000000000000000000000000000000000000000") {
      const cb = new Contract(ctx.circuitBreakerAddr, CB_ABI, provider);
      circuitPaused = Boolean(await cb.isPaused());
      consecutiveFailures = Number(await cb.consecutiveFailures());
    }

    try {
      const base = ctx.apiBaseUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/stats`);
      if (res.ok) {
        const body = (await res.json()) as { data: { activeAgents?: number } };
        activeAgents = body.data.activeAgents ?? 0;
      }
    } catch {
      /* stats optional */
    }

    selfBalanceWei = await provider.getBalance(ctx.agentAddress);

    const factors: Array<{ name: string; weight: number; score: number }> = [
      {
        name: "circuit_breaker",
        weight: 35,
        score: circuitPaused ? 0 : consecutiveFailures >= maxFailures ? 40 : 100,
      },
      {
        name: "fleet_liveness",
        weight: 30,
        score: activeAgents === 0 ? 70 : activeAgents >= minHealthy ? 100 : Math.round((activeAgents / minHealthy) * 100),
      },
      {
        name: "agent_gas_reserve",
        weight: 20,
        score: selfBalanceWei >= 500_000_000_000_000_000n ? 100 : selfBalanceWei >= 100_000_000_000_000_000n ? 50 : 10,
      },
      {
        name: "api_reachability",
        weight: 15,
        score: activeAgents > 0 ? 100 : 60,
      },
    ];

    const compositeScore = Math.round(
      factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0),
    );

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let recommendation = "Proceed — protocol within safe parameters";

    if (circuitPaused || compositeScore < 40) {
      riskLevel = "HIGH";
      recommendation = circuitPaused
        ? "HALT — circuit breaker is paused"
        : "HALT — composite risk score critical";
    } else if (activeAgents > 0 && activeAgents < minHealthy) {
      riskLevel = "HIGH";
      recommendation = `HALT — only ${activeAgents}/${minHealthy} healthy agents online`;
    } else if (consecutiveFailures >= maxFailures || compositeScore < 70) {
      riskLevel = "MEDIUM";
      recommendation = "CAUTION — elevated protocol stress detected";
    }

    const criteriaMet = !circuitPaused && compositeScore >= 70 && activeAgents >= minHealthy;

    return skillOk(
      "RISK_MGMT",
      payload.action,
      enrichSkillData(
        "RISK_MGMT",
        payload,
        {
          circuitPaused,
          consecutiveFailures,
          activeAgents,
          minHealthyAgents: minHealthy,
          compositeScore,
          riskFactors: factors,
          riskLevel,
          recommendation,
          confidence: Number((compositeScore / 100).toFixed(2)),
          proceed: criteriaMet,
          summary: `Fleet risk ${riskLevel} (score ${compositeScore}/100) — ${recommendation}`,
        },
        criteriaMet,
      ),
    );
  } catch (err) {
    return skillFail("RISK_MGMT", payload.action, err instanceof Error ? err.message : "Risk assessment failed");
  }
};
