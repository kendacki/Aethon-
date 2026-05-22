export type TaskStatus = "PENDING" | "ASSIGNED" | "COMPLETED" | "FAILED" | "EXPIRED";

export interface AgentRecord {
  address: string;
  agentType: string;
  stake: string;
  reputation: number;
  online: boolean;
  lastHeartbeat: string;
  metadataURI?: string;
}

export interface TaskRecord {
  id: number;
  submitter: string;
  taskHash: string;
  reward: string;
  complexity: number;
  deadline: string;
  status: TaskStatus;
  coalitionAddr?: string;
  authorizedReporter?: string;
  platformFee?: string;
  txHash?: string;
}

export interface CoalitionRecord {
  address: string;
  members: string[];
  leadAgent: string;
  taskId: number;
  dissolved: boolean;
  formed: string;
  totalStake: string;
}

export interface GlobalStats {
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

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number };
}
