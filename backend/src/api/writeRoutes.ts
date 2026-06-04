import { Router } from "express";
import { z } from "zod";
import { repo } from "../db/repository.js";
import { eventBus } from "../services/eventBus.js";
import { relayer, verifyTaskSignature } from "../services/relayer.js";
import { requireAuth } from "./authenticateToken.js";
import {
  hashTaskPayload,
  validateTaskPayload,
  type TaskPayload,
} from "../shared/taskPayload.js";

export const writeRouter = Router();

const registerSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]),
  metadataURI: z.string().optional(),
});

writeRouter.post("/agents/register", requireAuth, async (req, res, next) => {
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
  taskHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  payload: z.record(z.unknown()).optional(),
  complexity: z.number().int().min(1).max(5),
  rewardWei: z.string().regex(/^\d+$/),
  submitter: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

writeRouter.post("/tasks/submit", requireAuth, async (req, res, next) => {
  try {
    const parsed = submitTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let taskHash = parsed.data.taskHash;
    if (parsed.data.payload) {
      if (!validateTaskPayload(parsed.data.payload)) {
        return res.status(400).json({ error: "Invalid task payload schema" });
      }
      taskHash = hashTaskPayload(parsed.data.payload as TaskPayload);
    }
    if (!taskHash) {
      return res.status(400).json({ error: "Provide taskHash or payload" });
    }

    const { submitter, complexity, rewardWei, signature } = parsed.data;
    if (!verifyTaskSignature(submitter, taskHash, complexity, rewardWei, signature)) {
      return res.status(401).json({ error: "Invalid submitter signature" });
    }

    if (parsed.data.payload && validateTaskPayload(parsed.data.payload)) {
      await repo.saveTaskPayload(taskHash, parsed.data.payload);
    }

    const hasRelayer = Boolean(
      process.env.RELAYER_PRIVATE_KEY ?? process.env.AGENT_PRIVATE_KEY ?? process.env.DEPLOYER_PK
    );

    if (hasRelayer && process.env.TASK_MARKET_ADDR) {
      const outboxId = await repo.enqueueTaskOutbox({ submitter, taskHash, complexity, rewardWei, signature });
      const { taskId, txHash } = await relayer.submitImmediate({
        submitter,
        taskHash,
        complexity,
        rewardWei,
        signature,
      });
      await repo.markOutboxSubmitted(outboxId, taskId, txHash);
      res.status(201).json({ data: { taskId, taskHash, txHash, status: "SUBMITTED_ON_CHAIN" } });
      return;
    }

    const outboxId = await repo.enqueueTaskOutbox({ submitter, taskHash, complexity, rewardWei, signature });
    eventBus.publish("tasks", "TASK_QUEUED", { outboxId, submitter, taskHash });
    res.status(202).json({
      data: { outboxId, taskHash, status: "QUEUED" },
      note: "Task queued; relayer will submit on-chain when configured",
    });
  } catch (err) {
    next(err);
  }
});
