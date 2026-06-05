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
        headline: "Agent report",
        summary: String(data.summary ?? "Task completed."),
        thinking: "Reviewed available signals for your request.",
        recommendation: String(data.recommendation ?? "No further action required."),
        sections: [],
        metrics: {},
      };
  }
}

function buildOracleReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const asset = String(data.asset ?? "ethereum");
  const price = Number(data.price);
  const stale = Boolean(data.stale);
  const confidence = Number(data.confidence);
  const headline = stale
    ? `${asset.toUpperCase()} price (stale quote)`
    : `${asset.toUpperCase()} spot price`;
  const summary =
    String(data.summary) ||
    (Number.isFinite(price)
      ? `${asset.toUpperCase()} is ${fmtUsd(price)} USD (${String(data.source ?? "oracle")}, confidence ${Number.isFinite(confidence) ? Math.round(confidence * 100) : "—"}%).`
      : "Price lookup did not return a valid quote.");

  const thinking = stale
    ? "Fetched the latest quote, but it exceeded the allowed staleness window."
    : "Fetched the live USD spot quote and confirmed it is within the freshness threshold.";

  const recommendation = stale
    ? "Wait for a fresh attestation before using this price for trades or portfolio sizing."
    : Number.isFinite(price)
      ? `Use ${fmtUsd(price)} as the working ETH reference; recheck if the market moves sharply or the quote ages out.`
      : "Retry the price lookup or switch to a backup oracle source.";

  return {
    role: "ORACLE",
    intent,
    headline,
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Quote",
        lines: [
          `Spot: ${fmtUsd(price)} USD`,
          `Source: ${String(data.source ?? "unknown")}`,
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
  const recommendation = String(data.recommendation ?? "");
  const headline = profitable ? "Arbitrage opportunity" : "No actionable spread";
  const summary =
    recommendation ||
    `${String(data.asset ?? "asset")} spread ${Number.isFinite(spreadBps) ? spreadBps : "—"} bps.`;

  const thinking = `Compared reference price to simulated venue quotes and measured spread against the ${String(data.minSpreadBps ?? 15)} bps minimum.`;

  return {
    role: "ARBITRAGE",
    intent,
    headline,
    summary,
    thinking,
    recommendation:
      recommendation ||
      (profitable ? "Consider executing when gas and slippage still leave room above the minimum spread." : "Hold off and re-scan when volatility or liquidity improves."),
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
      {
        title: "Recommendation",
        lines: [recommendation || (profitable ? "Execute when gas allows." : "Hold and re-scan later.")],
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
  const headline = "Yield allocation plan";
  const summary =
    String(data.summary) ||
    String(data.recommendation) ||
    `Blended APY ${fmtPctFromBps(data.expectedApyBps)} on ${String(data.amountEth ?? 1)} ETH.`;

  const thinking = `Mapped ${String(data.amountEth ?? 1)} ETH across the on-chain vault catalog for a ${String(data.riskTolerance ?? "moderate")} risk profile.`;

  return {
    role: "YIELD_OPT",
    intent,
    headline,
    summary,
    thinking,
    recommendation:
      String(data.recommendation) ||
      (allocation.length
        ? `Deploy using the allocation above; rebalance if APY spreads widen or risk tolerance changes.`
        : "No vault allocation was produced — review vault availability before depositing."),
    sections: [
      {
        title: "Allocation",
        lines: lines.length ? lines : ["No vault allocation produced."],
      },
      {
        title: "Risk profile",
        lines: [
          `Tolerance: ${String(data.riskTolerance ?? "moderate")}`,
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
  const headline = `Governance: ${String(data.proposalId ?? "proposal")}`;
  const summary =
    String(data.summary) ||
    (quorumReached
      ? `Recommend ${vote} (${Math.round(Number(data.supportRatio ?? 0) * 100)}% support).`
      : `Quorum not met (${String(data.supportStakeEth ?? 0)} + ${String(data.againstStakeEth ?? 0)} STT vs ${String(data.quorumEth ?? 0)} STT required).`);

  const lines = [
    `Vote: ${vote}`,
    `Quorum: ${quorumReached ? "met" : "not met"} (${String(data.participationPct ?? 0)}% participation)`,
    `Stakes: ${String(data.supportStakeEth ?? 0)} STT for · ${String(data.againstStakeEth ?? 0)} STT against`,
  ];
  if (data.llmSummary) lines.push(String(data.llmSummary));

  const thinking = quorumReached
    ? "Reviewed quorum, participation, and stake-weighted support for the proposal."
    : "Checked quorum requirements — participation is below the threshold needed for a binding outcome.";

  return {
    role: "GOVERNANCE",
    intent,
    headline,
    summary,
    thinking,
    recommendation: quorumReached
      ? `Cast ${vote} unless your mandate requires otherwise; monitor late votes that could shift the outcome.`
      : "Wait for more participation before treating the vote as decisive.",
    sections: [{ title: "Proposal analysis", lines }],
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
  const headline = `Fleet risk: ${level}`;
  const summary = String(data.summary) || String(data.recommendation) || `Composite score ${score}/100.`;

  const factorLines = Array.isArray(data.riskFactors)
    ? (data.riskFactors as Array<{ name: string; score: number }>).map((f) => `${f.name}: ${f.score}/100`)
    : [];

  const thinking = "Scored fleet health from circuit breaker status, agent reserves, and recent failure signals.";

  return {
    role: "RISK_MGMT",
    intent,
    headline,
    summary,
    thinking,
    recommendation:
      String(data.recommendation ?? "") ||
      (level === "LOW" || level === "MEDIUM"
        ? "Fleet risk is acceptable for routine task submission; keep monitoring breaker status."
        : "Reduce exposure or pause new tasks until fleet health improves."),
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
      {
        title: "Guidance",
        lines: [String(data.recommendation ?? "Review fleet status before submitting tasks.")],
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
