import { Contract, JsonRpcProvider } from "ethers";
import type { TaskPayload } from "../../shared/taskPayload.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

const CB_ABI = ["function isPaused() view returns (bool)", "function consecutiveFailures() view returns (uint256)"];

export const executeRiskMgmt: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "assess_protocol_risk" && payload.action !== "swarm_execute") {
    return skillFail("RISK_MGMT", payload.action, `Unknown action: ${payload.action}`);
  }

  try {
    const minHealthy = Number(payload.params.minHealthyAgents ?? 3);
    const provider = new JsonRpcProvider(ctx.rpcUrl);
    let circuitPaused = false;
    let consecutiveFailures = 0;
    let activeAgents = 0;

    if (ctx.circuitBreakerAddr && ctx.circuitBreakerAddr !== "0x0000000000000000000000000000000000000000") {
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

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let recommendation = "Proceed — protocol within safe parameters";

    if (circuitPaused) {
      riskLevel = "HIGH";
      recommendation = "HALT — circuit breaker is paused";
    } else if (activeAgents > 0 && activeAgents < minHealthy) {
      riskLevel = "HIGH";
      recommendation = `HALT — only ${activeAgents}/${minHealthy} healthy agents online`;
    } else if (consecutiveFailures >= 2) {
      riskLevel = "MEDIUM";
      recommendation = "CAUTION — elevated consecutive failures on circuit breaker";
    }

    return skillOk("RISK_MGMT", payload.action, {
      circuitPaused,
      consecutiveFailures,
      activeAgents,
      minHealthyAgents: minHealthy,
      riskLevel,
      recommendation,
    });
  } catch (err) {
    return skillFail("RISK_MGMT", payload.action, err instanceof Error ? err.message : "Risk assessment failed");
  }
};
