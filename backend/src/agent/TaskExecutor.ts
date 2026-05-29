import { ethers } from "ethers";
import type { AgentType, TaskPayload } from "../shared/taskPayload.js";
import { requiredRolesForTask, validateTaskPayload } from "../shared/taskPayload.js";
import { AgentApiClient } from "./apiClient.js";
import type { AgentConfig } from "./config.js";
import { CoalitionEngine } from "./CoalitionEngine.js";
import { NonceMgr } from "./NonceMgr.js";
import { executeSkill } from "./skills/index.js";
import type { SkillContext, SkillResult } from "./skills/types.js";
import { skillResultDigest } from "../services/coalitionVerify.js";
import type { AgentHealthMonitor } from "./health/AgentHealthMonitor.js";
import { SomniaAgentsClient } from "../somnia/SomniaAgentsClient.js";
import { withRetry } from "./utils/retry.js";

const COALITION_ABI = [
  "function formCoalition(address[] members, uint256 taskId, bytes[] signatures) returns (address)",
  "function coalitions(address) view returns (address[] members, address leadAgent, uint256 formed, uint256 taskId, bool dissolved, uint256 totalStake)",
];

const TASK_MARKET_ABI = [
  "function assignToCoalition(uint256 taskId, address coalition)",
  "function reportCompletion(uint256 taskId, bool success, string reason)",
  "function tasks(uint256) view returns (uint256 id, address submitter, bytes32 taskHash, uint256 reward, uint256 complexity, uint256 deadline, uint8 status, address coalitionAddr, address authorizedReporter, uint256 platformFee)",
];

const TASK_STATUS_PENDING = 0;
const TASK_STATUS_ASSIGNED = 1;

export class TaskExecutor {
  private coalitionEngine: CoalitionEngine;
  private api: AgentApiClient;
  private coalition: ethers.Contract;
  private taskMarket: ethers.Contract;
  private processing = new Set<number>();
  private somniaClient: SomniaAgentsClient | null;

  constructor(
    private config: AgentConfig,
    private wallet: ethers.Wallet,
    private provider: ethers.JsonRpcProvider,
    private nonceMgr: NonceMgr,
    private health: AgentHealthMonitor,
  ) {
    this.coalitionEngine = new CoalitionEngine(config, provider);
    this.api = new AgentApiClient(config);
    this.coalition = new ethers.Contract(config.coalitionManagerAddr, COALITION_ABI, wallet);
    this.taskMarket = new ethers.Contract(config.taskMarketAddr, TASK_MARKET_ABI, wallet);
    this.somniaClient = SomniaAgentsClient.fromEnv(wallet, provider);
  }

  private skillContext(): SkillContext {
    return {
      agentAddress: this.wallet.address,
      rpcUrl: this.config.rpcUrl,
      apiBaseUrl: this.config.apiBaseUrl,
      circuitBreakerAddr: this.config.circuitBreakerAddr,
      agentRegistryAddr: this.config.agentRegistryAddr,
      signMessage: (message: string) => this.wallet.signMessage(message),
      somnia: this.somniaClient ?? undefined,
    };
  }

  async handleTaskSubmitted(taskId: bigint, taskHash: string, complexity: bigint): Promise<void> {
    const id = Number(taskId);
    if (this.processing.has(id)) return;
    if (!this.health.canAcceptTasks()) {
      console.warn(`[TaskExecutor] Task #${id} rejected — health gate (${this.health.getSnapshot().status})`);
      return;
    }
    this.processing.add(id);
    this.health.incrementTasksInFlight();

    try {
      const rawPayload = await withRetry(() => this.api.fetchPayload(taskHash), {
        attempts: 3,
        label: "fetchPayload",
      });
      if (!rawPayload || !validateTaskPayload(rawPayload)) {
        console.warn(`[TaskExecutor] No payload for task #${id} (${taskHash})`);
        return;
      }

      const payload = rawPayload as TaskPayload;
      const complexityNum = Number(complexity);
      const roles = requiredRolesForTask(payload, complexityNum);
      const myRole = this.config.agentType;

      if (!roles.includes(myRole)) {
        console.log(`[TaskExecutor] Task #${id} does not require ${myRole}`);
        return;
      }

      console.log(`[TaskExecutor] Task #${id} — ${myRole} engaging (${payload.label ?? payload.action})`);

      const members = await this.ensureCoalition(id, roles, complexityNum);
      if (!members) return;

      const isLead = members[0].toLowerCase() === this.wallet.address.toLowerCase();
      await this.runSkillAndReport(id, payload, myRole, members, isLead);
    } catch (err) {
      console.error(`[TaskExecutor] Task #${id} failed:`, err);
    } finally {
      this.processing.delete(id);
      this.health.decrementTasksInFlight();
    }
  }

