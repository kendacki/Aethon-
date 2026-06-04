import { ethers } from "ethers";
import { repo } from "../db/repository.js";
import { syncFleetFromChain } from "./fleetSync.js";
import { eventBus } from "./eventBus.js";
import type { AgentRecord, CoalitionRecord, TaskRecord, TaskStatus } from "./types.js";

const AGENT_TYPES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const TASK_STATUS: TaskStatus[] = ["PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const CONTRACTS = {
  registry: process.env.AGENT_REGISTRY_ADDR,
  repEngine: process.env.REPUTATION_ENGINE_ADDR,
  circuitBreaker: process.env.CIRCUIT_BREAKER_ADDR,
  taskMarket: process.env.TASK_MARKET_ADDR,
  coalitionMgr: process.env.COALITION_MANAGER_ADDR,
};

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
  "event AgentRegistered(address indexed wallet, uint8 agentType)",
  "event AgentOffline(address indexed wallet, string reason)",
  "event AgentSlashed(address indexed wallet, uint256 amount, string reason)",
  "event StakeCredited(address indexed wallet, uint256 amount)",
];

const REP_ABI = [
  "function getScore(address) view returns (uint256)",
  "event ScoreUpdated(address indexed agent, uint256 oldScore, uint256 newScore, string reason)",
];

const CB_ABI = [
  "function isPaused() view returns (bool)",
  "function consecutiveFailures() view returns (uint256)",
  "event CircuitBroken(uint256 failures, uint256 timestamp)",
  "event CircuitReset(address guardian, uint256 timestamp)",
];

const TASK_ABI = [
  "function taskCounter() view returns (uint256)",
  "function tasks(uint256) view returns (uint256 id, address submitter, bytes32 taskHash, uint256 reward, uint256 complexity, uint256 deadline, uint8 status, address coalitionAddr, address authorizedReporter, uint256 platformFee)",
  "event TaskSubmitted(uint256 indexed id, address submitter, uint256 reward, uint256 complexity)",
  "event TaskAssigned(uint256 indexed id, address coalition, address reporter)",
  "event TaskCompleted(uint256 indexed id, uint256 payout, uint256 fee)",
  "event TaskFailed(uint256 indexed id, string reason)",
  "event TaskExpired(uint256 indexed id)",
];

const COALITION_ABI = [
  "event CoalitionFormed(address indexed coalition, address lead, address[] members, uint256 taskId)",
  "event CoalitionDissolved(address indexed coalition, string reason)",
  "event RewardDistributed(address indexed coalition, uint256 total)",
];

const DEFAULT_BATCH_BLOCKS = 1000;
const MAX_BATCH_BLOCKS = 1000;

export class ChainIndexer {
  provider: ethers.JsonRpcProvider;
  private running = false;
  private lastCircuitPaused = false;
  private lastRpcError: string | null = null;

  constructor() {
    const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
    this.provider = new ethers.JsonRpcProvider(rpc);
  }

  private batchBlocks(): number {
    const configured = Number(process.env.INDEXER_BATCH_BLOCKS ?? DEFAULT_BATCH_BLOCKS);
    if (!Number.isFinite(configured) || configured < 1) return DEFAULT_BATCH_BLOCKS;
    return Math.min(configured, MAX_BATCH_BLOCKS);
  }

  private logRpcError(context: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.lastRpcError = message;
    console.error(`[Indexer] ${context}: ${message}`);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.runCycle().catch((err) => this.logRpcError("startup cycle", err));
    setInterval(
      () => this.runCycle().catch((err) => this.logRpcError("index cycle", err)),
      Number(process.env.INDEXER_INTERVAL_MS ?? 12_000),
    );
  }

  async runCycle(): Promise<void> {
    if (!CONTRACTS.taskMarket) return;

    try {
      const head = await this.provider.getBlockNumber();
      let from = await repo.getIndexerBlock();
      const startBlock = Number(process.env.INDEXER_START_BLOCK ?? 0);
      if (from < startBlock) from = startBlock;

      if (from >= head) {
        await this.syncTaskState();
        await syncFleetFromChain();
        return;
      }

      const to = Math.min(from + this.batchBlocks(), head);
      await this.indexRange(from + 1, to);
      await repo.setIndexerBlock(to);
      await this.syncTaskState();
      await syncFleetFromChain();

      const paused = await this.isCircuitPaused();
      if (paused && !this.lastCircuitPaused) {
        eventBus.publish("circuit_breaker", "CIRCUIT_BREAK", { paused: true });
      }
      if (!paused && this.lastCircuitPaused) {
        eventBus.publish("circuit_breaker", "CIRCUIT_RESET", { paused: false });
      }
      this.lastCircuitPaused = paused;
      this.lastRpcError = null;
    } catch (err) {
      this.logRpcError("runCycle", err);
    }
  }

