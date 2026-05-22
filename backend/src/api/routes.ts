import { Router } from "express";
import { blockchain } from "../services/blockchain.js";
import { store } from "../services/store.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    const health = await blockchain.getHealth();
    res.json({ data: health });
  } catch (err) {
    next(err);
  }
});

export const agentsRouter = Router();

agentsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ data: store.listAgents() });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/:address", async (req, res, next) => {
  try {
    const cached = store.agents.get(req.params.address.toLowerCase());
    if (cached) return res.json({ data: cached });
    const agent = await blockchain.fetchAgent(req.params.address);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    store.upsertAgent(agent);
    res.json({ data: agent });
  } catch (err) {
    next(err);
  }
});

export const tasksRouter = Router();

tasksRouter.get("/", (req, res) => {
  const status = req.query.status as string | undefined;
  const data = store.listTasks(status ? { status: status as never } : undefined);
  res.json({ data });
});

tasksRouter.get("/:id", (req, res) => {
  const task = store.tasks.get(Number(req.params.id));
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ data: task });
});

export const coalitionsRouter = Router();

coalitionsRouter.get("/", (_req, res) => {
  res.json({ data: store.listCoalitions() });
});

export const statsRouter = Router();

statsRouter.get("/", async (_req, res, next) => {
  try {
    const health = await blockchain.getHealth();
    res.json({ data: store.getStats(health.circuitBreakerPaused, health.blockNumber, health.chainId) });
  } catch (err) {
    next(err);
  }
});

export const leaderboardRouter = Router();

leaderboardRouter.get("/", (req, res) => {
  const page = Math.max(0, Number(req.query.page ?? 0));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const sorted = store.listAgents().sort((a, b) => b.reputation - a.reputation);
  const start = page * pageSize;
  res.json({
    data: sorted.slice(start, start + pageSize),
    pagination: { page, pageSize, total: sorted.length },
  });
});

export const somniaRouter = Router();

somniaRouter.get("/agents", (_req, res) => {
  res.json({
    data: {
      enabled: process.env.SOMNIA_AGENTS_ENABLED === "true",
      reactivity: process.env.REACTIVITY_ENABLED === "true",
      dataStreams: process.env.DATA_STREAMS_ENABLED === "true",
      adpPort: 9090,
    },
  });
});
