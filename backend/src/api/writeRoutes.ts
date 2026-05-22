import { Router } from "express";
import { z } from "zod";
import { store } from "../services/store.js";
import { eventBus } from "../services/eventBus.js";

const API_KEY = process.env.API_KEY ?? "dev-api-key";

export const writeRouter = Router();

function requireApiKey(req: { header: (name: string) => string | undefined }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) {
  const key = req.header("x-api-key");
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

const registerSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
  metadataURI: z.string().optional(),
});

writeRouter.post("/agents/register", requireApiKey, (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const record = {
    address: parsed.data.address,
    agentType: parsed.data.agentType,
    stake: "0",
    reputation: 100,
    online: false,
    lastHeartbeat: new Date().toISOString(),
    metadataURI: parsed.data.metadataURI,
  };
  store.upsertAgent(record);
  eventBus.publish("agents", "AGENT_PREREGISTERED", record);
  res.status(201).json({ data: record });
});

const submitTaskSchema = z.object({
  taskHash: z.string(),
  complexity: z.number().int().min(1).max(5),
  rewardWei: z.string(),
  submitter: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().optional(),
});

writeRouter.post("/tasks/submit", (req, res) => {
  const parsed = submitTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = ++store.taskCounter;
  const task = {
    id,
    submitter: parsed.data.submitter,
    taskHash: parsed.data.taskHash,
    reward: parsed.data.rewardWei,
    complexity: parsed.data.complexity,
    deadline: new Date(Date.now() + 3_600_000).toISOString(),
    status: "PENDING" as const,
  };
  store.upsertTask(task);
  eventBus.publish("tasks", "TASK_SUBMITTED", { taskId: id, reward: parsed.data.rewardWei });
  res.status(201).json({ data: task, note: "Queued for on-chain submission by agent runtime" });
});
