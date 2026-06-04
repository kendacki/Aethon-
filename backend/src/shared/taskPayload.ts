import { ethers } from "ethers";

export type AgentType = "ARBITRAGE" | "ORACLE" | "YIELD_OPT" | "GOVERNANCE" | "RISK_MGMT";

export const ALL_AGENT_TYPES: AgentType[] = [
  "ARBITRAGE",
  "ORACLE",
  "YIELD_OPT",
  "GOVERNANCE",
  "RISK_MGMT",
];

export interface SuccessCriterion {
  id: string;
  label: string;
  description: string;
}

export interface TaskPayload {
  version: 1;
  primaryRole: AgentType;
  action: string;
  params: Record<string, unknown>;
  requiredRoles?: AgentType[];
  label?: string;
  /** Natural-language request from the operator. */
  userQuery?: string;
  intent?: string;
  successCriteria?: SuccessCriterion[];
}

export function isAgentType(value: string): value is AgentType {
  return ALL_AGENT_TYPES.includes(value as AgentType);
}

export function canonicalizePayload(payload: TaskPayload): TaskPayload {
  return {
    version: 1,
    primaryRole: payload.primaryRole,
    action: payload.action,
    params: payload.params,
    ...(payload.requiredRoles ? { requiredRoles: [...payload.requiredRoles] } : {}),
    ...(payload.label ? { label: payload.label } : {}),
    ...(payload.userQuery ? { userQuery: payload.userQuery } : {}),
    ...(payload.intent ? { intent: payload.intent } : {}),
    ...(payload.successCriteria ? { successCriteria: [...payload.successCriteria] } : {}),
  };
}

export function hashTaskPayload(payload: TaskPayload): string {
  const canonical = JSON.stringify(canonicalizePayload(payload));
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

export function requiredRolesForTask(payload: TaskPayload, complexity: number): AgentType[] {
  if (payload.requiredRoles?.length === complexity) return payload.requiredRoles;
  if (complexity === 1) return [payload.primaryRole];
  const start = ALL_AGENT_TYPES.indexOf(payload.primaryRole);
  const roles: AgentType[] = [];
  for (let i = 0; i < complexity; i++) {
    roles.push(ALL_AGENT_TYPES[(start + i) % ALL_AGENT_TYPES.length]);
  }
  return roles;
}

export function validateTaskPayload(payload: unknown): payload is TaskPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (p.version !== 1) return false;
  if (!isAgentType(String(p.primaryRole))) return false;
  if (typeof p.action !== "string" || !p.action) return false;
  if (!p.params || typeof p.params !== "object") return false;
  if (p.requiredRoles !== undefined) {
    if (!Array.isArray(p.requiredRoles)) return false;
    if (!p.requiredRoles.every((r) => isAgentType(String(r)))) return false;
  }
  if (p.userQuery !== undefined && typeof p.userQuery !== "string") return false;
  if (p.intent !== undefined && typeof p.intent !== "string") return false;
  if (p.successCriteria !== undefined) {
    if (!Array.isArray(p.successCriteria)) return false;
  }
  return true;
}

export function defaultPayloadForRole(role: AgentType): TaskPayload {
  const defaults: Record<AgentType, TaskPayload> = {
    ARBITRAGE: {
      version: 1,
      primaryRole: "ARBITRAGE",
      action: "check_spread",
      params: { asset: "ethereum", minSpreadBps: 15 },
      label: "Arbitrage spread scan",
    },
    ORACLE: {
      version: 1,
      primaryRole: "ORACLE",
      action: "fetch_price",
      params: { asset: "ethereum", currency: "usd", maxStalenessSec: 120 },
      label: "Oracle price attestation",
    },
    YIELD_OPT: {
      version: 1,
      primaryRole: "YIELD_OPT",
      action: "optimize_yield",
      params: { amountEth: 1, riskTolerance: "moderate" },
      label: "Yield route optimization",
    },
    GOVERNANCE: {
      version: 1,
      primaryRole: "GOVERNANCE",
      action: "analyze_proposal",
      params: { proposalId: "AIP-1", supportStakeEth: 12, againstStakeEth: 4, quorumEth: 10 },
      label: "Governance proposal analysis",
    },
    RISK_MGMT: {
      version: 1,
      primaryRole: "RISK_MGMT",
      action: "assess_protocol_risk",
      params: { checkCircuitBreaker: true, minHealthyAgents: 3 },
      label: "Protocol risk assessment",
    },
  };
  return defaults[role];
}

export function swarmPayload(complexity = 5): TaskPayload {
  return {
    version: 1,
    primaryRole: "ARBITRAGE",
    action: "swarm_execute",
    params: { pipeline: "full_swarm_cycle" },
    requiredRoles: ALL_AGENT_TYPES.slice(0, complexity),
    label: `Swarm task (${complexity} agents)`,
  };
}
