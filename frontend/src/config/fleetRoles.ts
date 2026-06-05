import type { AgentType } from "../task/payload";
import { ALL_AGENT_TYPES } from "../task/payload";

export type FleetRoleMeta = {
  type: AgentType;
  label: string;
  shortLabel: string;
  description: string;
};

export const FLEET_ROLE_META: Record<AgentType, FleetRoleMeta> = {
  ARBITRAGE: {
    type: "ARBITRAGE",
    label: "Arbitrage",
    shortLabel: "ARB",
    description: "Compares DEX prices to a live reference and recommends trade or hold.",
  },
  ORACLE: {
    type: "ORACLE",
    label: "Oracle",
    shortLabel: "ORC",
    description: "Fetches USD prices, checks freshness, and signs an attestation.",
  },
  YIELD_OPT: {
    type: "YIELD_OPT",
    label: "Yield optimizer",
    shortLabel: "YLD",
    description: "Builds vault allocation from the on-chain catalog.",
  },
  GOVERNANCE: {
    type: "GOVERNANCE",
    label: "Governance",
    shortLabel: "GOV",
    description: "Evaluates quorum and vote ratio.",
  },
  RISK_MGMT: {
    type: "RISK_MGMT",
    label: "Risk management",
    shortLabel: "RSK",
    description: "Scores fleet health from circuit breaker and agent reserves.",
  },
};

export function sortAgentsByRole<T extends { agentType: string }>(agents: T[]): T[] {
  return [...agents].sort(
    (a, b) =>
      ALL_AGENT_TYPES.indexOf(a.agentType as AgentType) - ALL_AGENT_TYPES.indexOf(b.agentType as AgentType),
  );
}

export function workerStatusLabel(status: string | undefined): string {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DEGRADED":
      return "Degraded";
    case "HALTED":
      return "Halted";
    case "STARTING":
      return "Starting";
    default:
      return "Unknown";
  }
}
