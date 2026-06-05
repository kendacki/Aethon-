import type { AgentType, TaskPayload } from "../../shared/taskPayload.js";
import type { KnowledgeChunk } from "../../knowledge/types.js";
import { proseClean } from "../../shared/skillReport.js";
import type { SkillContext, SkillExecutor, SkillResult } from "../skills/types.js";
import {
  recoveryGuidance,
  userHappyPathHint,
  verifySkillResult,
  type PlanStep,
} from "./verifyResult.js";

async function synthesizeBrainSummary(
  ctx: SkillContext,
  role: AgentType,
  userQuery: string,
  data: Record<string, unknown>,
  citations: KnowledgeChunk[],
): Promise<string | undefined> {
  if (!ctx.somnia) return undefined;

  const facts = JSON.stringify(
    {
      role,
      price: data.price,
      spreadBps: data.spreadBps,
      expectedApyBps: data.expectedApyBps,
      recommendedVote: data.recommendedVote,
      compositeScore: data.compositeScore,
      riskLevel: data.riskLevel,
      recommendation: data.recommendation,
      summary: data.summary,
    },
    null,
    0,
  ).slice(0, 1200);

  const citeText = citations
    .slice(0, 3)
    .map((c) => c.title)
    .join("; ");

  const prompt = [
    `User question: ${userQuery.slice(0, 400)}`,
    `Verified tool output (do not invent numbers): ${facts}`,
    citeText ? `Reference policies: ${citeText}` : "",
    "Write 2 concise sentences for the user. Use only numbers from the tool output.",
  ]
    .filter(Boolean)
    .join("\n");

  return ctx.somnia.inferString(
    prompt,
    "You are an Aethon DeFi agent. Summarize verified data only. Never fabricate prices, APY, or votes.",
  );
}

export async function runAgentLoop(
  role: AgentType,
  payload: TaskPayload,
  ctx: SkillContext,
  executor: SkillExecutor,
): Promise<SkillResult> {
  const steps: PlanStep[] = [];
  const userQuery = String(payload.userQuery ?? payload.params.userQuery ?? "");
  let citations: KnowledgeChunk[] = [];

  try {
    if (ctx.fetchKnowledge && userQuery.length >= 4) {
      citations = await ctx.fetchKnowledge(role, userQuery, 5);
      steps.push({
        phase: "retrieve",
        status: citations.length ? "ok" : "skipped",
        detail: citations.length ? `${citations.length} knowledge citations` : "no matching knowledge",
      });
    } else {
      steps.push({ phase: "retrieve", status: "skipped", detail: "knowledge retrieval not configured" });
    }
  } catch (err) {
    steps.push({
      phase: "retrieve",
      status: "skipped",
      detail: err instanceof Error ? err.message : "knowledge unavailable",
    });
  }

  let result = await executor(payload, { ...ctx, knowledgeCitations: citations });
  steps.push({
    phase: "execute",
    status: result.success ? "ok" : "failed",
    detail: result.success ? `${result.action} completed` : result.error ?? "skill failed",
  });

  if (!result.success) {
    const recovery = recoveryGuidance(role, result.error);
    const hint = userHappyPathHint(role, false);
    steps.push({ phase: "recover", status: "ok", detail: "recovery guidance attached" });
    return {
      ...result,
      data: {
        ...result.data,
        plan: steps,
        recovery,
        userGuidance: hint,
        ragCitations: citations.map((c) => ({ title: c.title, source: c.sourceUrl })),
      },
    };
  }

  const verification = verifySkillResult(role, result.data);
  steps.push({
    phase: "verify",
    status: verification.ok ? "ok" : "warn",
    detail: verification.notes,
  });

  let brainSummary: string | undefined;
  if (ctx.somnia && userQuery.length >= 8 && process.env.AGENT_BRAIN_ENABLED !== "false") {
    try {
      brainSummary = await synthesizeBrainSummary(ctx, role, userQuery, result.data, citations);
      steps.push({ phase: "synthesize", status: brainSummary ? "ok" : "skipped", detail: "brain summary" });
    } catch (err) {
      steps.push({
        phase: "synthesize",
        status: "skipped",
        detail: err instanceof Error ? err.message : "brain unavailable",
      });
    }
  } else {
    steps.push({ phase: "synthesize", status: "skipped", detail: "brain disabled or no LLM client" });
  }

  const mergedSources = [
    ...(Array.isArray(result.data.sources) ? (result.data.sources as string[]) : []),
    ...citations.map((c) => c.title),
  ];
  const uniqueSources = [...new Set(mergedSources)];

  result = {
    ...result,
    data: {
      ...result.data,
      plan: steps,
      ragCitations: citations.map((c) => ({ title: c.title, source: c.sourceUrl, score: c.score })),
      ...(verification.warnings.length ? { verificationWarnings: verification.warnings } : {}),
      ...(brainSummary ? { brainSummary } : {}),
      sources: uniqueSources,
    },
  };

  if (ctx.storeObservation) {
    void ctx
      .storeObservation({
        role,
        taskId: ctx.taskId,
        observationType: "skill_outcome",
        payload: {
          success: result.success,
          action: result.action,
          intent: payload.intent,
          spreadBps: result.data.spreadBps,
          price: result.data.price,
          compositeScore: result.data.compositeScore,
          expectedApyBps: result.data.expectedApyBps,
        },
      })
      .catch(() => undefined);
  }

  if (brainSummary) {
    brainSummary = proseClean(brainSummary);
    result.data.summary = brainSummary;
    const report = result.data.report as { summary?: string } | undefined;
    if (report && typeof report === "object") {
      report.summary = brainSummary;
    }
  }

  return result;
}
