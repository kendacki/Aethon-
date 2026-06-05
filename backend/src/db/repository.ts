import type {
  AgentRecord,
  CoalitionRecord,
  GlobalStats,
  PaginationParams,
  PaginatedResult,
  TaskRecord,
  TaskStatus,
} from "../services/types.js";
import { query } from "./client.js";

function paginate<T>(items: T[], page: number, pageSize: number, total: number): PaginatedResult<T> {
  return { data: items, pagination: { page, pageSize, total } };
}

export const repo = {
  async upsertAgent(agent: AgentRecord): Promise<void> {
    await query(
      `INSERT INTO agents (address, agent_type, stake, reputation, online, last_heartbeat, metadata_uri, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (address) DO UPDATE SET
         agent_type=EXCLUDED.agent_type, stake=EXCLUDED.stake, reputation=EXCLUDED.reputation,
         online=EXCLUDED.online, last_heartbeat=EXCLUDED.last_heartbeat,
         metadata_uri=EXCLUDED.metadata_uri, updated_at=NOW()`,
      [
        agent.address.toLowerCase(),
        agent.agentType,
        agent.stake,
        agent.reputation,
        agent.online,
        agent.lastHeartbeat ? new Date(agent.lastHeartbeat) : null,
        agent.metadataURI ?? null,
      ]
    );
  },

  async getAgent(address: string): Promise<AgentRecord | null> {
    const r = await query(`SELECT * FROM agents WHERE address = $1`, [address.toLowerCase()]);
    if (!r.rows[0]) return null;
    return rowToAgent(r.rows[0]);
  },

  async listAgents(opts: PaginationParams & { type?: string; online?: boolean }): Promise<PaginatedResult<AgentRecord>> {
    const page = opts.page ?? 0;
    const pageSize = opts.pageSize ?? 20;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (opts.type) {
      conditions.push(`agent_type = $${i++}`);
      params.push(opts.type);
    }
    if (opts.online !== undefined) {
      conditions.push(`online = $${i++}`);
      params.push(opts.online);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countR = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM agents ${where}`, params);
    const total = Number(countR.rows[0]?.count ?? 0);
    params.push(pageSize, page * pageSize);
    const r = await query(
      `SELECT * FROM agents ${where} ORDER BY reputation DESC LIMIT $${i++} OFFSET $${i}`,
      params
    );
    return paginate(r.rows.map(rowToAgent), page, pageSize, total);
  },

  /** Ranked list: highest reputation first, then stake, then address for stable ties. */
  async listLeaderboard(opts: PaginationParams): Promise<PaginatedResult<AgentRecord>> {
    const page = opts.page ?? 0;
    const pageSize = opts.pageSize ?? 20;
    const countR = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM agents`);
    const total = Number(countR.rows[0]?.count ?? 0);
    const r = await query(
      `SELECT * FROM agents
       ORDER BY reputation DESC, stake::numeric DESC, address ASC
       LIMIT $1 OFFSET $2`,
      [pageSize, page * pageSize]
    );
    return paginate(r.rows.map(rowToAgent), page, pageSize, total);
  },

  async upsertTask(task: TaskRecord): Promise<void> {
    await query(
      `INSERT INTO tasks (id, submitter, task_hash, reward, complexity, deadline, status,
        coalition_addr, authorized_reporter, platform_fee, tx_hash, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (id) DO UPDATE SET
         submitter=EXCLUDED.submitter, task_hash=EXCLUDED.task_hash, reward=EXCLUDED.reward,
         complexity=EXCLUDED.complexity, deadline=EXCLUDED.deadline, status=EXCLUDED.status,
         coalition_addr=EXCLUDED.coalition_addr, authorized_reporter=EXCLUDED.authorized_reporter,
         platform_fee=EXCLUDED.platform_fee, tx_hash=COALESCE(EXCLUDED.tx_hash, tasks.tx_hash),
         updated_at=NOW()`,
      [
        task.id,
        task.submitter.toLowerCase(),
        task.taskHash,
        task.reward,
        task.complexity,
        task.deadline ? new Date(task.deadline) : null,
        task.status,
        task.coalitionAddr?.toLowerCase() ?? null,
        task.authorizedReporter?.toLowerCase() ?? null,
        task.platformFee ?? null,
        task.txHash ?? null,
      ]
    );
  },

  async getTask(id: number): Promise<TaskRecord | null> {
    const r = await query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (!r.rows[0]) return null;
    return rowToTask(r.rows[0]);
  },

  async listTasks(
    opts: PaginationParams & { status?: TaskStatus; complexity?: number; submitter?: string }
  ): Promise<PaginatedResult<TaskRecord>> {
    const page = opts.page ?? 0;
    const pageSize = opts.pageSize ?? 20;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (opts.status) {
      conditions.push(`status = $${i++}`);
      params.push(opts.status);
    }
    if (opts.complexity !== undefined) {
      conditions.push(`complexity = $${i++}`);
      params.push(opts.complexity);
    }
    if (opts.submitter) {
      conditions.push(`submitter = $${i++}`);
      params.push(opts.submitter.toLowerCase());
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countR = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM tasks ${where}`, params);
    const total = Number(countR.rows[0]?.count ?? 0);
    params.push(pageSize, page * pageSize);
    const r = await query(
      `SELECT * FROM tasks ${where} ORDER BY id DESC LIMIT $${i++} OFFSET $${i}`,
      params
    );
    return paginate(r.rows.map(rowToTask), page, pageSize, total);
  },

  async getSubmitterStats(submitter: string): Promise<{
    taskCount: number;
    totalStakedWei: string;
    activeEscrowWei: string;
    paidToAgentsWei: string;
    refundedWei: string;
  }> {
    const r = await query<{
      count: string;
      total_staked: string;
      active_escrow: string;
      paid_to_agents: string;
      refunded: string;
    }>(
      `SELECT COUNT(*)::text AS count,
              COALESCE(SUM(reward::numeric), 0)::text AS total_staked,
              COALESCE(SUM(reward::numeric) FILTER (WHERE status IN ('PENDING', 'ASSIGNED')), 0)::text AS active_escrow,
              COALESCE(SUM(reward::numeric) FILTER (WHERE status = 'COMPLETED'), 0)::text AS paid_to_agents,
              COALESCE(SUM(reward::numeric) FILTER (WHERE status IN ('FAILED', 'EXPIRED')), 0)::text AS refunded
       FROM tasks WHERE submitter = $1`,
      [submitter.toLowerCase()]
    );
    const row = r.rows[0];
    return {
      taskCount: Number(row?.count ?? 0),
      totalStakedWei: BigInt(row?.total_staked ?? 0).toString(),
      activeEscrowWei: BigInt(row?.active_escrow ?? 0).toString(),
      paidToAgentsWei: BigInt(row?.paid_to_agents ?? 0).toString(),
      refundedWei: BigInt(row?.refunded ?? 0).toString(),
    };
  },

  async upsertCoalition(c: CoalitionRecord): Promise<void> {
    await query(
      `INSERT INTO coalitions (address, members, lead_agent, task_id, dissolved, total_stake, formed, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (address) DO UPDATE SET
         members=EXCLUDED.members, lead_agent=EXCLUDED.lead_agent, task_id=EXCLUDED.task_id,
         dissolved=EXCLUDED.dissolved, total_stake=EXCLUDED.total_stake, updated_at=NOW()`,
      [
        c.address.toLowerCase(),
        JSON.stringify(c.members.map((m) => m.toLowerCase())),
        c.leadAgent.toLowerCase(),
        c.taskId,
        c.dissolved,
        c.totalStake,
        new Date(c.formed),
      ]
    );
  },

  async getCoalition(address: string): Promise<CoalitionRecord | null> {
    const r = await query(`SELECT * FROM coalitions WHERE address = $1`, [address.toLowerCase()]);
    if (!r.rows[0]) return null;
    return rowToCoalition(r.rows[0]);
  },

  async listCoalitions(
    opts: PaginationParams & { dissolved?: boolean; taskId?: number }
  ): Promise<PaginatedResult<CoalitionRecord>> {
    const page = opts.page ?? 0;
    const pageSize = opts.pageSize ?? 20;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (opts.dissolved !== undefined) {
      conditions.push(`dissolved = $${i++}`);
      params.push(opts.dissolved);
    }
    if (opts.taskId !== undefined) {
      conditions.push(`task_id = $${i++}`);
      params.push(opts.taskId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countR = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM coalitions ${where}`, params);
    const total = Number(countR.rows[0]?.count ?? 0);
    params.push(pageSize, page * pageSize);
    const r = await query(
      `SELECT * FROM coalitions ${where} ORDER BY formed DESC LIMIT $${i++} OFFSET $${i}`,
      params
    );
    return paginate(r.rows.map(rowToCoalition), page, pageSize, total);
  },

  async addReputationEvent(
    agent: string,
    oldScore: number,
    newScore: number,
    reason: string,
    blockNumber?: number,
    txHash?: string
  ): Promise<void> {
    await query(
      `INSERT INTO reputation_events (agent, old_score, new_score, reason, block_number, tx_hash)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [agent.toLowerCase(), oldScore, newScore, reason, blockNumber ?? null, txHash ?? null]
    );
    await query(`UPDATE agents SET reputation = $2, updated_at = NOW() WHERE address = $1`, [
      agent.toLowerCase(),
      newScore,
    ]);
  },

  async getReputation(address: string): Promise<{ score: number; history: Array<{ oldScore: number; newScore: number; reason: string; createdAt: string }> }> {
    const agent = await this.getAgent(address);
    const r = await query(
      `SELECT old_score, new_score, reason, created_at FROM reputation_events
       WHERE agent = $1 ORDER BY created_at DESC LIMIT 50`,
      [address.toLowerCase()]
    );
    return {
      score: agent?.reputation ?? 100,
      history: r.rows.map((row) => ({
        oldScore: row.old_score,
        newScore: row.new_score,
        reason: row.reason,
        createdAt: row.created_at.toISOString(),
      })),
    };
  },

  async getStats(circuitPaused: boolean, blockNumber: number, chainId: number): Promise<GlobalStats> {
    const [agentsR, tasksR, tvlR] = await Promise.all([
      query<{ total: string; active: string }>(
        `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE online)::text AS active FROM agents`
      ),
      query<{ total: string; completed: string; finished: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS completed,
                COUNT(*) FILTER (WHERE status IN ('COMPLETED','FAILED','EXPIRED'))::text AS finished
         FROM tasks`
      ),
      query<{ tvl: string }>(`SELECT COALESCE(SUM(stake::numeric), 0)::text AS tvl FROM agents`),
    ]);
    const completed = Number(tasksR.rows[0]?.completed ?? 0);
    const finished = Number(tasksR.rows[0]?.finished ?? 0);
    return {
      agentCount: Number(agentsR.rows[0]?.total ?? 0),
      activeAgents: Number(agentsR.rows[0]?.active ?? 0),
      taskCount: Number(tasksR.rows[0]?.total ?? 0),
      completedTasks: completed,
      successRate: finished > 0 ? completed / finished : 0,
      tvl: tvlR.rows[0]?.tvl ?? "0",
      circuitBreakerPaused: circuitPaused,
      chainId,
      blockNumber,
    };
  },

  async getIndexerBlock(): Promise<number> {
    const r = await query<{ last_block: string }>(`SELECT last_block::text FROM indexer_state WHERE id = 'main'`);
    return Number(r.rows[0]?.last_block ?? 0);
  },

  async setIndexerBlock(block: number): Promise<void> {
    await query(`UPDATE indexer_state SET last_block = $1, updated_at = NOW() WHERE id = 'main'`, [block]);
  },

  async enqueueTaskOutbox(row: {
    submitter: string;
    taskHash: string;
    complexity: number;
    rewardWei: string;
    signature: string;
  }): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO task_outbox (submitter, task_hash, complexity, reward_wei, signature)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [row.submitter.toLowerCase(), row.taskHash, row.complexity, row.rewardWei, row.signature]
    );
    return r.rows[0].id;
  },

  async getPendingOutbox(limit = 10): Promise<
    Array<{ id: number; submitter: string; taskHash: string; complexity: number; rewardWei: string; signature: string }>
  > {
    const r = await query(
      `SELECT id, submitter, task_hash, complexity, reward_wei, signature FROM task_outbox
       WHERE status = 'PENDING' ORDER BY id ASC LIMIT $1`,
      [limit]
    );
    return r.rows.map((row) => ({
      id: row.id,
      submitter: row.submitter,
      taskHash: row.task_hash,
      complexity: row.complexity,
      rewardWei: row.reward_wei,
      signature: row.signature,
    }));
  },

  async markOutboxSubmitted(id: number, onChainTaskId: number, txHash: string): Promise<void> {
    await query(
      `UPDATE task_outbox SET status = 'SUBMITTED', on_chain_task_id = $2, tx_hash = $3, updated_at = NOW() WHERE id = $1`,
      [id, onChainTaskId, txHash]
    );
  },

  async markOutboxFailed(id: number, error: string): Promise<void> {
    await query(
      `UPDATE task_outbox SET status = 'FAILED', error_message = $2, updated_at = NOW() WHERE id = $1`,
      [id, error]
    );
  },

  async getTaskPayer(onChainTaskId: number): Promise<string | null> {
    const r = await query<{ submitter: string }>(
      `SELECT submitter FROM task_outbox
       WHERE on_chain_task_id = $1 AND status = 'SUBMITTED'
       ORDER BY id DESC LIMIT 1`,
      [onChainTaskId]
    );
    return r.rows[0]?.submitter ?? null;
  },

  async saveTaskPayload(taskHash: string, payload: unknown): Promise<void> {
    await query(
      `INSERT INTO task_payloads (task_hash, payload) VALUES ($1, $2)
       ON CONFLICT (task_hash) DO UPDATE SET payload = EXCLUDED.payload`,
      [taskHash.toLowerCase(), JSON.stringify(payload)]
    );
  },

  async getTaskPayload(taskHash: string): Promise<unknown | null> {
    const r = await query(`SELECT payload FROM task_payloads WHERE task_hash = $1`, [taskHash.toLowerCase()]);
    if (!r.rows[0]) return null;
    return r.rows[0].payload;
  },

  async addCoalitionIntent(row: {
    taskId: number;
    agentAddress: string;
    agentType: string;
    signature?: string | null;
    members?: string[] | null;
  }): Promise<void> {
    await query(
      `INSERT INTO task_coalition_intents (task_id, agent_address, agent_type, signature)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (task_id, agent_address) DO UPDATE SET
         signature = COALESCE(EXCLUDED.signature, task_coalition_intents.signature),
         agent_type = EXCLUDED.agent_type`,
      [row.taskId, row.agentAddress.toLowerCase(), row.agentType, row.signature ?? ""]
    );
  },

  async getCoalitionIntents(taskId: number): Promise<
    Array<{ agentAddress: string; agentType: string; signature?: string }>
  > {
    const r = await query(
      `SELECT agent_address, agent_type, signature FROM task_coalition_intents WHERE task_id = $1 ORDER BY created_at ASC`,
      [taskId]
    );
    return r.rows.map((row) => ({
      agentAddress: row.agent_address,
      agentType: row.agent_type,
      signature: row.signature || undefined,
    }));
  },

  async saveSkillResult(row: {
    taskId: number;
    agentAddress: string;
    agentType: string;
    result: unknown;
  }): Promise<void> {
    await query(
      `INSERT INTO task_skill_results (task_id, agent_address, agent_type, result)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (task_id, agent_address) DO UPDATE SET result = EXCLUDED.result, agent_type = EXCLUDED.agent_type`,
      [row.taskId, row.agentAddress.toLowerCase(), row.agentType, JSON.stringify(row.result)]
    );
  },

  async getSkillResults(taskId: number): Promise<
    Array<{ agentAddress: string; agentType: string; result: unknown }>
  > {
    const r = await query(
      `SELECT agent_address, agent_type, result FROM task_skill_results WHERE task_id = $1`,
      [taskId]
    );
    return r.rows.map((row) => ({
      agentAddress: row.agent_address,
      agentType: row.agent_type,
      result: row.result,
    }));
  },

  async saveTaskExecution(taskId: number, targetContract: string, executionPayload: string): Promise<void> {
    await query(
      `UPDATE tasks SET execution_target = $2, execution_payload = $3, updated_at = NOW() WHERE id = $1`,
      [taskId, targetContract.toLowerCase(), executionPayload],
    );
  },
};

