import type { TaskPayload } from "../../shared/taskPayload.js";
import type { AgentType } from "../../shared/taskPayload.js";
import { INTENT_CATALOG, type TaskIntent } from "../../shared/taskIntents.js";

export function skillSourcesForRole(role: AgentType, payload: TaskPayload): string[] {
  const intent = (payload.intent ?? payload.params.intent) as TaskIntent | undefined;
  if (intent && INTENT_CATALOG[intent]) {
    return INTENT_CATALOG[intent].sources;
  }
  const roleSources: Record<AgentType, string[]> = {
    ARBITRAGE: ["CoinGecko reference", "Simulated DEX venues"],
    ORACLE: ["CoinGecko", "Somnia JSON oracle", "Fallback table"],
    YIELD_OPT: ["Aethon vault registry"],
    GOVERNANCE: ["Payload vote params", "Somnia LLM (optional)"],
    RISK_MGMT: ["CircuitBreaker", "Aethon stats API", "Somnia RPC"],
  };
  return roleSources[role];
}

export function enrichSkillData(
  role: AgentType,
  payload: TaskPayload,
  data: Record<string, unknown>,
  criteriaMet: boolean,
): Record<string, unknown> {
  const userQuery = String(payload.userQuery ?? payload.params.userQuery ?? "");
  return {
    ...data,
    userQueryEcho: userQuery,
    intent: payload.intent ?? payload.params.intent,
    sources: skillSourcesForRole(role, payload),
    criteriaMet,
    summary:
      data.summary ??
      data.recommendation ??
      data.llmSummary ??
      (criteriaMet ? `${role} completed for your request.` : `${role} could not fully satisfy the request.`),
  };
}
