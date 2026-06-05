import type { TaskPayload } from "../../shared/taskPayload.js";
import type { AgentType } from "../../shared/taskPayload.js";
import { INTENT_CATALOG, type TaskIntent } from "../../shared/taskIntents.js";
import { buildSkillReport } from "../../shared/skillReport.js";

export function skillSourcesForRole(role: AgentType, payload: TaskPayload): string[] {
  const intent = (payload.intent ?? payload.params.intent) as TaskIntent | undefined;
  if (intent && INTENT_CATALOG[intent]) {
    return INTENT_CATALOG[intent].sources;
  }
  const roleSources: Record<AgentType, string[]> = {
    ARBITRAGE: ["CoinGecko reference", "CoinGecko exchange tickers", "DexScreener", "On-chain DEX pair"],
    ORACLE: ["CoinGecko", "Somnia JSON oracle", "Fallback table"],
    YIELD_OPT: ["DefiLlama live yield pools"],
    GOVERNANCE: ["Payload vote params", "Somnia LLM (optional)", "Agent knowledge base"],
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
  const intent = (payload.intent ?? payload.params.intent ?? "MARKET_PRICE") as TaskIntent;
  const report = buildSkillReport(role, intent, data);

  return {
    ...data,
    userQueryEcho: userQuery,
    intent,
    sources: skillSourcesForRole(role, payload),
    criteriaMet,
    report,
    summary: report.summary,
  };
}
