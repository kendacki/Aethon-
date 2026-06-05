import type { AgentType } from "./taskPayload.js";
import type { TaskIntent } from "./taskIntents.js";

export type ReportSection = {
  title: string;
  lines: string[];
};

export type SkillReport = {
  role: AgentType;
  intent: TaskIntent | string;
  headline: string;
  summary: string;
  thinking: string;
  recommendation: string;
  sections: ReportSection[];
  metrics: Record<string, string | number | boolean>;
};

function fmtUsd(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—";
}

function fmtPctFromBps(bps: unknown): string {
  const v = Number(bps);
  return Number.isFinite(v) ? `${(v / 100).toFixed(2)}%` : "—";
}

function titleCaseAsset(asset: string): string {
  const lower = asset.toLowerCase();
  if (lower === "ethereum" || lower === "eth") return "Ethereum";
  return asset.charAt(0).toUpperCase() + asset.slice(1).toLowerCase();
}

export function buildSkillReport(
  role: AgentType,
  intent: TaskIntent | string,
  data: Record<string, unknown>,
): SkillReport {
  switch (role) {
    case "ORACLE":
      return buildOracleReport(intent, data);
    case "ARBITRAGE":
      return buildArbitrageReport(intent, data);
    case "YIELD_OPT":
      return buildYieldReport(intent, data);
    case "GOVERNANCE":
      return buildGovernanceReport(intent, data);
    case "RISK_MGMT":
      return buildRiskReport(intent, data);
    default:
      return {
        role,
        intent,
        headline: "Answer",
        summary: String(data.summary ?? "Your request has been processed."),
        thinking: "Reviewing your request.",
        recommendation: String(data.recommendation ?? ""),
        sections: [],
        metrics: {},
      };
  }
}

function buildOracleReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const asset = titleCaseAsset(String(data.asset ?? "ethereum"));
  const price = Number(data.price);
  const stale = Boolean(data.stale);
  const confidence = Number(data.confidence);
  const source = String(data.source ?? "market data");
  const confPct = Number.isFinite(confidence) ? Math.round(confidence * 100) : null;

  const summary = Number.isFinite(price)
    ? stale
      ? `${asset} last traded at ${fmtUsd(price)}, but the quote is no longer fresh.`
      : `${asset} is ${fmtUsd(price)}${confPct != null ? ` (${confPct}% confidence, ${source})` : ""}.`
    : "We could not retrieve a reliable price for this asset.";

  const thinking = "Checking the latest market price.";

  const recommendation = stale
    ? "Wait for an updated quote before making trading decisions."
    : Number.isFinite(price)
      ? "Use this figure for planning. Refresh before executing a trade."
      : "Try again shortly or rephrase the asset name.";

  return {
    role: "ORACLE",
    intent,
    headline: `${asset} price`,
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Quote",
        lines: [
          `Spot: ${fmtUsd(price)} USD`,
          `Source: ${source}`,
          `Age: ${String(data.ageSec ?? "—")}s (max ${String(data.maxStalenessSec ?? 120)}s)`,
          `Attestation: ${data.signature ? "signed" : "unsigned"}`,
        ],
      },
    ],
    metrics: {
      price,
      stale,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      quality: String(data.quality ?? ""),
    },
  };
}

function buildArbitrageReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const spreadBps = Number(data.spreadBps);
  const profitable = Boolean(data.profitable);
  const asset = titleCaseAsset(String(data.asset ?? "asset"));
  const agentRec = String(data.recommendation ?? "").trim();

  const summary = profitable
    ? `${asset} shows a ${Number.isFinite(spreadBps) ? spreadBps : "—"} basis-point spread — a potential trade exists.`
    : `${asset} shows no worthwhile spread right now.`;

  const thinking = "Comparing prices across venues.";

  const recommendation = profitable
    ? "Proceed only if fees and slippage still leave room to profit."
    : "No action needed. Check again when the market moves.";

  return {
    role: "ARBITRAGE",
    intent,
    headline: profitable ? "Trade opportunity" : "No opportunity",
    summary,
    thinking,
    recommendation: agentRec && agentRec !== summary ? agentRec : recommendation,
    sections: [
      {
        title: "Spread analysis",
        lines: [
          `Reference: ${fmtUsd(data.referenceUsd)} (${String(data.priceSource ?? "")})`,
          `Spread: ${Number.isFinite(spreadBps) ? `${spreadBps} bps` : "—"} (min ${String(data.minSpreadBps ?? 15)} bps)`,
          `Buy: ${String(data.bestBuyVenue ?? "—")} · Sell: ${String(data.bestSellVenue ?? "—")}`,
          `Notional: ${String(data.notionalEth ?? 1)} ETH`,
        ],
      },
    ],
    metrics: {
      spreadBps,
      profitable,
      proceed: Boolean(data.proceed),
      confidence: Number(data.confidence ?? 0),
    },
  };
}

function buildYieldReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const allocation = Array.isArray(data.allocation) ? (data.allocation as Array<{ vaultId: string; pct: number; apyBps: number }>) : [];
  const lines = allocation.map((a) => `${a.pct}% → ${a.vaultId} (${fmtPctFromBps(a.apyBps)} APY)`);
  const amountEth = String(data.amountEth ?? 1);
  const tolerance = String(data.riskTolerance ?? "moderate");
  const agentRec = String(data.recommendation ?? "").trim();

  const allocationText = allocation.length
    ? allocation.map((a) => `${a.pct}% in ${a.vaultId}`).join(", ")
    : "";

  const summary = allocation.length
    ? `For ${amountEth} ETH (${tolerance} risk), allocate ${allocationText}. Blended yield: ${fmtPctFromBps(data.expectedApyBps)}.`
    : `No suitable vault allocation was found for ${amountEth} ETH.`;

  const thinking = "Reviewing vault options and expected yield.";

  const recommendation = allocation.length
    ? "Review the split above before depositing. Rebalance if yields shift materially."
    : "Check vault availability or adjust your amount or risk preference.";

  return {
    role: "YIELD_OPT",
    intent,
    headline: "Yield plan",
    summary,
    thinking,
    recommendation: agentRec && agentRec !== summary ? agentRec : recommendation,
    sections: [
      {
        title: "Allocation",
        lines: lines.length ? lines : ["No vault allocation produced."],
      },
      {
        title: "Risk profile",
        lines: [
          `Tolerance: ${tolerance}`,
          `Expected daily yield: ${String(data.expectedDailyYieldEth ?? "—")} ETH`,
        ],
      },
    ],
    metrics: {
      amountEth: Number(data.amountEth ?? 0),
      expectedApyBps: Number(data.expectedApyBps ?? 0),
      vaultCount: allocation.length,
    },
  };
}

function buildGovernanceReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const vote = String(data.recommendedVote ?? "ABSTAIN");
  const quorumReached = Boolean(data.quorumReached);
  const proposalId = String(data.proposalId ?? "this proposal");
  const supportPct = Math.round(Number(data.supportRatio ?? 0) * 100);

  const llmSummary = typeof data.llmSummary === "string" ? data.llmSummary.trim() : "";
  const summary =
    llmSummary ||
    (quorumReached
      ? `${proposalId}: quorum is met with ${supportPct}% support. A ${vote} vote is recommended.`
      : `${proposalId}: quorum has not been reached yet.`);

  const thinking = "Reviewing vote participation and stake weighting.";

  const recommendation = quorumReached
    ? `Lean ${vote}, unless your voting policy says otherwise.`
    : "Hold off on a final decision until more stakeholders participate.";

  const detailLines = [
    `Recommended vote: ${vote}`,
    `Quorum: ${quorumReached ? "met" : "not met"} (${String(data.participationPct ?? 0)}% participation)`,
    `Stake for: ${String(data.supportStakeEth ?? 0)} STT · against: ${String(data.againstStakeEth ?? 0)} STT`,
  ];
  if (data.llmSummary) detailLines.push(String(data.llmSummary));

  return {
    role: "GOVERNANCE",
    intent,
    headline: `Vote on ${proposalId}`,
    summary,
    thinking,
    recommendation,
    sections: [{ title: "Proposal analysis", lines: detailLines }],
    metrics: {
      recommendedVote: vote,
      quorumReached,
      supportRatio: Number(data.supportRatio ?? 0),
      confidence: Number(data.confidence ?? 0),
    },
  };
}

function buildRiskReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const level = String(data.riskLevel ?? "UNKNOWN");
  const score = Number(data.compositeScore);
  const agentRec = String(data.recommendation ?? "").trim();
  const levelLabel = level.charAt(0) + level.slice(1).toLowerCase();

  const summary = `Fleet health is ${levelLabel.toLowerCase()} (score ${score}/100).`;

  const thinking = "Checking fleet health and circuit-breaker status.";

  const recommendation =
    agentRec ||
    (level === "LOW" || level === "MEDIUM"
      ? "Conditions look stable. You can continue with normal activity."
      : "Consider pausing new requests until fleet health improves.");

  const factorLines = Array.isArray(data.riskFactors)
    ? (data.riskFactors as Array<{ name: string; score: number }>).map((f) => `${f.name}: ${f.score}/100`)
    : [];

  return {
    role: "RISK_MGMT",
    intent,
    headline: `Risk: ${levelLabel}`,
    summary,
    thinking,
    recommendation: agentRec && agentRec !== summary ? agentRec : recommendation,
    sections: [
      {
        title: "Signals",
        lines: [
          `Circuit breaker: ${data.circuitPaused ? "paused" : "active"}`,
          `Healthy agents: ${String(data.activeAgents ?? 0)} (min ${String(data.minHealthyAgents ?? 3)})`,
          `Consecutive failures: ${String(data.consecutiveFailures ?? 0)}`,
          ...factorLines,
        ],
      },
    ],
    metrics: {
      compositeScore: score,
      riskLevel: level,
      proceed: Boolean(data.proceed),
      circuitPaused: Boolean(data.circuitPaused),
    },
  };
}
