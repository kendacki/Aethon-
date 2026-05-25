import { Router } from "express";
import { z } from "zod";
import { getManifest } from "../agent/manifests/data.js";
import { checkDb } from "../db/client.js";
import { repo } from "../db/repository.js";
import { indexer } from "../services/indexer.js";
import { parseBool, parsePagination } from "./middleware.js";
import type { TaskStatus } from "../services/types.js";
import {
  verifyCoalitionSignature,
  verifySkillResultSignature,
} from "../services/coalitionVerify.js";
import { getAgentHealthByAddress, getFleetHealth } from "../services/fleetHealth.js";

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

agentsRouter.get("/", async (req, res, next) => {
  try {
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
    const { page, pageSize } = parsePagination(req);
    const result = await repo.listAgents({ page, pageSize });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const somniaRouter = Router();

somniaRouter.get("/agents", async (_req, res, next) => {
  try {
    const sync = await indexer.getSyncStatus();
    res.json({
      data: {
        enabled: process.env.SOMNIA_AGENTS_ENABLED === "true",
        reactivity: process.env.REACTIVITY_ENABLED === "true",
        dataStreams: process.env.DATA_STREAMS_ENABLED === "true",
        adpPort: 9090,
        lastIndexedBlock: sync.lastIndexedBlock,
      },
    });
  } catch (err) {
    next(err);
  }
});
