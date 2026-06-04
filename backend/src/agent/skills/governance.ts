import type { TaskPayload } from "../../shared/taskPayload.js";
import { enrichSkillData } from "./meta.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

export const executeGovernance: SkillExecutor = async (payload, ctx) => {
  if (payload.action !== "analyze_proposal" && payload.action !== "swarm_execute") {
    return skillFail("GOVERNANCE", payload.action, `Unknown action: ${payload.action}`);
  }

  const proposalId = String(payload.params.proposalId ?? "unknown");
  const support = Number(payload.params.supportStakeEth ?? 0);
  const against = Number(payload.params.againstStakeEth ?? 0);
  const quorum = Number(payload.params.quorumEth ?? 0);
  const passThreshold = Number(payload.params.passThreshold ?? 0.66);

  const total = support + against;
  const quorumReached = total >= quorum;
  const supportRatio = total > 0 ? support / total : 0;
  const participationPct = quorum > 0 ? Math.min(100, Math.round((total / quorum) * 100)) : 0;

  let recommendedVote: "FOR" | "AGAINST" | "ABSTAIN" = "ABSTAIN";
  let confidence = 0.45;
  const flags: string[] = [];

  if (!quorumReached) {
    flags.push("QUORUM_NOT_MET");
  }
  if (participationPct > 0 && participationPct < 50) {
    flags.push("LOW_PARTICIPATION");
  }

  if (quorumReached) {
    if (supportRatio >= passThreshold) {
      recommendedVote = "FOR";
      confidence = Math.min(0.96, 0.5 + supportRatio * 0.45);
    } else if (supportRatio <= 1 - passThreshold) {
      recommendedVote = "AGAINST";
      confidence = Math.min(0.96, 0.5 + (1 - supportRatio) * 0.45);
    } else {
      flags.push("SPLIT_VOTE");
      confidence = 0.55;
    }
  }

  const summary = quorumReached
    ? `Proposal ${proposalId}: ${recommendedVote} (${Math.round(supportRatio * 100)}% support, threshold ${Math.round(passThreshold * 100)}%)`
    : `Proposal ${proposalId}: quorum not reached (${total}/${quorum} STT, ${participationPct}% participation)`;

  let llmSummary: string | undefined;
  let llmSource: string | undefined;
  if (ctx.somnia && payload.params.llmSummary !== false) {
    try {
      const prompt = [
        `Proposal ID: ${proposalId}`,
        `Support stake: ${support} STT`,
        `Against stake: ${against} STT`,
        `Quorum: ${quorum} STT (${quorumReached ? "met" : "not met"})`,
        `Recommended vote: ${recommendedVote}`,
        `Flags: ${flags.join(", ") || "none"}`,
        "Write a 2-sentence plain-language summary for token holders.",
      ].join("\n");
      llmSummary = await ctx.somnia.inferString(
        prompt,
        "You are a DeFi governance analyst on Somnia Agentic L1. Be concise and factual.",
      );
      llmSource = "somnia_llm_inference";
    } catch (err) {
      console.warn("[GOVERNANCE] Somnia LLM summary failed:", err);
    }
  }

  const criteriaMet = quorumReached && recommendedVote !== "ABSTAIN";

  return skillOk(
    "GOVERNANCE",
    payload.action,
    enrichSkillData(
      "GOVERNANCE",
      payload,
      {
        proposalId,
        supportStakeEth: support,
        againstStakeEth: against,
        quorumEth: quorum,
        passThreshold,
        quorumReached,
        participationPct,
        supportRatio: Number(supportRatio.toFixed(4)),
        recommendedVote,
        confidence: Number(confidence.toFixed(2)),
        flags,
        summary: llmSummary ?? summary,
        ...(llmSummary ? { llmSummary, llmSource } : {}),
      },
      criteriaMet,
    ),
  );
};
