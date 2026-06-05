import { env } from "../config/env";
import { authHeaders } from "../auth/token";

const API_BASE = env.apiBase;

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number };
}

export interface Agent {
  address: string;
  agentType: string;
  stake: string;
  reputation: number;
  online: boolean;
  lastHeartbeat: string;
  metadataURI?: string;
}

export interface Task {
  id: number;
  submitter: string;
  taskHash: string;
  reward: string;
  complexity: number;
  deadline: string;
  status: string;
  coalitionAddr?: string;
  authorizedReporter?: string;
  platformFee?: string;
  txHash?: string;
  executionTarget?: string;
  executionPayload?: string;
}

export interface Coalition {
  address: string;
  members: string[];
  leadAgent: string;
  taskId: number;
  dissolved: boolean;
  formed: string;
  totalStake: string;
}

export interface Stats {
  agentCount: number;
  activeAgents: number;
  taskCount: number;
  completedTasks: number;
  successRate: number;
  tvl: string;
  circuitBreakerPaused: boolean;
  chainId: number;
  blockNumber: number;
}

export interface Health {
  status: string;
  database: boolean;
  circuitBreakerPaused: boolean;
  consecutiveFailures: number;
  blockNumber: number;
  lastIndexedBlock: number;
  synced: boolean;
  chainId: number;
}

export interface AgentHealthCheck {
  name: string;
  ok: boolean;
  severity: string;
  message: string;
  value?: unknown;
}

export interface AgentFleetHealth {
  role: string;
  address: string | null;
  online: boolean;
  status: "HEALTHY" | "DEGRADED" | "HALTED" | "STARTING" | "UNKNOWN";
  reachable: boolean;
  healthUrl: string | null;
  snapshot: {
    status?: string;
    checks?: AgentHealthCheck[];
    metrics?: Record<string, unknown>;
    haltReasons?: string[];
    updatedAt?: string;
  } | null;
  error: string | null;
}

export interface FleetHealth {
  status: "HEALTHY" | "DEGRADED" | "HALTED" | "PARTIAL" | "UNKNOWN";
  healthyCount: number;
  degradedCount: number;
  haltedCount: number;
  unknownCount: number;
  totalRoles: number;
  configuredWorkers: number;
  totalStakedWei: string;
  agents: AgentFleetHealth[];
  updatedAt: string;
}

export interface CircuitBreaker {
  paused: boolean;
  consecutiveFailures: number;
  threshold: number;
  resetTimelockSeconds: number;
}

export interface KitModuleRow {
  module: string;
  status: "integrated" | "delegated" | "excluded";
  aethonEquivalent: string;
  reason: string;
}

export interface SomniaReport {
  fit: string;
  agentathonReady: boolean;
  gaps: string[];
  config: {
    enabled: boolean;
    consumerAddr: string | null;
    jsonApiAgentId: string;
    llmAgentId: string;
  };
  network: {
    chainId: number;
    platformAddr: string | null;
    explorer: string | null;
    rpcUrl: string;
  };
  features: {
    somniaPlatformAgents: {
      ready: boolean;
      consumerDeployed: boolean;
      jsonApiOracle: boolean;
      llmGovernanceSummary: boolean;
    };
    aethonOnChain: Record<string, boolean>;
    runtime: Record<string, boolean>;
    somniaKitRegistry: {
      address: string;
      fleetRegistered: boolean;
      agents: Record<string, unknown> | null;
    };
    fleetVault: {
      enabled: boolean;
      address: string | null;
      dailyLimitStt: string;
      note: string;
    };
  };
  somniaAgentKit: {
    integrated: number;
    delegated: number;
    excluded: number;
    modules: KitModuleRow[];
    note: string;
  };
  baseAgents: Record<string, { agentId: string; practicalDepositWei: string; usedBy: string }>;
}

export interface Reputation {
  score: number;
  history: Array<{ oldScore: number; newScore: number; reason: string; createdAt: string }>;
}

async function parseApiJson<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(`API unavailable for ${path}. Received HTML instead of JSON.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API returned invalid JSON for ${path}.`);
  }
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
  if (res.status === 401) throw new Error("Session expired. Connect your wallet and sign in again.");
  if (res.status === 403) throw new Error("Access denied. Sign in with your wallet.");
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return parseApiJson<T>(res, path);
}

