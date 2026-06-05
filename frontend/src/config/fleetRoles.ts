import type { AgentType } from "../task/payload";
import { ALL_AGENT_TYPES } from "../task/payload";

export type FleetRoleMeta = {
  type: AgentType;
  label: string;
  description: string;
};

export const FLEET_ROLE_META: Record<AgentType, FleetRoleMeta> = {
  ARBITRAGE: {
    type: "ARBITRAGE",
    label: "Arbitrage",
    description: "Compares DEX prices to a live reference and recommends trade or hold.",
  },
  ORACLE: {
    type: "ORACLE",
    label: "Oracle",
    description: "Fetches USD prices, checks freshness, and signs an attestation.",
  },
  YIELD_OPT: {
    type: "YIELD_OPT",
    label: "Yield optimizer",
    description: "Builds vault allocation from the on-chain catalog.",
  },
  GOVERNANCE: {
    type: "GOVERNANCE",
    label: "Governance",
    description: "Evaluates quorum and vote ratio.",
  },
  RISK_MGMT: {
    type: "RISK_MGMT",
    label: "Risk management",
    description: "Scores fleet health from circuit breaker and agent reserves.",
  },
};

export function fleetRoleLabel(type: string): string {
  if (!type) return "all roles";
  return FLEET_ROLE_META[type as AgentType]?.label ?? type.replace(/_/g, " ").toLowerCase();
}

export function sortAgentsByRole<T extends { agentType: string }>(agents: T[]): T[] {
  return [...agents].sort(
    (a, b) =>
      ALL_AGENT_TYPES.indexOf(a.agentType as AgentType) - ALL_AGENT_TYPES.indexOf(b.agentType as AgentType),
  );
}

export function workerStatusLabel(status: string | undefined): string {
  switch (status) {
    case "HEALTHY":
      return "healthy";
    case "DEGRADED":
      return "degraded";
    case "HALTED":
      return "halted";
    case "STARTING":
      return "starting";
    default:
      return "unknown";
  }
}
