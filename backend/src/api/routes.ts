import { Router } from "express";
import { checkDb } from "../db/client.js";
import { repo } from "../db/repository.js";
import { indexer } from "../services/indexer.js";
import { parseBool, parsePagination } from "./middleware.js";
import type { TaskStatus } from "../services/types.js";

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