export interface WalletTaskStats {
  taskCount: number;
  /** Sum of STT reward attached on submit (escrow), all statuses. */
  totalStakedWei: string;
  /** Locked in TaskMarket while PENDING or ASSIGNED. */
  activeEscrowWei: string;
  /** Paid to agent coalitions on COMPLETED (not returned to submitter). */
  paidToAgentsWei: string;
  /** Returned to submitter wallet on FAILED or EXPIRED. */
  refundedWei: string;
}

export const api = {
  health: () => fetchApi<{ data: Health }>("/health").then((r) => r.data),
  stats: () => fetchApi<{ data: Stats }>("/stats").then((r) => r.data),
  agents: (page = 0, pageSize = 20, type?: string, online?: boolean) => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (type) q.set("type", type);
    if (online !== undefined) q.set("online", String(online));
    return fetchApi<Paginated<Agent>>(`/agents?${q}`);
  },
  agent: (addr: string) => fetchApi<{ data: Agent }>(`/agents/${addr}`).then((r) => r.data),
  agentHealth: async (addr: string) => {
    const res = await fetch(`${API_BASE}/agents/${addr}/health`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}: /agents/${addr}/health`);
    const body = await parseApiJson<{ data: AgentFleetHealth }>(res, `/agents/${addr}/health`);
    return body.data;
  },
  fleetHealth: () => fetchApi<{ data: FleetHealth }>("/agents/fleet-health").then((r) => r.data),
  somniaReport: () => fetchApi<{ data: SomniaReport }>("/somnia/agents").then((r) => r.data),
  agentManifest: (role: string) =>
    fetchApi<{ data: Record<string, unknown> }>(`/agents/manifests/${role}`).then((r) => r.data),
  reputation: (addr: string) => fetchApi<{ data: Reputation }>(`/reputation/${addr}`).then((r) => r.data),
  tasks: (page = 0, status?: string, submitter?: string, pageSize = 20) => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) q.set("status", status);
    if (submitter) q.set("submitter", submitter);
    return fetchApi<Paginated<Task>>(`/tasks?${q}`);
  },
  walletTaskStats: (address: string) =>
    fetchApi<{ data: WalletTaskStats }>(`/tasks/wallet/${address}/stats`).then((r) => r.data),
  coalition: (addr: string) => fetchApi<{ data: Coalition }>(`/coalitions/${addr}`).then((r) => r.data),
  leaderboard: (page = 0) => fetchApi<Paginated<Agent>>(`/leaderboard?page=${page}&pageSize=20`),
  circuitBreaker: () => fetchApi<{ data: CircuitBreaker }>("/circuit-breaker").then((r) => r.data),
  submitTask: (body: unknown) =>
    fetchApi<{ data: unknown }>("/tasks/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  taskDetail: async (id: number) => {
    const path = `/tasks/${id}/detail`;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (res.status === 404) return null;
    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
    if (res.status === 401) throw new Error("Session expired. Connect your wallet and sign in again.");
    if (res.status === 403) throw new Error("Access denied. Sign in with your wallet.");
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    const body = await parseApiJson<{ data: TaskDetailResponse }>(res, path);
    return body.data;
  },
  taskPayload: (hash: string) =>
    fetchApi<{ data: { taskHash: string; payload: Record<string, unknown> } }>(`/tasks/payload/${hash}`).then(
      (r) => r.data.payload,
    ),
};

export type TaskDetailResponse = {
  task: Task;
  payload: Record<string, unknown> | null;
  skillResults: Array<{
    agentType: string;
    agentAddress: string;
    result: { success?: boolean; data?: Record<string, unknown>; error?: string };
  }>;
  evaluation: {
    overallSuccess: boolean;
    summary: string;
    criteria: Array<{ id: string; label: string; met: boolean; detail?: string }>;
    roleSummaries: Array<{ role: string; success: boolean; summary: string }>;
  };
  catalog: { agentWork?: string; sources?: string[] } | null;
  execution: { targetContract: string; executionPayload: string } | null;
  portfolioBriefing?: {
    headline: string;
    atGlance: string;
    sections: Array<{
      role: string;
      title: string;
      summary: string;
      action: string;
      bullets: string[];
    }>;
    nextSteps: string[];
  } | null;
};

export function formatEth(wei: string): string {
  try {
    const v = BigInt(wei) / BigInt(10 ** 15);
    return `${Number(v) / 1000} stt`;
  } catch {
    return wei;
  }
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
