import type { TaskPayload } from "../../shared/taskPayload.js";
import { skillFail, skillOk, type SkillExecutor } from "./types.js";

export const executeGovernance: SkillExecutor = async (payload, _ctx) => {
  if (payload.action !== "analyze_proposal" && payload.action !== "swarm_execute") {
    return skillFail("GOVERNANCE", payload.action, `Unknown action: ${payload.action}`);
  }

  const proposalId = String(payload.params.proposalId ?? "unknown");
  const support = Number(payload.params.supportStakeEth ?? 0);
  const against = Number(payload.params.againstStakeEth ?? 0);
  const quorum = Number(payload.params.quorumEth ?? 0);
  const total = support + against;
  const quorumReached = total >= quorum;
  const supportRatio = total > 0 ? support / total : 0;

  let recommendedVote: "FOR" | "AGAINST" | "ABSTAIN" = "ABSTAIN";
  let confidence = 0.5;
  if (quorumReached) {
    if (supportRatio >= 0.66) {
      recommendedVote = "FOR";
      confidence = Math.min(0.95, 0.55 + supportRatio * 0.4);
    } else if (supportRatio <= 0.4) {
      recommendedVote = "AGAINST";
      confidence = Math.min(0.95, 0.55 + (1 - supportRatio) * 0.4);
    }
  }

  return skillOk("GOVERNANCE", payload.action, {
    proposalId,
    supportStakeEth: support,
    againstStakeEth: against,
    quorumEth: quorum,
    quorumReached,
    supportRatio: Number(supportRatio.toFixed(4)),
    recommendedVote,
    confidence: Number(confidence.toFixed(2)),
    summary: quorumReached
      ? `Proposal ${proposalId}: ${recommendedVote} (${Math.round(supportRatio * 100)}% support)`
      : `Proposal ${proposalId}: quorum not reached (${total}/${quorum} STT)`,
  });
};
