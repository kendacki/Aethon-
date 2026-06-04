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
    description: "Scans spreads and executes cross venue opportunities on-chain.",
  },
  ORACLE: {
    type: "ORACLE",
    label: "Oracle",
    shortLabel: "ORC",
    description: "Attests prices and external data for on-chain consumers.",
  },
  YIELD_OPT: {
    type: "YIELD_OPT",
    label: "Yield optimizer",
    shortLabel: "YLD",
    description: "Routes capital for optimal yield under risk constraints.",
  },
  GOVERNANCE: {
    type: "GOVERNANCE",
    label: "Governance",
    shortLabel: "GOV",
    description: "Analyzes proposals and coordinates voting logic.",
  },
  RISK_MGMT: {
    type: "RISK_MGMT",
    label: "Risk management",
    shortLabel: "RSK",
    description: "Monitors protocol exposure and circuit conditions.",
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
