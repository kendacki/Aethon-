import { ethers } from "ethers";
import { DEFAULT_FLEET_AGENTS } from "../config/fleetDefaults.js";
import { repo } from "../db/repository.js";
import {
  requiredRolesForTask,
  validateTaskPayload,
  type AgentType,
  type TaskPayload,
} from "../shared/taskPayload.js";

const TASK_MARKET_ABI = [
  "function taskCounter() view returns (uint256)",
  "function tasks(uint256) view returns (uint256 id, address submitter, bytes32 taskHash, uint256 reward, uint256 complexity, uint256 deadline, uint8 status, address coalitionAddr, address authorizedReporter, uint256 platformFee)",
  "function assignToCoalition(uint256 taskId, address coalition)",
];

const COALITION_ABI = [
  "function formCoalition(address[] members, uint256 taskId, bytes[] signatures) returns (address)",
  "function coalitions(address) view returns (address leadAgent, uint256 formed, uint256 taskId, bool dissolved, uint256 totalStake)",
];

const LEAD_ROLE: AgentType = "ARBITRAGE";

function coalitionAddress(members: string[], taskId: bigint): string {
  return ethers.getAddress(
    ethers.dataSlice(ethers.keccak256(ethers.solidityPacked(["address[]", "uint256"], [members, taskId])), 12),
  );
}

function loadPromoterWallet(provider: ethers.JsonRpcProvider): ethers.Wallet | null {
  const pk =
    process.env.TASK_PROMOTER_PRIVATE_KEY ??
    process.env.RELAYER_PRIVATE_KEY ??
    process.env.DEPLOYER_PK;
  if (!pk) return null;
  return new ethers.Wallet(pk, provider);
}

function loadLeadWallet(provider: ethers.JsonRpcProvider): ethers.Wallet | null {
  const pk =
    process.env.ARBITRAGE_AGENT_PRIVATE_KEY ??
    process.env.AGENT_PRIVATE_KEY_ARBITRAGE ??
    process.env[`${LEAD_ROLE}_AGENT_PRIVATE_KEY`];
  if (!pk) return null;
  return new ethers.Wallet(pk, provider);
}

export class TaskPromoter {
  private interval: NodeJS.Timeout | null = null;
  private running = false;
  private disabled = false;

  start(): void {
    if (this.interval) return;
    const pk =
      process.env.TASK_PROMOTER_PRIVATE_KEY ??
      process.env.RELAYER_PRIVATE_KEY ??
      process.env.DEPLOYER_PK;
    if (!pk) {
      this.disabled = true;
      console.warn("[TaskPromoter] No relayer key — coalition promotion disabled");
      return;
    }
    const ms = Number(process.env.TASK_PROMOTER_INTERVAL_MS ?? 15_000);
    void this.tick();
    this.interval = setInterval(() => void this.tick(), ms);
    console.log("[TaskPromoter] Started");
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async runOnce(): Promise<void> {
    await this.tick();
  }

  private async tick(): Promise<void> {
    if (this.running || this.disabled) return;
    const marketAddr = process.env.TASK_MARKET_ADDR;
    const coalitionAddr = process.env.COALITION_MANAGER_ADDR;
    if (!marketAddr || !coalitionAddr) return;

    const promoter = loadPromoterWallet(
      new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network"),
    );
    if (!promoter) return;

    this.running = true;
    try {
      const provider = promoter.provider as ethers.JsonRpcProvider;
      const market = new ethers.Contract(marketAddr, TASK_MARKET_ABI, provider);
      const coalition = new ethers.Contract(coalitionAddr, COALITION_ABI, promoter);
      const leadWallet = loadLeadWallet(provider);
      const leadMarket = leadWallet
        ? new ethers.Contract(marketAddr, TASK_MARKET_ABI, leadWallet)
        : null;

      const counter = Number(await market.taskCounter());
      const now = Math.floor(Date.now() / 1000);

      for (let taskId = 1; taskId <= counter; taskId++) {
        const task = await market.tasks(taskId);
        if (Number(task.status) !== 0) continue;
        if (now > Number(task.deadline)) continue;

        const payloadRow = await repo.getTaskPayload(task.taskHash as string);
        if (!payloadRow || !validateTaskPayload(payloadRow)) continue;

        const payload = payloadRow as TaskPayload;
        const complexity = Number(task.complexity);
        const roles = requiredRolesForTask(payload, complexity);
        const intents = await repo.getCoalitionIntents(taskId);
        const byRole = new Map<string, (typeof intents)[0]>();
        for (const intent of intents) {
          if (roles.includes(intent.agentType as AgentType) && !byRole.has(intent.agentType)) {
            byRole.set(intent.agentType, intent);
          }
        }
        if (byRole.size < complexity) continue;

        const members = roles.slice(0, complexity).map((role) => {
          const row = byRole.get(role);
          return row ? ethers.getAddress(row.agentAddress) : DEFAULT_FLEET_AGENTS[role];
        });

        const signatures = roles.slice(0, complexity).map((role) => byRole.get(role)!.signature!);
        if (signatures.some((s) => !s)) continue;

        const coalitionKey = coalitionAddress(members, BigInt(taskId));
        const existing = await coalition.coalitions(coalitionKey);

        if (Number(existing.formed) === 0) {

          try {
            const tx = await coalition.formCoalition(members, taskId, signatures, {
              gasLimit: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000"),
            });
            await tx.wait();
            console.log(`[TaskPromoter] Coalition formed for task #${taskId}: ${coalitionKey}`);
          } catch (err) {
            console.error(
              `[TaskPromoter] formCoalition failed for #${taskId}:`,
              err instanceof Error ? err.message : err,
            );
            continue;
          }
        }

        const refreshed = await market.tasks(taskId);
        if (Number(refreshed.status) !== 0) continue;

        if (leadMarket && members[0].toLowerCase() === leadWallet!.address.toLowerCase()) {
          try {
            const tx = await leadMarket.assignToCoalition(taskId, coalitionKey, {
              gasLimit: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000"),
            });
            await tx.wait();
            console.log(`[TaskPromoter] Task #${taskId} assigned to coalition`);
          } catch (err) {
            console.error(
              `[TaskPromoter] assignToCoalition failed for #${taskId}:`,
              err instanceof Error ? err.message : err,
            );
          }
        }
      }
    } catch (err) {
      console.error("[TaskPromoter] tick failed:", err instanceof Error ? err.message : err);
    } finally {
      this.running = false;
    }
  }
}

export const taskPromoter = new TaskPromoter();
