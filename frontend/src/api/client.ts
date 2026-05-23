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

export interface CircuitBreaker {
  paused: boolean;
  consecutiveFailures: number;
  threshold: number;
  resetTimelockSeconds: number;
}

export interface Reputation {
  score: number;
  history: Array<{ oldScore: number; newScore: number; reason: string; createdAt: string }>;
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
  return res.json();
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
  reputation: (addr: string) => fetchApi<{ data: Reputation }>(`/reputation/${addr}`).then((r) => r.data),
  tasks: (page = 0, status?: string) => {
    const q = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) q.set("status", status);
    return fetchApi<Paginated<Task>>(`/tasks?${q}`);
  },
  coalition: (addr: string) => fetchApi<{ data: Coalition }>(`/coalitions/${addr}`).then((r) => r.data),
  leaderboard: (page = 0) => fetchApi<Paginated<Agent>>(`/leaderboard?page=${page}&pageSize=20`),
  circuitBreaker: () => fetchApi<{ data: CircuitBreaker }>("/circuit-breaker").then((r) => r.data),
  submitTask: (body: unknown) =>
    fetchApi<{ data: unknown }>("/tasks/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function formatEth(wei: string): string {
  try {
    const v = BigInt(wei) / BigInt(10 ** 15);
    return `${Number(v) / 1000} STT`;
  } catch {
    return wei;
  }
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
