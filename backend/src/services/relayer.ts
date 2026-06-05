import { ethers } from "ethers";
import { repo } from "../db/repository.js";
import { indexer } from "./indexer.js";
import { eventBus } from "./eventBus.js";

const TASK_MARKET_ABI = [
  "function submitTask(bytes32 hash, uint256 complexity) payable returns (uint256 taskId)",
  "function submitTaskFor(address submitter, bytes32 hash, uint256 complexity, bytes signature) payable returns (uint256 taskId)",
  "function taskCounter() view returns (uint256)",
];

export class TaskRelayer {
  private wallet?: ethers.Wallet;
  private market?: ethers.Contract;
  private interval: NodeJS.Timeout | null = null;

  start(): void {
    const pk =
      process.env.RELAYER_PRIVATE_KEY ??
      process.env.AGENT_PRIVATE_KEY ??
      process.env.DEPLOYER_PK;
    const marketAddr = process.env.TASK_MARKET_ADDR;
    if (!pk || !marketAddr) {
      console.warn("[Relayer] No relayer key or TASK_MARKET_ADDR — outbox processor disabled");
      return;
    }
    const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
    const provider = new ethers.JsonRpcProvider(rpc);
    this.wallet = new ethers.Wallet(pk, provider);
    this.market = new ethers.Contract(marketAddr, TASK_MARKET_ABI, this.wallet);
    this.processOutbox().catch(console.error);
    this.interval = setInterval(() => this.processOutbox().catch(console.error), 10_000);
    console.log("[Relayer] Started:", this.wallet.address);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async submitImmediate(params: {
    submitter: string;
    taskHash: string;
    complexity: number;
    rewardWei: string;
    signature: string;
  }): Promise<{ taskId: number; txHash: string }> {
    if (!this.market || !this.wallet) throw new Error("Relayer not configured");
    const gas = { gasLimit: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000") };
    const value = BigInt(params.rewardWei);
    let tx;
    try {
      tx = await this.market.submitTaskFor(
        params.submitter,
        params.taskHash,
        params.complexity,
        params.signature,
        { value, ...gas },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("submitTaskFor") || msg.includes("missing revert data")) {
        console.warn("[Relayer] submitTaskFor unavailable — falling back to submitTask (refunds via TaskLifecycle)");
        tx = await this.market.submitTask(params.taskHash, params.complexity, { value, ...gas });
      } else {
        throw err;
      }
    }
    const receipt = await tx.wait();
    const taskId = Number(await this.market.taskCounter());
    return { taskId, txHash: receipt!.hash };
  }

  private async processOutbox(): Promise<void> {
    if (!this.market) return;
    for (;;) {
      const row = await repo.claimNextPendingOutbox();
      if (!row) break;
      try {
        const { taskId, txHash } = await this.submitImmediate({
          submitter: row.submitter,
          taskHash: row.taskHash,
          complexity: row.complexity,
          rewardWei: row.rewardWei,
          signature: row.signature,
        });
        await repo.markOutboxSubmitted(row.id, taskId, txHash);
        await indexer.syncTaskRecord(taskId, txHash);
        eventBus.publish("tasks", "TASK_RELAYED", { outboxId: row.id, taskId, txHash });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await repo.markOutboxFailed(row.id, msg);
        console.error("[Relayer] Failed outbox", row.id, msg);
      }
    }
  }
}

export const relayer = new TaskRelayer();

export function verifyTaskSignature(
  submitter: string,
  taskHash: string,
  complexity: number,
  rewardWei: string,
  signature: string
): boolean {
  const digest = ethers.solidityPackedKeccak256(
    ["address", "bytes32", "uint256", "uint256"],
    [submitter, taskHash, complexity, rewardWei]
  );
  const recovered = ethers.verifyMessage(ethers.getBytes(digest), signature);
  return recovered.toLowerCase() === submitter.toLowerCase();
}
