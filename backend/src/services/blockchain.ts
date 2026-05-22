import { ethers } from "ethers";
import { eventBus } from "./eventBus.js";
import { store, type AgentRecord, type CoalitionRecord, type TaskRecord } from "./store.js";

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
  "event AgentRegistered(address indexed wallet, uint8 agentType)",
  "event AgentOffline(address indexed wallet, string reason)",
];

const REP_ABI = ["function getScore(address) view returns (uint256)"];

const CB_ABI = [
  "function isPaused() view returns (bool)",
  "function consecutiveFailures() view returns (uint256)",
  "event CircuitBroken(uint256 failures, uint256 timestamp)",
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
];

const AGENT_TYPES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const TASK_STATUS = ["PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"] as const;

export class BlockchainService {
  provider: ethers.JsonRpcProvider;
  registry?: ethers.Contract;
  repEngine?: ethers.Contract;
  circuitBreaker?: ethers.Contract;
  taskMarket?: ethers.Contract;
  coalitionMgr?: ethers.Contract;
  private polling = false;

  constructor() {
    const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
    this.provider = new ethers.JsonRpcProvider(rpc);

    const registryAddr = process.env.AGENT_REGISTRY_ADDR;
    const repAddr = process.env.REPUTATION_ENGINE_ADDR;
    const cbAddr = process.env.CIRCUIT_BREAKER_ADDR;
    const marketAddr = process.env.TASK_MARKET_ADDR;
    const coalitionAddr = process.env.COALITION_MANAGER_ADDR;

    if (registryAddr) this.registry = new ethers.Contract(registryAddr, REGISTRY_ABI, this.provider);
    if (repAddr) this.repEngine = new ethers.Contract(repAddr, REP_ABI, this.provider);
    if (cbAddr) this.circuitBreaker = new ethers.Contract(cbAddr, CB_ABI, this.provider);
    if (marketAddr) this.taskMarket = new ethers.Contract(marketAddr, TASK_ABI, this.provider);
    if (coalitionAddr) this.coalitionMgr = new ethers.Contract(coalitionAddr, COALITION_ABI, this.provider);
  }

  async getHealth() {
    const [blockNumber, network] = await Promise.all([
      this.provider.getBlockNumber(),
      this.provider.getNetwork(),
    ]);
    let circuitPaused = false;
    let consecutiveFailures = 0;
    if (this.circuitBreaker) {
      circuitPaused = await this.circuitBreaker.isPaused();
      consecutiveFailures = Number(await this.circuitBreaker.consecutiveFailures());
    }
    return {
      status: circuitPaused ? "DEGRADED" : "OK",
      circuitBreakerPaused: circuitPaused,
      consecutiveFailures,
      blockNumber,
      chainId: Number(network.chainId),
      synced: true,
      contracts: {
        agentRegistry: process.env.AGENT_REGISTRY_ADDR ?? null,
        taskMarket: process.env.TASK_MARKET_ADDR ?? null,
        coalitionManager: process.env.COALITION_MANAGER_ADDR ?? null,
        reputationEngine: process.env.REPUTATION_ENGINE_ADDR ?? null,
        circuitBreaker: process.env.CIRCUIT_BREAKER_ADDR ?? null,
      },
    };
  }

  async syncOnce(): Promise<void> {
    if (!this.taskMarket || !this.registry) return;

    const counter = Number(await this.taskMarket.taskCounter());
    for (let id = 1; id <= counter; id++) {
      const t = await this.taskMarket.tasks(id);
      const task: TaskRecord = {
        id: Number(t.id),
        submitter: t.submitter,
        taskHash: t.taskHash,
        reward: t.reward.toString(),
        complexity: Number(t.complexity),
        deadline: new Date(Number(t.deadline) * 1000).toISOString(),
        status: TASK_STATUS[Number(t.status)] ?? "PENDING",
        coalitionAddr: t.coalitionAddr,
        authorizedReporter: t.authorizedReporter,
        platformFee: t.platformFee?.toString(),
      };
      store.upsertTask(task);
    }
  }

  startIndexer(): void {
    if (this.polling) return;
    this.polling = true;

    const poll = async () => {
      try {
        await this.syncOnce();
        const health = await this.getHealth();
        store.listAgents(); // keep store warm when chain events arrive
        if (health.circuitBreakerPaused) {
          eventBus.publish("circuit_breaker", "CIRCUIT_BREAK", {
            consecutiveFailures: health.consecutiveFailures,
          });
        }
      } catch (err) {
        console.error("[BlockchainService] sync error:", err);
      }
    };

    poll();
    setInterval(poll, 15_000);

    if (this.taskMarket) {
      this.taskMarket.on("TaskSubmitted", (id: bigint, submitter: string, reward: bigint, complexity: bigint) => {
        store.upsertTask({
          id: Number(id),
          submitter,
          taskHash: ethers.ZeroHash,
          reward: reward.toString(),
          complexity: Number(complexity),
          deadline: new Date(Date.now() + 3_600_000).toISOString(),
          status: "PENDING",
        });
        eventBus.publish("tasks", "TASK_SUBMITTED", { taskId: Number(id), reward: reward.toString() });
      });
      this.taskMarket.on("TaskCompleted", (id: bigint, payout: bigint, fee: bigint) => {
        const task = store.tasks.get(Number(id));
        if (task) {
          task.status = "COMPLETED";
          store.upsertTask(task);
        }
        eventBus.publish("tasks", "TASK_COMPLETED", {
          taskId: Number(id),
          reward: payout.toString(),
          fee: fee.toString(),
        });
      });
    }

    if (this.coalitionMgr) {
      this.coalitionMgr.on("CoalitionFormed", (coalition: string, lead: string, members: string[], taskId: bigint) => {
        const record: CoalitionRecord = {
          address: coalition,
          members: [...members],
          leadAgent: lead,
          taskId: Number(taskId),
          dissolved: false,
          formed: new Date().toISOString(),
          totalStake: "0",
        };
        store.upsertCoalition(record);
        eventBus.publish("coalitions", "COALITION_FORMED", { coalition, lead, taskId: Number(taskId) });
      });
    }

    if (this.registry) {
      this.registry.on("AgentRegistered", async (wallet: string, agentType: number) => {
        const agent = await this.fetchAgent(wallet);
        if (agent) {
          store.upsertAgent(agent);
          eventBus.publish("agents", "AGENT_REGISTERED", { ...agent });
        } else {
          store.upsertAgent({
            address: wallet,
            agentType: AGENT_TYPES[agentType] ?? "ARBITRAGE",
            stake: "0",
            reputation: 100,
            online: true,
            lastHeartbeat: new Date().toISOString(),
          });
        }
      });
    }
  }

  async fetchAgent(address: string): Promise<AgentRecord | null> {
    if (!this.registry) return null;
    const a = await this.registry.agents(address);
    let reputation = 100;
    if (this.repEngine) reputation = Number(await this.repEngine.getScore(address));
    const online = await this.registry.isAgentActive(address);
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
}

export const blockchain = new BlockchainService();
