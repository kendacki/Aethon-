import { ethers } from "ethers";
import type { AgentType, TaskPayload } from "../shared/taskPayload.js";
import { requiredRolesForTask, validateTaskPayload } from "../shared/taskPayload.js";
import { AgentApiClient } from "./apiClient.js";
import type { AgentConfig } from "./config.js";
import { CoalitionEngine } from "./CoalitionEngine.js";
import { NonceMgr } from "./NonceMgr.js";
import { executeSkill } from "./skills/index.js";
import type { SkillContext, SkillResult } from "./skills/types.js";
import { evaluateTaskOutcome } from "../shared/taskEvaluation.js";
import { skillResultDigest, executionDigest } from "../services/coalitionVerify.js";
import type { AgentHealthMonitor } from "./health/AgentHealthMonitor.js";
import { SomniaAgentsClient } from "../somnia/SomniaAgentsClient.js";
import { withRetry } from "./utils/retry.js";

const COALITION_ABI = [
  "function formCoalition(address[] members, uint256 taskId, bytes[] signatures) returns (address)",
  "function coalitions(address) view returns (address leadAgent, uint256 formed, uint256 taskId, bool dissolved, uint256 totalStake)",
];

const TASK_MARKET_ABI = [
  "function assignToCoalition(uint256 taskId, address coalition)",
  "function reportCompletion(uint256 taskId, bool success, string reason)",
  "function submitTaskResult(uint256 taskId, address targetContract, bytes executionPayload)",
  "function taskExecutionResults(uint256) view returns (address targetContract, bytes executionPayload, bool submitted)",
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

  private skillContext(taskId?: number): SkillContext {
    return {
      agentAddress: this.wallet.address,
      rpcUrl: this.config.rpcUrl,
      apiBaseUrl: this.config.apiBaseUrl,
      circuitBreakerAddr: this.config.circuitBreakerAddr,
      agentRegistryAddr: this.config.agentRegistryAddr,
      taskId,
      signMessage: (message: string) => this.wallet.signMessage(message),
      somnia: this.somniaClient ?? undefined,
      fetchKnowledge: async (role, queryText, limit) => {
        const chunks = await this.api.fetchKnowledge(role, queryText, limit);
        return chunks.map((c) => ({
          id: c.id,
          role: c.role as import("../shared/taskPayload.js").AgentType,
          title: c.title,
          content: c.content,
          sourceUrl: c.sourceUrl,
          tags: c.tags,
          score: c.score,
        }));
      },
      storeObservation: async (obs) => {
        await this.api.storeObservation({
          role: obs.role,
          taskId: obs.taskId,
          observationType: obs.observationType,
          payload: obs.payload,
        });
      },
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

      let existing = await this.coalition.coalitions(coalitionAddr);
      if (Number(existing.formed) === 0) {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.coalition.formCoalition(members, taskIdBig, signatures, {
            nonce,
            gasLimit: this.config.maxGasPerTx,
          });
          await tx.wait();
          console.log(`[TaskExecutor] Coalition formed for task #${taskId}: ${coalitionAddr}`);
          existing = await this.coalition.coalitions(coalitionAddr);
        } catch (err) {
          console.error(
            `[TaskExecutor] formCoalition failed for #${taskId}:`,
            err instanceof Error ? err.message : err,
          );
        } finally {
          this.nonceMgr.release();
        }
      }

      let status = Number((await this.taskMarket.tasks(taskIdBig)).status);

      if (status === TASK_STATUS_PENDING && Number(existing.formed) > 0 && myAddr.toLowerCase() === members[0].toLowerCase()) {
        const nonce = await this.nonceMgr.acquireNonce();
        try {
          const tx = await this.taskMarket.assignToCoalition(taskIdBig, coalitionAddr, {
            nonce,
            gasLimit: this.config.maxGasPerTx,
          });
          await tx.wait();
          console.log(`[TaskExecutor] Task #${taskId} assigned to coalition`);
          status = Number((await this.taskMarket.tasks(taskIdBig)).status);
        } catch (err) {
          console.error(
            `[TaskExecutor] assignToCoalition failed for #${taskId}:`,
            err instanceof Error ? err.message : err,
          );
        } finally {
          this.nonceMgr.release();
        }
      }

      if (status === TASK_STATUS_ASSIGNED) {
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

    const result = await executeSkill(myRole, payload, this.skillContext(taskId));
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

      const evaluation = evaluateTaskOutcome(
        payload as TaskPayload,
        results.map((r) => ({
          agentType: r.agentType,
          result: r.result as SkillResult,
        })),
      );
      const allOk = evaluation.overallSuccess;
      const executionConsensus = this.coalitionEngine.compileExecutionConsensus(
        results.map((r) => ({ agentType: r.agentType, result: r.result as SkillResult })),
      );
      const summary = JSON.stringify({
        taskId,
        label: payload.label,
        userQuery: payload.userQuery,
        intent: payload.intent,
        evaluation: evaluation.summary,
        criteria: evaluation.criteria,
        results: results.map((r) => r.result),
        ...(executionConsensus
          ? {
              execution: {
                targetContract: executionConsensus.targetContract,
                executionPayload: executionConsensus.executionPayload,
                summary: executionConsensus.summary,
              },
            }
          : {}),
      });

      const nonce = await this.nonceMgr.acquireNonce();
      try {
        const tx = await this.taskMarket.reportCompletion(taskId, allOk, summary.slice(0, 500), {
          nonce,
          gasLimit: this.config.maxGasPerTx,
        });
        await tx.wait();
        console.log(`[TaskExecutor] Task #${taskId} reported ${allOk ? "COMPLETED" : "FAILED"}`);

        if (allOk && executionConsensus) {
          try {
            const execSig = await this.wallet.signMessage(
              ethers.getBytes(
                executionDigest(
                  taskId,
                  this.wallet.address,
                  executionConsensus.targetContract,
                  executionConsensus.executionPayload,
                ),
              ),
            );
            await this.api.postTaskExecution(taskId, {
              address: this.wallet.address,
              targetContract: executionConsensus.targetContract,
              executionPayload: executionConsensus.executionPayload,
              signature: execSig,
            });
          } catch (err) {
            console.warn(`[TaskExecutor] API execution persist failed for #${taskId}:`, err);
          }
          const nonce2 = await this.nonceMgr.acquireNonce();
          try {
            const tx2 = await this.taskMarket.submitTaskResult(
              taskId,
              executionConsensus.targetContract,
              executionConsensus.executionPayload,
              { nonce: nonce2, gasLimit: this.config.maxGasPerTx },
            );
            await tx2.wait();
            console.log(`[TaskExecutor] Task #${taskId} execution payload anchored on-chain`);
          } finally {
            this.nonceMgr.release();
          }
        }
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
