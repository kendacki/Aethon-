import { ALL_AGENT_TYPES, type AgentType } from "../shared/taskPayload.js";
import { DEFAULT_FLEET_HEALTH_URLS } from "../config/fleetDefaults.js";
import { readJsonFile } from "../config/resolveDataPath.js";
import { repo } from "../db/repository.js";
import { syncFleetFromChain } from "./fleetSync.js";

export type FleetHealthStatus = "HEALTHY" | "DEGRADED" | "HALTED" | "PARTIAL" | "UNKNOWN";

export interface WorkerHealthCheck {
  name: string;
  ok: boolean;
  severity: string;
  message: string;
  value?: unknown;
}

export interface WorkerHealthSnapshot {
  status?: string;
  agentType?: string;
  address?: string;
  halted?: boolean;
  haltReasons?: string[];
  checks?: WorkerHealthCheck[];
  metrics?: Record<string, unknown>;
  updatedAt?: string;
  alive?: boolean;
}

export interface FleetAgentHealth {
  role: AgentType;
  address: string | null;
  online: boolean;
  status: "HEALTHY" | "DEGRADED" | "HALTED" | "STARTING" | "UNKNOWN";
  reachable: boolean;
  healthUrl: string | null;
  snapshot: WorkerHealthSnapshot | null;
  error: string | null;
}

export interface FleetHealthSummary {
  status: FleetHealthStatus;
  healthyCount: number;
  degradedCount: number;
  haltedCount: number;
  unknownCount: number;
  totalRoles: number;
  configuredWorkers: number;
  agents: FleetAgentHealth[];
  updatedAt: string;
}

const ROLE_ORDER = ALL_AGENT_TYPES;

function loadHealthUrlMap(): Partial<Record<AgentType, string>> {
  const raw = process.env.AGENT_HEALTH_URLS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const map: Partial<Record<AgentType, string>> = {};
      for (const role of ROLE_ORDER) {
        if (parsed[role]) map[role] = parsed[role].trim();
      }
      return map;
    } catch {
      console.warn("[fleetHealth] AGENT_HEALTH_URLS is not valid JSON");
    }
  }

  const parsed =
    readJsonFile<Record<string, string>>("fleet.health-urls.production.json") ??
    readJsonFile<Record<string, string>>("fleet.health-urls.json");
  if (parsed) {
    const map: Partial<Record<AgentType, string>> = {};
    for (const role of ROLE_ORDER) {
      if (parsed[role]) map[role] = parsed[role].trim();
    }
    if (Object.keys(map).length > 0) return map;
  }

  return { ...DEFAULT_FLEET_HEALTH_URLS };
}

async function fetchWorkerHealth(url: string): Promise<WorkerHealthSnapshot> {
  const base = url.replace(/\/+$/, "");
  const res = await fetch(base, { signal: AbortSignal.timeout(5000) });
  const body = (await res.json()) as WorkerHealthSnapshot;
  if (!res.ok && res.status !== 503) {
    throw new Error(`HTTP ${res.status}`);
  }
  return body;
}

function normalizeStatus(snapshot: WorkerHealthSnapshot | null, reachable: boolean): FleetAgentHealth["status"] {
  if (!reachable || !snapshot) return "UNKNOWN";
  const raw = String(snapshot.status ?? "").toUpperCase();
  if (raw === "HEALTHY" || raw === "DEGRADED" || raw === "HALTED") return raw;
  if (snapshot.alive && raw === "STARTING") return "STARTING";
  if (snapshot.alive) return "HEALTHY";
  return "UNKNOWN";
}

/** Workers with only vault_reserve warnings still count as operational for the dashboard. */
function isWorkerOperational(status: FleetAgentHealth["status"], snapshot: WorkerHealthSnapshot | null): boolean {
  if (status === "HEALTHY" || status === "STARTING") return true;
  if (status !== "DEGRADED" || !snapshot?.checks?.length) return false;
  const failed = snapshot.checks.filter((c) => !c.ok);
  return failed.length > 0 && failed.every((c) => c.name === "vault_reserve");
}

function aggregateFleetStatus(agents: FleetAgentHealth[]): FleetHealthStatus {
  if (agents.every((a) => a.status === "HEALTHY")) return "HEALTHY";
  if (agents.some((a) => a.status === "HALTED")) return "HALTED";
  if (agents.some((a) => a.status === "DEGRADED")) return "DEGRADED";
  if (agents.some((a) => a.status === "HEALTHY")) return "PARTIAL";
  return "UNKNOWN";
}

export async function getFleetHealth(): Promise<FleetHealthSummary> {
  await syncFleetFromChain().catch((err) => {
    console.warn("[fleetHealth] chain sync failed:", err instanceof Error ? err.message : err);
  });

  const urlMap = loadHealthUrlMap();
  const dbAgents = await repo.listAgents({ page: 0, pageSize: 50 });
  const byType = new Map<string, (typeof dbAgents.data)[0]>();
  for (const agent of dbAgents.data) {
    if (!byType.has(agent.agentType)) byType.set(agent.agentType, agent);
  }

  const agents: FleetAgentHealth[] = await Promise.all(
    ROLE_ORDER.map(async (role) => {
      const dbAgent = byType.get(role);
      const healthUrl = urlMap[role] ?? null;
      let snapshot: WorkerHealthSnapshot | null = null;
      let error: string | null = null;
      let reachable = false;

      if (healthUrl) {
        try {
          snapshot = await fetchWorkerHealth(healthUrl);
          reachable = true;
        } catch (err) {
          error = err instanceof Error ? err.message : "Worker unreachable";
        }
      } else {
        error = "Health URL not configured";
      }

      const status = normalizeStatus(snapshot, reachable);
      const chainOnline = dbAgent?.online ?? false;
      const workerUp = isWorkerOperational(status, snapshot);
      const displayStatus = workerUp && status === "DEGRADED" ? "HEALTHY" : status;

      return {
        role,
        address: dbAgent?.address ?? snapshot?.address ?? null,
        online: chainOnline || workerUp,
        status: displayStatus,
        reachable,
        healthUrl,
        snapshot,
        error,
      };
    }),
  );

  const healthyCount = agents.filter((a) => a.status === "HEALTHY").length;
  const degradedCount = agents.filter((a) => a.status === "DEGRADED").length;
  const haltedCount = agents.filter((a) => a.status === "HALTED").length;
  const unknownCount = agents.filter((a) => a.status === "UNKNOWN" || a.status === "STARTING").length;

  return {
    status: aggregateFleetStatus(agents),
    healthyCount,
    degradedCount,
    haltedCount,
    unknownCount,
    totalRoles: ROLE_ORDER.length,
    configuredWorkers: Object.keys(urlMap).length,
    agents,
    updatedAt: new Date().toISOString(),
  };
}

export async function getAgentHealthByAddress(address: string): Promise<FleetAgentHealth | null> {
  const fleet = await getFleetHealth();
  const normalized = address.toLowerCase();
  return fleet.agents.find((a) => a.address?.toLowerCase() === normalized) ?? null;
}
