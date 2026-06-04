import type { AgentType, TaskPayload } from "../../shared/taskPayload.js";
import { SKILL_MANIFESTS } from "../manifests/data.js";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
}

const KNOWN_ASSETS = new Set([
  "bitcoin",
  "ethereum",
  "somnia",
  "solana",
  "usd-coin",
  "tether",
]);

function strParam(params: Record<string, unknown>, key: string, fallback: string): string {
  const v = params[key];
  return v != null ? String(v) : fallback;
}

function numParam(params: Record<string, unknown>, key: string, fallback: number, min?: number, max?: number): number {
  const raw = params[key];
  const n = raw != null ? Number(raw) : fallback;
  if (!Number.isFinite(n)) return fallback;
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

function boolParam(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = params[key];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function validateSkillParams(role: AgentType, payload: TaskPayload): ValidationResult {
  const errors: string[] = [];
  const manifest = SKILL_MANIFESTS[role];
  const params = { ...payload.params };

  if (typeof params.userQuery === "string" && params.userQuery.length > 500) {
    params.userQuery = params.userQuery.slice(0, 500);
  }

  if (payload.action === "swarm_execute") {
    return { ok: true, errors: [], sanitized: params };
  }

  if (!manifest.actions.includes(payload.action)) {
    errors.push(`Action "${payload.action}" not in manifest for ${role}`);
  }

  switch (role) {
    case "ARBITRAGE":
      validateArbitrage(params, errors);
      break;
    case "ORACLE":
      validateOracle(params, errors);
      break;
    case "YIELD_OPT":
      validateYieldOpt(params, errors);
      break;
    case "GOVERNANCE":
      validateGovernance(params, errors);
      break;
    case "RISK_MGMT":
      validateRiskMgmt(params, errors);
      break;
  }

  return { ok: errors.length === 0, errors, sanitized: params };
}

function validateArbitrage(params: Record<string, unknown>, errors: string[]): void {
  const asset = strParam(params, "asset", "ethereum").toLowerCase();
  params.asset = asset;
  if (!KNOWN_ASSETS.has(asset) && asset.length < 2) {
    errors.push("asset must be a valid CoinGecko id");
  }
  params.minSpreadBps = numParam(params, "minSpreadBps", 15, 1, 500);
  params.slippageBps = numParam(params, "slippageBps", 30, 0, 200);
  params.notionalEth = numParam(params, "notionalEth", 1, 0.001, 10_000);
}

function validateOracle(params: Record<string, unknown>, errors: string[]): void {
  const asset = strParam(params, "asset", "ethereum").toLowerCase();
  params.asset = asset;
  params.currency = strParam(params, "currency", "usd").toLowerCase();
  params.maxStalenessSec = numParam(params, "maxStalenessSec", 120, 10, 3600);
  if (params.currency !== "usd") {
    errors.push("Only usd currency supported currently");
  }
}

function validateYieldOpt(params: Record<string, unknown>, errors: string[]): void {
  params.amountEth = numParam(params, "amountEth", 1, 0.01, 1_000_000);
  const tolerance = strParam(params, "riskTolerance", "moderate").toLowerCase();
  if (!["conservative", "moderate", "aggressive"].includes(tolerance)) {
    errors.push("riskTolerance must be conservative, moderate, or aggressive");
  }
  params.riskTolerance = tolerance;
  params.diversify = boolParam(params, "diversify", true);
}

function validateGovernance(params: Record<string, unknown>, errors: string[]): void {
  params.proposalId = strParam(params, "proposalId", "unknown");
  params.supportStakeEth = numParam(params, "supportStakeEth", 0, 0);
  params.againstStakeEth = numParam(params, "againstStakeEth", 0, 0);
  params.quorumEth = numParam(params, "quorumEth", 0, 0);
  params.passThreshold = numParam(params, "passThreshold", 0.66, 0.5, 0.95);
}

function validateRiskMgmt(params: Record<string, unknown>, errors: string[]): void {
  params.minHealthyAgents = numParam(params, "minHealthyAgents", 3, 1, 100);
  params.checkCircuitBreaker = boolParam(params, "checkCircuitBreaker", true);
  params.maxConsecutiveFailures = numParam(params, "maxConsecutiveFailures", 2, 0, 20);
}
