import type { TaskIntent } from "./taskIntents.js";
import { INTENT_CATALOG } from "./taskIntents.js";
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

function reportSummary(data: Record<string, unknown>): string {
  const report = data.report as { summary?: string; headline?: string } | undefined;
  if (report?.summary) return report.summary;
  if (report?.headline) return report.headline;
  return dataStr(data, "summary") || dataStr(data, "recommendation") || "";
}

function buildEvaluationSummary(
  intent: TaskIntent | string,
  overallSuccess: boolean,
  criteria: CriterionResult[],
  roleSummaries: Array<{ role: string; success: boolean; summary: string }>,
): string {
  const entry = intent in INTENT_CATALOG ? INTENT_CATALOG[intent as TaskIntent] : null;
  const met = criteria.filter((c) => c.met).length;
  const total = criteria.length;

  if (intent === "PORTFOLIO_BRIEFING") {
    const okRoles = roleSummaries.filter((r) => r.success).length;
    if (overallSuccess) {
      return `All five specialists reported. Review the structured briefing below for price, spreads, yield, governance, and fleet risk.`;
    }
    return `Partial briefing: ${okRoles} of 5 specialists succeeded. Review available sections before acting.`;
  }

  if (overallSuccess && entry) {
    return `${entry.label} completed successfully. ${met}/${total || 1} checks passed.`;
  }

  const failed = criteria.filter((c) => !c.met).map((c) => c.label);
  if (failed.length) {
    return `${entry?.label ?? "Task"} needs attention: ${failed.join(", ")} not satisfied.`;
  }

  return roleSummaries.some((r) => !r.success)
    ? "One or more agents could not complete the request."
    : "Task finished with mixed signals. Review agent reports below.";
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
    summary: reportSummary(r.result.data ?? {}) || r.result.error || "No report available.",
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

  const summary = buildEvaluationSummary(intent, overallSuccess, criteria, roleSummaries);

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
      return yieldR.criteriaMet !== false && yieldR.success !== false;
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
