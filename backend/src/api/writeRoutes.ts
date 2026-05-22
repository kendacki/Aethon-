import { Router } from "express";
import { z } from "zod";
import { repo } from "../db/repository.js";
import { eventBus } from "../services/eventBus.js";
import { relayer, verifyTaskSignature } from "../services/relayer.js";
import { requireApiKey } from "./middleware.js";

export const writeRouter = Router();

const registerSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
  metadataURI: z.string().optional(),
});

writeRouter.post("/agents/register", requireApiKey, async (req, res, next) => {
  try {
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
    await repo.upsertAgent(record);
    eventBus.publish("agents", "AGENT_PREREGISTERED", { ...record });
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

const submitTaskSchema = z.object({
  taskHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  complexity: z.number().int().min(1).max(5),
  rewardWei: z.string().regex(/^\d+$/),
  submitter: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

writeRouter.post("/tasks/submit", requireApiKey, async (req, res, next) => {
  try {
    const parsed = submitTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { submitter, taskHash, complexity, rewardWei, signature } = parsed.data;
    if (!verifyTaskSignature(submitter, taskHash, complexity, rewardWei, signature)) {
      return res.status(401).json({ error: "Invalid submitter signature" });
    }

    const hasRelayer = Boolean(
      process.env.RELAYER_PRIVATE_KEY ?? process.env.AGENT_PRIVATE_KEY ?? process.env.DEPLOYER_PK
    );

    if (hasRelayer && process.env.TASK_MARKET_ADDR) {
      const { taskId, txHash } = await relayer.submitImmediate({ taskHash, complexity, rewardWei });
      res.status(201).json({ data: { taskId, txHash, status: "SUBMITTED_ON_CHAIN" } });
      return;
    }

    const outboxId = await repo.enqueueTaskOutbox({ submitter, taskHash, complexity, rewardWei, signature });
    eventBus.publish("tasks", "TASK_QUEUED", { outboxId, submitter });
    res.status(202).json({
      data: { outboxId, status: "QUEUED" },
      note: "Task queued; relayer will submit on-chain when configured",
    });
  } catch (err) {
    next(err);
  }
});
