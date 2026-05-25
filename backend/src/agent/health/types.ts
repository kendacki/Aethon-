import type { AgentType } from "../config.js";

export type HealthStatus = "HEALTHY" | "DEGRADED" | "HALTED";

export type CheckSeverity = "info" | "warning" | "critical";

export interface HealthCheck {
  name: string;
  ok: boolean;
  severity: CheckSeverity;
  message: string;
  value?: unknown;
  updatedAt: string;
}

export interface AgentHealthSnapshot {
  status: HealthStatus;
  agentType: AgentType;
  address: string;
  halted: boolean;
  haltReasons: string[];
  checks: HealthCheck[];
  metrics: {
    rpcLatencyMs: number;
    gasPriceGwei: string;
    walletBalanceWei: string;
    tasksInFlight: number;
    heartbeatFailures: number;
    lastHeartbeatAt: string | null;
    uptimeSec: number;
  };
  updatedAt: string;
}

export interface HealthEvent {
  type: string;
  msg: string;
  value?: unknown;
}
