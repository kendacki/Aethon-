import type { Agent, AgentFleetHealth, FleetHealth } from "../api/client";

export function healthByRoleMap(fleet: FleetHealth | null): Map<string, AgentFleetHealth> {
  const map = new Map<string, AgentFleetHealth>();
  fleet?.agents.forEach((a) => map.set(a.role, a));
  return map;
}

function workerVaultOnlyDegraded(worker: AgentFleetHealth | undefined): boolean {
  const checks = worker?.snapshot?.checks ?? [];
  if (!checks.length) return false;
  const failed = checks.filter((c) => !c.ok);
  return failed.length > 0 && failed.every((c) => c.name === "vault_reserve");
}

export function isAgentOperational(agent: Agent, worker: AgentFleetHealth | undefined): boolean {
  if (agent.online) return true;
  if (worker?.online) return true;
  if (worker?.status === "HEALTHY" || worker?.status === "STARTING") return true;
  if (worker?.status === "DEGRADED" && workerVaultOnlyDegraded(worker)) return true;
  return false;
}

export function workerBadgeStatus(
  agent: Agent,
  worker: AgentFleetHealth | undefined,
): "online" | "offline" | undefined {
  if (!isAgentOperational(agent, worker)) return "offline";
  if (worker?.status === "HEALTHY") return "online";
  if (worker?.status === "HALTED") return "offline";
  return undefined;
}

export function countOperationalAgents(agents: Agent[], healthMap: Map<string, AgentFleetHealth>): number {
  return agents.filter((a) => isAgentOperational(a, healthMap.get(a.agentType))).length;
}