  private async ensureCoalition(
    taskId: number,
    roles: AgentType[],
    complexity: number,
  ): Promise<string[] | null> {
    const taskIdBig = BigInt(taskId);
    const myAddr = this.wallet.address;

    await this.api.postCoalitionIntent(taskId, {
      address: myAddr,
      agentType: this.config.agentType,
    });

    for (let attempt = 0; attempt < 45; attempt++) {
      const intents = await this.api.getCoalitionIntents(taskId);
      const byRole = new Map<string, (typeof intents)[0]>();
      for (const intent of intents) {
        if (roles.includes(intent.agentType as AgentType) && !byRole.has(intent.agentType)) {
          byRole.set(intent.agentType, intent);
        }
      }

      if (byRole.size < complexity) {
        await sleep(2000);
        continue;
      }

      const members = roles.slice(0, complexity).map((role) => byRole.get(role)!.agentAddress);
      const coalitionAddr = coalitionAddress(members, taskIdBig);

      const sig = await this.coalitionEngine.signCoalitionIntent(members, taskIdBig, this.wallet);
      await this.api.postCoalitionIntent(taskId, {
        address: myAddr,
        agentType: this.config.agentType,
        members,
        signature: sig,
      });

      const signed = await this.api.getCoalitionIntents(taskId);
      const signedByAddr = new Map(signed.filter((i) => i.signature).map((i) => [i.agentAddress.toLowerCase(), i]));

      const allSigned = members.every((m) => signedByAddr.has(m.toLowerCase()));
      if (!allSigned) {
        await sleep(2000);
        continue;
      }

      const signatures = members.map((m) => signedByAddr.get(m.toLowerCase())!.signature!);

      const existing = await this.coalition.coalitions(coalitionAddr);
      if (Number(existing.formed) === 0 && myAddr.toLowerCase() === members[0].toLowerCase()) {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.coalition.formCoalition(members, taskIdBig, signatures, {
            nonce,
            gasLimit: this.config.maxGasPerTx,
          });
          await tx.wait();
          console.log(`[TaskExecutor] Coalition formed for task #${taskId}: ${coalitionAddr}`);
        } finally {
          this.nonceMgr.release();
        }
      }

      const task = await this.taskMarket.tasks(taskIdBig);
      const status = Number(task.status);

      if (status === TASK_STATUS_PENDING && myAddr.toLowerCase() === members[0].toLowerCase()) {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.taskMarket.assignToCoalition(taskIdBig, coalitionAddr, {
            nonce,
            gasLimit: this.config.maxGasPerTx,
          });
          await tx.wait();
          console.log(`[TaskExecutor] Task #${taskId} assigned to coalition`);
        } finally {
          this.nonceMgr.release();
        }
      }

      if (status === TASK_STATUS_ASSIGNED || Number((await this.taskMarket.tasks(taskIdBig)).status) === TASK_STATUS_ASSIGNED) {
        return members;
      }

      await sleep(2000);
    }

    console.warn(`[TaskExecutor] Coalition timeout for task #${taskId}`);
    return null;
  }

  private async runSkillAndReport(
    taskId: number,
    payload: TaskPayload,
    myRole: AgentType,
    members: string[],
    isLead: boolean,
  ): Promise<void> {
    for (let i = 0; i < 15; i++) {
      const task = await this.taskMarket.tasks(BigInt(taskId));
      if (Number(task.status) === TASK_STATUS_ASSIGNED) break;
      await sleep(2000);
    }

    const result = await executeSkill(myRole, payload, this.skillContext());
    const resultJson = JSON.stringify(result);
    const sig = await this.wallet.signMessage(
      ethers.getBytes(skillResultDigest(taskId, this.wallet.address, myRole, resultJson)),
    );

    await this.api.postSkillResult(taskId, {
      address: this.wallet.address,
      agentType: myRole,
      result,
      signature: sig,
    });

    console.log(`[TaskExecutor] Skill ${myRole} completed for task #${taskId} (success=${result.success})`);

    if (!isLead) return;

    const roles = requiredRolesForTask(payload, members.length);
    for (let attempt = 0; attempt < 45; attempt++) {
      const results = await this.api.getSkillResults(taskId);
      const done = roles.every((role) => results.some((r) => r.agentType === role));
      if (!done) {
        await sleep(2000);
        continue;
      }

      const allOk = results.every((r) => (r.result as SkillResult).success !== false);
      const summary = JSON.stringify({
        taskId,
        label: payload.label,
        results: results.map((r) => r.result),
      });

      const nonce = await this.nonceMgr.acquireNonce();
      try {
        const tx = await this.taskMarket.reportCompletion(taskId, allOk, summary.slice(0, 500), {
          nonce,
          gasLimit: this.config.maxGasPerTx,
        });
        await tx.wait();
        console.log(`[TaskExecutor] Task #${taskId} reported ${allOk ? "COMPLETED" : "FAILED"}`);
      } finally {
        this.nonceMgr.release();
      }
      return;
    }

    console.warn(`[TaskExecutor] Skill result aggregation timeout for task #${taskId}`);
  }
}

function coalitionAddress(members: string[], taskId: bigint): string {
  return ethers.getAddress(
    ethers.dataSlice(ethers.keccak256(ethers.solidityPacked(["address[]", "uint256"], [members, taskId])), 12),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
