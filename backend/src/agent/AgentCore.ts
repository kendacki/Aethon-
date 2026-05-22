import { ethers } from "ethers";
import type { AgentConfig } from "./config.js";
import { NonceMgr } from "./NonceMgr.js";
import { Watchdog } from "./Watchdog.js";

const REGISTRY_ABI = [
  "function register(uint8 agentType, string metadataURI) payable",
  "function heartbeat() external",
  "function isAgentActive(address) view returns (bool)",
  "event AgentRegistered(address indexed wallet, uint8 agentType)",
];

const TASK_MARKET_ABI = [
  "event TaskSubmitted(uint256 indexed id, address submitter, uint256 reward, uint256 complexity)",
  "function assignToCoalition(uint256 taskId, address coalition)",
  "function reportCompletion(uint256 taskId, bool success, string reason)",
];

export class AgentCore {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private registry: ethers.Contract;
  private taskMarket: ethers.Contract;
  private nonceMgr: NonceMgr;
  private watchdog: Watchdog;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private halted = false;

  constructor(private config: AgentConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.registry = new ethers.Contract(config.agentRegistryAddr, REGISTRY_ABI, this.wallet);
    this.taskMarket = new ethers.Contract(config.taskMarketAddr, TASK_MARKET_ABI, this.wallet);
    this.nonceMgr = new NonceMgr(this.wallet, this.provider);
    this.watchdog = new Watchdog(config);

    this.watchdog.on("halt", () => {
      this.halted = true;
      console.error("[AgentCore] HALT signal received");
    });
    this.watchdog.on("warning", (evt) => {
      console.warn("[Watchdog]", evt.msg);
    });
  }

  async start(): Promise<void> {
    this.watchdog.start();
    await this.ensureRegistered();
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

  private async ensureRegistered(): Promise<void> {
    if (this.config.agentRegistryAddr === ethers.ZeroAddress) {
      console.warn("[AgentCore] AGENT_REGISTRY_ADDR not set — skipping on-chain registration");
      return;
    }
    const active = await this.registry.isAgentActive(this.wallet.address);
    if (active) return;

    const agentTypeIndex = { ARBITRAGE: 0, ORACLE: 1, YIELD_OPT: 2, GOVERNANCE: 3, RISK_MGMT: 4 }[
      this.config.agentType
    ];
    const nonce = await this.nonceMgr.acquireNonce();
    try {
      const tx = await this.registry.register(agentTypeIndex, `aethon://${this.config.agentType}`, {
        value: this.config.agentStakeWei,
        nonce,
        gasLimit: this.config.maxGasPerTx,
      });
      await tx.wait();
      console.log("[AgentCore] Registered on-chain");
    } finally {
      this.nonceMgr.release();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      if (this.halted || this.config.agentRegistryAddr === ethers.ZeroAddress) return;
      try {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.registry.heartbeat({ nonce, gasLimit: 100_000n });
          await tx.wait();
        } finally {
          this.nonceMgr.release();
        }
      } catch (err) {
        console.error("[AgentCore] Heartbeat failed:", err);
        await this.nonceMgr.resync();
      }
    }, 60_000);
  }

  private subscribeToTasks(): void {
    if (this.config.taskMarketAddr === ethers.ZeroAddress) return;
    this.taskMarket.on("TaskSubmitted", (id: bigint, submitter: string, reward: bigint, complexity: bigint) => {
      if (this.halted) return;
      console.log(`[AgentCore] TaskSubmitted #${id} reward=${ethers.formatEther(reward)} complexity=${complexity}`);
    });
  }
}
