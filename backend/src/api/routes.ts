import { Router } from "express";
import { z } from "zod";
import { getManifest } from "../agent/manifests/data.js";
import { checkDb } from "../db/client.js";
import { repo } from "../db/repository.js";
import { indexer } from "../services/indexer.js";
import { taskPromoter } from "../services/taskPromoter.js";
import { parseBool, parsePagination } from "./middleware.js";
import type { TaskStatus } from "../services/types.js";
import {
  verifyCoalitionSignature,
  verifySkillResultSignature,
  verifyExecutionSignature,
} from "../services/coalitionVerify.js";
import { getAgentHealthByAddress, getFleetHealth } from "../services/fleetHealth.js";
import { syncFleetFromChain } from "../services/fleetSync.js";
import { validateTaskPayload } from "../shared/taskPayload.js";
import { getSomniaCompatibilityReport } from "../services/somniaCompat.js";
import { searchKnowledge, storeObservation } from "../knowledge/repository.js";
import type { AgentType } from "../shared/taskPayload.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    const dbOk = await checkDb();
    const sync = await indexer.getSyncStatus();
    const [circuitPaused, consecutiveFailures] = await Promise.all([
      indexer.isCircuitPaused(),
      indexer.getConsecutiveFailures(),
    ]);
    res.json({
      data: {
        status: !dbOk ? "DEGRADED" : circuitPaused ? "DEGRADED" : "OK",
        database: dbOk,
        circuitBreakerPaused: circuitPaused,
        consecutiveFailures,
        blockNumber: sync.headBlock,
        lastIndexedBlock: sync.lastIndexedBlock,
        synced: sync.synced && dbOk,
        chainId: Number(process.env.SOMNIA_CHAIN_ID ?? 50312),
        contracts: {
          agentRegistry: process.env.AGENT_REGISTRY_ADDR ?? null,
          taskMarket: process.env.TASK_MARKET_ADDR ?? null,
          coalitionManager: process.env.COALITION_MANAGER_ADDR ?? null,
          reputationEngine: process.env.REPUTATION_ENGINE_ADDR ?? null,
          circuitBreaker: process.env.CIRCUIT_BREAKER_ADDR ?? null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

healthRouter.get("/live", (_req, res) => {
  res.json({ data: { alive: true } });
});

healthRouter.get("/ready", async (_req, res) => {
  const dbOk = await checkDb();
  const sync = await indexer.getSyncStatus();
  if (!dbOk || !sync.synced) {
    res.status(503).json({ data: { ready: false, database: dbOk, synced: sync.synced } });
    return;
  }
  res.json({ data: { ready: true } });
});

export const agentsRouter = Router();

agentsRouter.get("/manifests/:role", (req, res) => {
  const manifest = getManifest(req.params.role.toUpperCase());
  if (!manifest) return res.status(404).json({ error: "Manifest not found" });
  res.json({ data: manifest });
});

agentsRouter.get("/fleet-health", async (_req, res, next) => {
  try {
    const data = await getFleetHealth();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

agentsRouter.post("/sync", async (_req, res, next) => {
  try {
    const data = await syncFleetFromChain();
    res.json({ data, synced: data.length });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/", async (req, res, next) => {
  try {
    await syncFleetFromChain().catch((err) => {
      console.warn("[agents] chain sync failed:", err instanceof Error ? err.message : err);
    });
    const { page, pageSize } = parsePagination(req);
    const result = await repo.listAgents({
      page,
      pageSize,
      type: req.query.type as string | undefined,
      online: parseBool(req.query.online),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/:address/health", async (req, res, next) => {
  try {
    const data = await getAgentHealthByAddress(req.params.address);
    if (!data) return res.status(404).json({ error: "Agent health not found" });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/:address", async (req, res, next) => {
  try {
    let agent = await repo.getAgent(req.params.address);
    if (!agent) {
      agent = await indexer.fetchAgent(req.params.address);
      if (agent) await repo.upsertAgent(agent);
    }
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({ data: agent });
  } catch (err) {
    next(err);
  }
});

export const reputationRouter = Router();

reputationRouter.get("/:address", async (req, res, next) => {
  try {
    const data = await repo.getReputation(req.params.address);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const tasksRouter = Router();

tasksRouter.get("/intents/catalog", async (_req, res) => {
  const { INTENT_CATALOG } = await import("../shared/taskIntents.js");
  res.json({ data: Object.values(INTENT_CATALOG) });
});

tasksRouter.get("/payload/:hash", async (req, res, next) => {
  try {
    const hash = req.params.hash.toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(hash)) {
      return res.status(400).json({ error: "Invalid task hash" });
    }
    const payload = await repo.getTaskPayload(hash);
    if (!payload) return res.status(404).json({ error: "Payload not found" });
    res.json({ data: { taskHash: hash, payload } });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/:id/promote", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    await taskPromoter.runOnce();
    await indexer.syncLiveState();
    const task = await repo.getTask(taskId);
    res.json({ data: { taskId, status: task?.status ?? "UNKNOWN", note: "Promotion tick ran" } });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id/coalition-intents", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const data = await repo.getCoalitionIntents(taskId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

const coalitionIntentSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
  members: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).optional(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/).optional(),
});

tasksRouter.post("/:id/coalition-intent", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const parsed = coalitionIntentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { address, agentType, members, signature } = parsed.data;
    if (signature && members) {
      const valid = verifyCoalitionSignature(members, BigInt(taskId), address, signature);
      if (!valid) return res.status(401).json({ error: "Invalid coalition signature" });
    }

    await repo.addCoalitionIntent({
      taskId,
      agentAddress: address,
      agentType,
      signature: signature ?? null,
    });
    res.status(201).json({ data: { taskId, address, agentType, signed: Boolean(signature) } });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id/detail", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    let task = await repo.getTask(taskId);
    if (!task) {
      await indexer.syncTaskRecord(taskId);
      task = await repo.getTask(taskId);
    }
    if (!task) {
      const outbox = await repo.getOutboxByOnChainTaskId(taskId);
      if (outbox) {
        task = {
          id: taskId,
          submitter: outbox.submitter,
          taskHash: outbox.taskHash,
          reward: outbox.rewardWei,
          complexity: outbox.complexity,
          deadline: new Date(Date.now() + 86_400_000).toISOString(),
          status: "PENDING",
          txHash: outbox.txHash,
        };
      }
    }
    if (!task) return res.status(404).json({ error: "Task not found" });
    const rawPayload = await repo.getTaskPayload(task.taskHash);
    const payload =
      rawPayload && typeof rawPayload === "object" && validateTaskPayload(rawPayload)
        ? rawPayload
        : null;
    const skillResults = await repo.getSkillResults(taskId);
    const { evaluateTaskOutcome } = await import("../shared/taskEvaluation.js");
    const { buildPortfolioBriefing } = await import("../shared/portfolioBriefing.js");
    const { INTENT_CATALOG } = await import("../shared/taskIntents.js");
    const mappedResults = skillResults.map((r) => ({
      agentType: r.agentType,
      result: r.result as { success?: boolean; data?: Record<string, unknown>; error?: string },
    }));
    const evaluation = evaluateTaskOutcome(payload, mappedResults);
    const catalog =
      payload?.intent && payload.intent in INTENT_CATALOG
        ? INTENT_CATALOG[payload.intent as keyof typeof INTENT_CATALOG]
        : null;
    const portfolioBriefing = buildPortfolioBriefing(mappedResults, payload);
    res.json({
      data: {
        task,
        payload,
        skillResults,
        evaluation,
        portfolioBriefing,
        catalog: catalog
          ? {
              agentWork: catalog.agentWork,
              sources: catalog.sources,
              successCriteria: catalog.successCriteria,
            }
          : null,
        execution:
          task.executionTarget && task.executionPayload
            ? {
                targetContract: task.executionTarget,
                executionPayload: task.executionPayload,
              }
            : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

const taskExecutionSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  targetContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  executionPayload: z.string().regex(/^0x[a-fA-F0-9]*$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

tasksRouter.post("/:id/execution", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const parsed = taskExecutionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { address, targetContract, executionPayload, signature } = parsed.data;
    if (
      !verifyExecutionSignature(taskId, address, targetContract, executionPayload, signature)
    ) {
      return res.status(401).json({ error: "Invalid execution signature" });
    }

    const task = await repo.getTask(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "COMPLETED") {
      return res.status(409).json({ error: "Task must be completed before anchoring execution" });
    }
    if (
      task.authorizedReporter &&
      task.authorizedReporter.toLowerCase() !== address.toLowerCase()
    ) {
      return res.status(403).json({ error: "Only the task reporter may anchor execution" });
    }

    await repo.saveTaskExecution(taskId, targetContract, executionPayload);
    res.status(201).json({ data: { taskId, targetContract, executionPayload } });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id/skill-results", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const data = await repo.getSkillResults(taskId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

const skillResultSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
  result: z.record(z.unknown()),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

tasksRouter.post("/:id/skill-result", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: "Invalid task id" });
    const parsed = skillResultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { address, agentType, result, signature } = parsed.data;
    const resultJson = JSON.stringify(result);
    if (!verifySkillResultSignature(taskId, address, agentType, resultJson, signature)) {
      return res.status(401).json({ error: "Invalid skill result signature" });
    }

    await repo.saveSkillResult({ taskId, agentAddress: address, agentType, result });
    res.status(201).json({ data: { taskId, address, agentType } });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    await indexer.syncLiveState().catch((err) => {
      console.warn("[tasks] live sync failed:", err instanceof Error ? err.message : err);
    });
    const { page, pageSize } = parsePagination(req);
    const result = await repo.listTasks({
      page,
      pageSize,
      status: req.query.status as TaskStatus | undefined,
      complexity: req.query.complexity ? Number(req.query.complexity) : undefined,
      submitter: req.query.submitter as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/wallet/:address/stats", async (req, res, next) => {
  try {
    const address = req.params.address;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const data = await repo.getSubmitterStats(address);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await repo.getTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
});

export const coalitionsRouter = Router();

coalitionsRouter.get("/", async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req);
    const result = await repo.listCoalitions({
      page,
      pageSize,
      dissolved: parseBool(req.query.dissolved),
      taskId: req.query.taskId ? Number(req.query.taskId) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

coalitionsRouter.get("/:address", async (req, res, next) => {
  try {
    const coalition = await repo.getCoalition(req.params.address);
    if (!coalition) return res.status(404).json({ error: "Coalition not found" });
    res.json({ data: coalition });
  } catch (err) {
    next(err);
  }
});

export const circuitBreakerRouter = Router();

circuitBreakerRouter.get("/", async (_req, res, next) => {
  try {
    const [paused, consecutiveFailures] = await Promise.all([
      indexer.isCircuitPaused(),
      indexer.getConsecutiveFailures(),
    ]);
    res.json({
      data: {
        paused,
        consecutiveFailures,
        threshold: Number(process.env.CIRCUIT_BREAKER_THRESHOLD ?? 3),
        resetTimelockSeconds: 3600,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const statsRouter = Router();

statsRouter.get("/", async (_req, res, next) => {
  try {
    const sync = await indexer.getSyncStatus();
    const circuitPaused = await indexer.isCircuitPaused();
    const data = await repo.getStats(circuitPaused, sync.headBlock, Number(process.env.SOMNIA_CHAIN_ID ?? 50312));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (req, res, next) => {
  try {
    await syncFleetFromChain().catch((err) => {
      console.warn("[leaderboard] chain sync failed:", err instanceof Error ? err.message : err);
    });
    const { page, pageSize } = parsePagination(req);
    const result = await repo.listLeaderboard({ page, pageSize });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const somniaRouter = Router();

somniaRouter.get("/agents", async (_req, res, next) => {
  try {
    const sync = await indexer.getSyncStatus();
    const report = getSomniaCompatibilityReport();
    res.json({
      data: {
        enabled: report.config.enabled,
        reactivity: process.env.REACTIVITY_ENABLED === "true",
        dataStreams: process.env.DATA_STREAMS_ENABLED === "true",
        adpPort: 9090,
        adpHost: process.env.SOMNIA_ADP_HOST ?? process.env.ADP_HOST ?? null,
        lastIndexedBlock: sync.lastIndexedBlock,
        ...report,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const knowledgeRouter = Router();

const AGENT_ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"] as const;

knowledgeRouter.get("/:role", async (req, res, next) => {
  try {
    const role = req.params.role.toUpperCase();
    if (!AGENT_ROLES.includes(role as (typeof AGENT_ROLES)[number])) {
      return res.status(400).json({ error: "Invalid agent role" });
    }
    const q = String(req.query.q ?? "");
    const limit = Math.min(10, Math.max(1, Number(req.query.limit ?? 5)));
    const data = await searchKnowledge(role as AgentType, q, limit);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.post("/observations", async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
      taskId: z.number().int().optional(),
      observationType: z.string().optional(),
      payload: z.record(z.unknown()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid observation payload" });
    await storeObservation({
      role: parsed.data.role,
      taskId: parsed.data.taskId,
      observationType: parsed.data.observationType ?? "skill_outcome",
      payload: parsed.data.payload,
    });
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
