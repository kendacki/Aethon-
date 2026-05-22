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

class DataStore {
  agents = new Map<string, AgentRecord>();
  tasks = new Map<number, TaskRecord>();
  coalitions = new Map<string, CoalitionRecord>();
  taskCounter = 0;

  upsertAgent(agent: AgentRecord): void {
    this.agents.set(agent.address.toLowerCase(), agent);
  }

  upsertTask(task: TaskRecord): void {
    this.tasks.set(task.id, task);
  }

  upsertCoalition(coalition: CoalitionRecord): void {
    this.coalitions.set(coalition.address.toLowerCase(), coalition);
  }

  listAgents(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  listTasks(filter?: { status?: TaskStatus }): TaskRecord[] {
    let items = Array.from(this.tasks.values());
    if (filter?.status) items = items.filter((t) => t.status === filter.status);
    return items.sort((a, b) => b.id - a.id);
  }

  listCoalitions(): CoalitionRecord[] {
    return Array.from(this.coalitions.values());
  }

  getStats(circuitPaused: boolean, blockNumber: number, chainId: number): GlobalStats {
    const tasks = this.listTasks();
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const agents = this.listAgents();
    const active = agents.filter((a) => a.online).length;
    const tvlWei = agents.reduce((sum, a) => sum + BigInt(a.stake || "0"), 0n);
    const finished = tasks.filter((t) => ["COMPLETED", "FAILED", "EXPIRED"].includes(t.status)).length;

    return {
      agentCount: agents.length,
      activeAgents: active,
      taskCount: tasks.length,
      completedTasks: completed,
      successRate: finished > 0 ? completed / finished : 0,
      tvl: tvlWei.toString(),
      circuitBreakerPaused: circuitPaused,
      chainId,
      blockNumber,
    };
  }
}

export const store = new DataStore();
