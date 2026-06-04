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
  userQuery?: string;
  intent?: string;
  successCriteria?: SuccessCriterion[];
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
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(canonicalizePayload(payload))));
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
      params: { proposalId: "AIP1", supportStakeEth: 12, againstStakeEth: 4, quorumEth: 10 },
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
    label: "Swarm task",
  };
}

export async function signTaskSubmission(
  signer: ethers.JsonRpcSigner,
  submitter: string,
  taskHash: string,
  complexity: number,
  rewardWei: string,
): Promise<string> {
  const digest = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256", "uint256"],
    [submitter, taskHash, complexity, rewardWei],
  );
  return signer.signMessage(ethers.getBytes(digest));
}

export function parseEthToWei(eth: string): string {
  return ethers.parseEther(eth || "0").toString();
}
