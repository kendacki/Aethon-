import { ethers } from "ethers";
import type { AgentConfig } from "./config.js";
import { AgentHealthMonitor } from "./health/AgentHealthMonitor.js";
import { NonceMgr } from "./NonceMgr.js";
import { Watchdog } from "./Watchdog.js";
import { TaskExecutor } from "./TaskExecutor.js";

const REGISTRY_ABI = [
  "function register(uint8 agentType, string metadataURI) payable",
  "function heartbeat() external",
  "function isAgentActive(address) view returns (bool)",
  "function getAgentStake(address) view returns (uint256)",
  "event AgentRegistered(address indexed wallet, uint8 agentType)",
];

const TASK_MARKET_ABI = [
  "event TaskSubmitted(uint256 indexed id, address submitter, uint256 reward, uint256 complexity)",
  "function tasks(uint256) view returns (uint256 id, address submitter, bytes32 taskHash, uint256 reward, uint256 complexity, uint256 deadline, uint8 status, address coalitionAddr, address authorizedReporter, uint256 platformFee)",
];

export class AgentCore {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private registry: ethers.Contract;
  private taskMarket: ethers.Contract;
  private nonceMgr: NonceMgr;
  private health: AgentHealthMonitor;
  private watchdog: Watchdog;
  private taskExecutor: TaskExecutor;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private taskIntakePaused = false;

  constructor(private config: AgentConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.registry = new ethers.Contract(config.agentRegistryAddr, REGISTRY_ABI, this.wallet);
    this.taskMarket = new ethers.Contract(config.taskMarketAddr, TASK_MARKET_ABI, this.wallet);
    this.nonceMgr = new NonceMgr(this.wallet, this.provider);
    this.health = new AgentHealthMonitor(config, this.wallet);
    this.watchdog = new Watchdog(this.health);
    this.taskExecutor = new TaskExecutor(config, this.wallet, this.provider, this.nonceMgr, this.health);

    this.watchdog.on("halt", (evt) => {
      this.taskIntakePaused = true;
      console.error("[AgentCore] HALT:", evt.msg);
    });
    this.watchdog.on("warning", (evt) => {
      this.taskIntakePaused = !this.health.canAcceptTasks();
      console.warn("[Watchdog]", evt.msg);
    });
    this.watchdog.on("recovered", (evt) => {
      this.taskIntakePaused = !this.health.canAcceptTasks();
      console.log("[AgentCore] RECOVERED:", evt.msg);
    });
  }

  async start(): Promise<void> {
    this.watchdog.start();
    await this.ensureRegistered();
    await this.health.runChecks();
    this.startHeartbeat();
    if (this.config.reactivityEnabled) {
      this.subscribeToTasks();
    }
    console.log(`[AgentCore] Agent ${this.wallet.address} online (${this.config.agentType})`);
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.watchdog.stop();
  }

  private metadataUri(): string {
    const base = this.config.apiPublicUrl.replace(/\/+$/, "");
    return `${base}/v1/agents/manifests/${this.config.agentType}`;
  }

  private async ensureRegistered(): Promise<void> {
    if (this.config.agentRegistryAddr === ethers.ZeroAddress) {
      console.warn("[AgentCore] AGENT_REGISTRY_ADDR not set — skipping on-chain registration");
      return;
    }
    const active = await this.registry.isAgentActive(this.wallet.address);
    if (active) return;

    const stake: bigint = await this.registry.getAgentStake(this.wallet.address);
    if (stake > 0n) {
      const nonce = await this.nonceMgr.acquireNonce();
      try {
        const tx = await this.registry.heartbeat({ nonce, gasLimit: 100_000n });
        await tx.wait();
        console.log("[AgentCore] Refreshed stale on-chain registration via heartbeat");
        return;
      } finally {
        this.nonceMgr.release();
      }
    }

    const agentTypeIndex = { ARBITRAGE: 0, ORACLE: 1, YIELD_OPT: 2, GOVERNANCE: 3, RISK_MGMT: 4 }[
      this.config.agentType
    ];
    const nonce = await this.nonceMgr.acquireNonce();
    try {
      const tx = await this.registry.register(agentTypeIndex, this.metadataUri(), {
        value: this.config.agentStakeWei,
        nonce,
        gasLimit: this.config.maxGasPerTx,
      });
      await tx.wait();
      console.log("[AgentCore] Registered on-chain with manifest", this.metadataUri());
    } finally {
      this.nonceMgr.release();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.config.agentRegistryAddr === ethers.ZeroAddress) return;
      try {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.registry.heartbeat({ nonce, gasLimit: 100_000n });
          await tx.wait();
          this.health.recordHeartbeat(true);
        } finally {
          this.nonceMgr.release();
        }
      } catch (err) {
        console.error("[AgentCore] Heartbeat failed:", err);
        this.health.recordHeartbeat(false);
        await this.nonceMgr.resync();
      }
    }, 60_000);
  }

  private subscribeToTasks(): void {
    if (this.config.taskMarketAddr === ethers.ZeroAddress) return;
    this.taskMarket.on("TaskSubmitted", (id: bigint, _submitter: string, reward: bigint, complexity: bigint) => {
      if (this.taskIntakePaused || !this.health.canAcceptTasks()) {
        console.warn(`[AgentCore] Task #${id} skipped — agent not healthy (${this.health.getSnapshot().status})`);
        return;
      }
      console.log(`[AgentCore] TaskSubmitted #${id} reward=${ethers.formatEther(reward)} complexity=${complexity}`);
      void (async () => {
        try {
          const task = await this.taskMarket.tasks(id);
          const taskHash = task.taskHash as string;
          await this.taskExecutor.handleTaskSubmitted(id, taskHash, complexity);
        } catch (err) {
          console.error("[AgentCore] Task handler error:", err);
        }
      })();
    });
  }
}
