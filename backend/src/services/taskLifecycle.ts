import { ethers } from "ethers";
import { repo } from "../db/repository.js";
import { DEFAULT_RELAYER_ADDRESS } from "../config/fleetDefaults.js";
import { eventBus } from "./eventBus.js";

const TASK_MARKET_ABI = [
  "function taskCounter() view returns (uint256)",
  "function tasks(uint256) view returns (uint256 id, address submitter, bytes32 taskHash, uint256 reward, uint256 complexity, uint256 deadline, uint8 status, address coalitionAddr, address authorizedReporter, uint256 platformFee)",
  "function refundStaleAssigned(uint256 taskId)",
];

const TASK_STATUS_ASSIGNED = 1;

function relayerAddress(): string | null {
  const pk =
    process.env.RELAYER_PRIVATE_KEY ??
    process.env.AGENT_PRIVATE_KEY ??
    process.env.DEPLOYER_PK;
  if (pk) {
    try {
      return new ethers.Wallet(pk).address.toLowerCase();
    } catch {
      return null;
    }
  }
  return DEFAULT_RELAYER_ADDRESS.toLowerCase();
}

export class TaskLifecycleService {
  private wallet?: ethers.Wallet;
  private market?: ethers.Contract;
  private interval: NodeJS.Timeout | null = null;
  private readonly forwardedRefunds = new Set<number>();

  start(): void {
    const marketAddr = process.env.TASK_MARKET_ADDR;
    const pk =
      process.env.RELAYER_PRIVATE_KEY ??
      process.env.AGENT_PRIVATE_KEY ??
      process.env.DEPLOYER_PK;
    if (!marketAddr || !pk) {
      console.warn("[TaskLifecycle] Disabled — missing relayer key or TASK_MARKET_ADDR");
      return;
    }
    const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
    const provider = new ethers.JsonRpcProvider(rpc);
    this.wallet = new ethers.Wallet(pk, provider);
    this.market = new ethers.Contract(marketAddr, TASK_MARKET_ABI, this.wallet);
    void this.tick();
    this.interval = setInterval(() => void this.tick(), 60_000);
    eventBus.on("tasks", (event: { type: string; payload: Record<string, unknown> }) => {
      if (event.type === "TASK_FAILED" || event.type === "TASK_EXPIRED") {
        const taskId = Number(event.payload.taskId);
        if (taskId > 0) void this.forwardRelayerRefund(taskId);
      }
    });
    console.log("[TaskLifecycle] Started:", this.wallet.address);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
  }

  private async tick(): Promise<void> {
    await this.refundStaleAssigned().catch((err) => {
      console.warn("[TaskLifecycle] stale refund scan:", err instanceof Error ? err.message : err);
    });
  }

  private async refundStaleAssigned(): Promise<void> {
    if (!this.market) return;
    const counter = Number(await this.market.taskCounter());
    const now = Math.floor(Date.now() / 1000);
    for (let id = 1; id <= counter; id++) {
      try {
        const t = await this.market.tasks(id);
        if (Number(t.status) !== TASK_STATUS_ASSIGNED) continue;
        if (now <= Number(t.deadline)) continue;
        const tx = await this.market.refundStaleAssigned(id, {
          gasLimit: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000"),
        });
        await tx.wait();
        console.log(`[TaskLifecycle] Refunded stale assigned task #${id}`);
        await this.forwardRelayerRefund(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Deadline not passed") && !msg.includes("Not assigned")) {
          console.warn(`[TaskLifecycle] refundStaleAssigned #${id}:`, msg);
        }
      }
    }
  }

  /** When legacy relayer was on-chain submitter, forward escrow refund to the signing wallet. */
  async forwardRelayerRefund(taskId: number): Promise<void> {
    if (!this.wallet || this.forwardedRefunds.has(taskId)) return;
    const relayer = relayerAddress();
    if (!relayer) return;

    const task = await repo.getTask(taskId);
    if (!task || task.submitter.toLowerCase() !== relayer) return;

    const payer = await repo.getTaskPayer(taskId);
    if (!payer || payer.toLowerCase() === relayer) return;

    const amount = BigInt(task.reward);
    if (amount <= 0n) return;

    const balance = await this.wallet.provider!.getBalance(this.wallet.address);
    if (balance < amount) {
      console.warn(`[TaskLifecycle] Cannot forward refund for #${taskId} — relayer balance low`);
      return;
    }

    const tx = await this.wallet.sendTransaction({
      to: payer,
      value: amount,
      gasLimit: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000"),
    });
    await tx.wait();
    this.forwardedRefunds.add(taskId);
    console.log(`[TaskLifecycle] Forwarded ${ethers.formatEther(amount)} STT refund for task #${taskId} → ${payer}`);
  }
}

export const taskLifecycle = new TaskLifecycleService();