  /** Refresh tasks and fleet rows from chain (no log backfill). */
  async syncLiveState(): Promise<void> {
    await this.syncTaskState();
    await syncFleetFromChain();
  }

  async getSyncStatus(): Promise<{ lastIndexedBlock: number; headBlock: number; synced: boolean }> {
    try {
      const [lastIndexedBlock, headBlock] = await Promise.all([
        repo.getIndexerBlock(),
        this.provider.getBlockNumber(),
      ]);
      return { lastIndexedBlock, headBlock, synced: headBlock - lastIndexedBlock <= 5 };
    } catch (err) {
      this.logRpcError("getSyncStatus", err);
      const lastIndexedBlock = await repo.getIndexerBlock().catch(() => 0);
      return { lastIndexedBlock, headBlock: lastIndexedBlock, synced: false };
    }
  }

  private async indexRange(from: number, to: number): Promise<void> {
    const specs: Array<{ addr: string; iface: ethers.Interface }> = [];
    if (CONTRACTS.registry) specs.push({ addr: CONTRACTS.registry, iface: new ethers.Interface(REGISTRY_ABI) });
    if (CONTRACTS.repEngine) specs.push({ addr: CONTRACTS.repEngine, iface: new ethers.Interface(REP_ABI) });
    if (CONTRACTS.circuitBreaker) specs.push({ addr: CONTRACTS.circuitBreaker, iface: new ethers.Interface(CB_ABI) });
    if (CONTRACTS.taskMarket) specs.push({ addr: CONTRACTS.taskMarket, iface: new ethers.Interface(TASK_ABI) });
    if (CONTRACTS.coalitionMgr) specs.push({ addr: CONTRACTS.coalitionMgr, iface: new ethers.Interface(COALITION_ABI) });

    for (const spec of specs) {
      try {
        const logs = await this.provider.getLogs({ address: spec.addr, fromBlock: from, toBlock: to });
        for (const log of logs) {
          try {
            const parsed = spec.iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed) await this.handleEvent(parsed.name, parsed.args, log.blockNumber, log.transactionHash);
          } catch {
            /* skip unparseable log */
          }
        }
      } catch (err) {
        this.logRpcError(`getLogs ${spec.addr} blocks ${from}-${to}`, err);
      }
    }
  }

  private async handleEvent(name: string, args: ethers.Result, blockNumber: number, txHash: string): Promise<void> {
    switch (name) {
      case "AgentRegistered": {
        const wallet = args[0] as string;
        const agentType = Number(args[1]);
        const full = await this.fetchAgent(wallet);
        const record = full ?? {
          address: wallet,
          agentType: AGENT_TYPES[agentType] ?? "ARBITRAGE",
          stake: "0",
          reputation: 100,
          online: true,
          lastHeartbeat: new Date().toISOString(),
        };
        await repo.upsertAgent(record);
        eventBus.publish("agents", "AGENT_REGISTERED", { ...record });
        break;
      }
      case "StakeCredited": {
        const wallet = (args[0] as string).toLowerCase();
        const full = await this.fetchAgent(wallet);
        if (full) {
          await repo.upsertAgent(full);
          eventBus.publish("agents", "STAKE_CREDITED", { address: wallet, amount: args[1].toString() });
        }
        break;
      }
      case "AgentOffline": {
        const wallet = (args[0] as string).toLowerCase();
        const agent = await repo.getAgent(wallet);
        if (agent) {
          agent.online = false;
          await repo.upsertAgent(agent);
        }
        eventBus.publish("agents", "AGENT_OFFLINE", { address: wallet, reason: args[1] });
        break;
      }
      case "ScoreUpdated": {
        const agent = args[0] as string;
        await repo.addReputationEvent(agent, Number(args[1]), Number(args[2]), args[3] as string, blockNumber, txHash);
        eventBus.publish("agents", "SCORE_UPDATED", { agent, oldScore: Number(args[1]), newScore: Number(args[2]) });
        break;
      }
      case "TaskSubmitted": {
        const id = Number(args[0]);
        await this.syncTaskById(id, txHash);
        eventBus.publish("tasks", "TASK_SUBMITTED", { taskId: id, reward: args[2].toString() });
        break;
      }
      case "TaskAssigned": {
        const id = Number(args[0]);
        await this.syncTaskById(id, txHash);
        eventBus.publish("tasks", "TASK_ASSIGNED", { taskId: id, coalition: args[1], reporter: args[2] });
        break;
      }
      case "TaskCompleted": {
        const id = Number(args[0]);
        await this.syncTaskById(id, txHash);
        eventBus.publish("tasks", "TASK_COMPLETED", { taskId: id, payout: args[1].toString(), fee: args[2].toString() });
        break;
      }
      case "TaskFailed": {
        const id = Number(args[0]);
        await this.syncTaskById(id, txHash);
        eventBus.publish("tasks", "TASK_FAILED", { taskId: id, reason: args[1] });
        break;
      }
      case "TaskExpired": {
        const id = Number(args[0]);
        await this.syncTaskById(id, txHash);
        eventBus.publish("tasks", "TASK_EXPIRED", { taskId: id });
        break;
      }
      case "CoalitionFormed": {
        const record: CoalitionRecord = {
          address: args[0] as string,
          leadAgent: args[1] as string,
          members: [...(args[2] as string[])],
          taskId: Number(args[3]),
          dissolved: false,
          formed: new Date().toISOString(),
          totalStake: "0",
        };
        await repo.upsertCoalition(record);
        eventBus.publish("coalitions", "COALITION_FORMED", { coalition: record.address, taskId: record.taskId });
        break;
      }
      case "CoalitionDissolved": {
        const addr = (args[0] as string).toLowerCase();
        const c = await repo.getCoalition(addr);
        if (c) {
          c.dissolved = true;
          await repo.upsertCoalition(c);
        }
        eventBus.publish("coalitions", "COALITION_DISSOLVED", { coalition: addr, reason: args[1] });
        break;
      }
      case "CircuitBroken":
        eventBus.publish("circuit_breaker", "CIRCUIT_BREAK", { failures: Number(args[0]) });
        break;
      case "CircuitReset":
        eventBus.publish("circuit_breaker", "CIRCUIT_RESET", { guardian: args[0] });
        break;
    }
  }

  private async syncTaskState(): Promise<void> {
    if (!CONTRACTS.taskMarket) return;
    try {
      const market = new ethers.Contract(CONTRACTS.taskMarket, TASK_ABI, this.provider);
      const counter = Number(await market.taskCounter());
      for (let id = 1; id <= counter; id++) {
        try {
          await this.syncTaskById(id);
        } catch (err) {
          this.logRpcError(`syncTaskById(${id})`, err);
        }
      }
    } catch (err) {
      this.logRpcError("syncTaskState", err);
    }
  }

  private async syncTaskById(id: number, txHash?: string): Promise<void> {
    if (!CONTRACTS.taskMarket) return;
    try {
      const market = new ethers.Contract(CONTRACTS.taskMarket, TASK_ABI, this.provider);
      const t = await market.tasks(id);
      let status = TASK_STATUS[Number(t.status)] ?? "PENDING";
      if (status === "PENDING") {
        const now = Math.floor(Date.now() / 1000);
        if (now > Number(t.deadline)) status = "EXPIRED";
      }

      const task: TaskRecord = {
        id: Number(t.id),
        submitter: t.submitter,
        taskHash: t.taskHash,
        reward: t.reward.toString(),
        complexity: Number(t.complexity),
        deadline: new Date(Number(t.deadline) * 1000).toISOString(),
        status,
        coalitionAddr: t.coalitionAddr !== ethers.ZeroAddress ? t.coalitionAddr : undefined,
        authorizedReporter: t.authorizedReporter !== ethers.ZeroAddress ? t.authorizedReporter : undefined,
        platformFee: t.platformFee?.toString(),
        txHash,
      };
      await repo.upsertTask(task);
    } catch (err) {
      this.logRpcError(`syncTaskById(${id})`, err);
    }
  }

  async fetchAgent(address: string): Promise<AgentRecord | null> {
    if (!CONTRACTS.registry) return null;
    const registry = new ethers.Contract(CONTRACTS.registry, REGISTRY_ABI, this.provider);
    const a = await registry.agents(address);
    let reputation = 100;
    if (CONTRACTS.repEngine) {
      const rep = new ethers.Contract(CONTRACTS.repEngine, REP_ABI, this.provider);
      reputation = Number(await rep.getScore(address));
    }
    const online = await registry.isAgentActive(address);
    return {
      address,
      agentType: AGENT_TYPES[Number(a.agentType)] ?? "ARBITRAGE",
      stake: a.stake.toString(),
      reputation,
      online,
      lastHeartbeat: new Date(Number(a.lastHeartbeat) * 1000).toISOString(),
      metadataURI: a.metadataURI,
    };
  }

  async isCircuitPaused(): Promise<boolean> {
    if (!CONTRACTS.circuitBreaker) return false;
    try {
      const cb = new ethers.Contract(CONTRACTS.circuitBreaker, CB_ABI, this.provider);
      return cb.isPaused();
    } catch (err) {
      this.logRpcError("isCircuitPaused", err);
      return false;
    }
  }

  async getConsecutiveFailures(): Promise<number> {
    if (!CONTRACTS.circuitBreaker) return 0;
    try {
      const cb = new ethers.Contract(CONTRACTS.circuitBreaker, CB_ABI, this.provider);
      return Number(await cb.consecutiveFailures());
    } catch (err) {
      this.logRpcError("getConsecutiveFailures", err);
      return 0;
    }
  }
}

export const indexer = new ChainIndexer();