function rowToAgent(row: Record<string, unknown>): AgentRecord {
  return {
    address: row.address as string,
    agentType: row.agent_type as string,
    stake: row.stake as string,
    reputation: row.reputation as number,
    online: row.online as boolean,
    lastHeartbeat: row.last_heartbeat ? (row.last_heartbeat as Date).toISOString() : new Date().toISOString(),
    metadataURI: (row.metadata_uri as string) ?? undefined,
  };
}

function rowToTask(row: Record<string, unknown>): TaskRecord {
  return {
    id: Number(row.id),
    submitter: row.submitter as string,
    taskHash: row.task_hash as string,
    reward: row.reward as string,
    complexity: row.complexity as number,
    deadline: row.deadline ? (row.deadline as Date).toISOString() : new Date().toISOString(),
    status: row.status as TaskStatus,
    coalitionAddr: (row.coalition_addr as string) ?? undefined,
    authorizedReporter: (row.authorized_reporter as string) ?? undefined,
    platformFee: (row.platform_fee as string) ?? undefined,
    txHash: (row.tx_hash as string) ?? undefined,
    executionTarget: (row.execution_target as string) ?? undefined,
    executionPayload: (row.execution_payload as string) ?? undefined,
  };
}

function rowToCoalition(row: Record<string, unknown>): CoalitionRecord {
  const members = row.members as string[];
  return {
    address: row.address as string,
    members: Array.isArray(members) ? members : JSON.parse(members as string),
    leadAgent: row.lead_agent as string,
    taskId: Number(row.task_id),
    dissolved: row.dissolved as boolean,
    totalStake: row.total_stake as string,
    formed: (row.formed as Date).toISOString(),
  };
}
