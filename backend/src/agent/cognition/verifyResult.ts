import type { AgentType } from "../../shared/taskPayload.js";
import { proseClean } from "../../shared/skillReport.js";

export type PlanStep = {
  phase: "retrieve" | "execute" | "verify" | "synthesize" | "recover";
  status: "ok" | "skipped" | "failed" | "warn";
  detail: string;
};

export type VerificationResult = {
  ok: boolean;
  warnings: string[];
  notes: string;
};

const REQUIRED_FIELDS: Partial<Record<AgentType, string[]>> = {
  ORACLE: ["price", "source"],
  ARBITRAGE: ["spreadBps", "referenceUsd", "recommendation"],
  YIELD_OPT: ["allocation", "expectedApyBps", "recommendation"],
  GOVERNANCE: ["recommendedVote", "quorumReached"],
  RISK_MGMT: ["compositeScore", "riskLevel", "recommendation"],
};

export function verifySkillResult(role: AgentType, data: Record<string, unknown>): VerificationResult {
  const warnings: string[] = [];
  const required = REQUIRED_FIELDS[role] ?? [];

  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      warnings.push(`Missing expected field: ${field}`);
    }
  }

  if (role === "ORACLE" && data.stale === true) {
    warnings.push("Price quote is stale");
  }
  if (role === "ARBITRAGE" && data.profitable === false) {
    warnings.push("No profitable spread after gas");
  }
  if (role === "RISK_MGMT" && data.riskLevel === "HIGH") {
    warnings.push("Elevated fleet risk");
  }

  return {
    ok: warnings.length === 0,
    warnings,
    notes: warnings.length ? warnings.join("; ") : "All checks passed",
  };
}

export function recoveryGuidance(role: AgentType, error?: string): string {
  const base: Record<AgentType, string> = {
    ORACLE:
      "Price feeds may be temporarily unavailable. Wait a moment and retry, or ask for a single asset like ETH.",
    ARBITRAGE:
      "Spread data could not be loaded from live venues. Retry shortly or lower the minimum spread threshold.",
    YIELD_OPT:
      "Live yield pools are unavailable right now. Retry in a minute or specify a smaller amount and moderate risk.",
    GOVERNANCE:
      "Governance analysis needs stake numbers in your question (for, against, quorum). Try the AIP example format.",
    RISK_MGMT:
      "Fleet health signals are incomplete. Check fleet status on the dashboard, then retry the risk check.",
  };
  if (error) return proseClean(`${base[role]} Detail: ${error}`);
  return proseClean(base[role]);
}

export function userHappyPathHint(role: AgentType, success: boolean): string | undefined {
  if (success) return undefined;
  switch (role) {
    case "ORACLE":
      return "What is the current ETH price in USD?";
    case "ARBITRAGE":
      return "Scan Ethereum for DEX arbitrage above 15 bps with 1 ETH notional.";
    case "YIELD_OPT":
      return "Allocate 1 ETH across vaults with moderate risk tolerance.";
    case "GOVERNANCE":
      return "Analyze AIP 12 with 15 STT for, 4 STT against, and quorum 10 STT.";
    case "RISK_MGMT":
      return "Is the Aethon agent fleet healthy enough to run production tasks?";
    default:
      return undefined;
  }
}
