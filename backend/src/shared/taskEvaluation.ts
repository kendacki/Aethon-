import type { TaskIntent } from "./taskIntents.js";
import type { TaskPayload } from "./taskPayload.js";

export type SkillResultLike = {
  agentType: string;
  result: {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
};

export type CriterionResult = {
  id: string;
  label: string;
  met: boolean;
  detail?: string;
};

export type TaskOutcomeEvaluation = {
  intent: TaskIntent | string;
  overallSuccess: boolean;
  summary: string;
  criteria: CriterionResult[];
  roleSummaries: Array<{ role: string; success: boolean; summary: string }>;
};

function dataStr(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return v != null ? String(v) : "";
}

export function evaluateTaskOutcome(
  payload: TaskPayload | null,
  skillResults: SkillResultLike[],
): TaskOutcomeEvaluation {
  const intent = (payload?.intent ?? payload?.params?.intent ?? "MARKET_PRICE") as TaskIntent;
  const criteriaDefs = payload?.successCriteria ?? [];
  const byRole = new Map(skillResults.map((r) => [r.agentType, r.result]));

  const roleSummaries = skillResults.map((r) => ({
    role: r.agentType,
    success: r.result.success !== false,
    summary: dataStr(r.result.data ?? {}, "summary") || dataStr(r.result.data ?? {}, "recommendation") || r.result.error || "—",
  }));

  const criteria: CriterionResult[] = criteriaDefs.map((c) => {
    const met = evaluateCriterion(c.id, intent, byRole, skillResults);
    return { id: c.id, label: c.label, met, detail: c.description };
  });

  const overallSuccess =
    criteria.length > 0
      ? criteria.filter((c) => c.id !== "majority_success").every((c) => c.met) ||
        (criteria.some((c) => c.id === "majority_success") &&
          criteria.find((c) => c.id === "majority_success")?.met === true &&
          criteria.filter((c) => c.id !== "majority_success" && c.id !== "all_roles_reported").every((c) => c.met))
      : skillResults.length > 0 && skillResults.every((r) => r.result.success !== false);

  const summary = overallSuccess
    ? `Task met ${criteria.filter((c) => c.met).length}/${criteria.length || skillResults.length} success criteria.`
    : `Task incomplete: ${criteria.filter((c) => !c.met).map((c) => c.label).join(", ") || "one or more skills failed"}.`;

  return { intent, overallSuccess, summary, criteria, roleSummaries };
}

function evaluateCriterion(
  id: string,
  intent: TaskIntent | string,
  byRole: Map<string, SkillResultLike["result"]>,
  all: SkillResultLike[],
): boolean {
  const oracle = byRole.get("ORACLE")?.data ?? {};
  const arb = byRole.get("ARBITRAGE")?.data ?? {};
  const yieldR = byRole.get("YIELD_OPT")?.data ?? {};
  const gov = byRole.get("GOVERNANCE")?.data ?? {};
  const risk = byRole.get("RISK_MGMT")?.data ?? {};

  switch (id) {
    case "price_returned":
      return typeof oracle.price === "number" && oracle.price > 0;
    case "fresh_data":
      return oracle.stale === false;
    case "signed_attestation":
      return Boolean(oracle.signature);
    case "spread_computed":
      return typeof arb.spreadBps === "number";
    case "recommendation":
      return Boolean(arb.recommendation);
    case "allocation_plan":
      return Array.isArray(yieldR.allocation) && (yieldR.allocation as unknown[]).length > 0;
    case "risk_respected":
      return yieldR.success !== false;
    case "vote_recommendation":
      return ["FOR", "AGAINST", "ABSTAIN"].includes(String(gov.recommendedVote));
    case "quorum_status":
      return gov.quorumReached !== undefined;
    case "risk_score":
      return typeof risk.compositeScore === "number";
    case "fleet_signal":
      return risk.activeAgents !== undefined || risk.circuitPaused !== undefined;
    case "all_roles_reported":
      return all.length >= 5;
    case "majority_success":
      return all.filter((r) => r.result.success !== false).length >= 4;
    case "oracle_price":
      return typeof oracle.price === "number" && oracle.stale === false;
    default:
      return all.some((r) => r.result.data?.criteriaMet === true);
  }
}
