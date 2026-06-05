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

/** Normalize copy for user facing output: no em dashes, arrows, or bullet separators. */
export function proseClean(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ". ")
    .replace(/→/g, " to ")
    .replace(/·/g, ", ")
    .replace(/\s+-\s+(?=[A-Z])/g, ". ")
    .replace(/\bHALT\s*[—–-]\s*/gi, "Stop. ")
    .replace(/\bCAUTION\s*[—–-]\s*/gi, "Caution. ")
    .replace(/\s+/g, " ")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/\.\s+\./g, ".")
    .trim();
}

function fmtUsd(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "not available";
}

function fmtPctFromBps(bps: unknown): string {
  const v = Number(bps);
  return Number.isFinite(v) ? `${(v / 100).toFixed(2)}%` : "not available";
}

function fmtNum(n: unknown, suffix = ""): string {
  const v = Number(n);
  return Number.isFinite(v) ? `${v}${suffix}` : "not available";
}

function titleCaseAsset(asset: string): string {
  const lower = asset.toLowerCase();
  if (lower === "ethereum" || lower === "eth") return "Ethereum";
  if (lower === "bitcoin" || lower === "btc") return "Bitcoin";
  return asset.charAt(0).toUpperCase() + asset.slice(1).toLowerCase();
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    coingecko: "CoinGecko",
    somnia_json_api: "Somnia consensus oracle",
    fallback_table: "bounded fallback reference",
    defillama: "DefiLlama",
    coingecko_tickers: "CoinGecko exchange tickers",
    dexscreener: "DexScreener",
  };
  return map[source] ?? source.replace(/_/g, " ");
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
        summary: proseClean(String(data.summary ?? "Your request has been processed.")),
        thinking: proseClean("Reviewing your request against the latest available data."),
        recommendation: proseClean(String(data.recommendation ?? "")),
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
  const source = sourceLabel(String(data.source ?? "market data"));
  const confPct = Number.isFinite(confidence) ? Math.round(confidence * 100) : null;
  const ageSec = fmtNum(data.ageSec);
  const maxStale = fmtNum(data.maxStalenessSec ?? 120);

  const summary = Number.isFinite(price)
    ? stale
      ? proseClean(
          `${asset} last traded at ${fmtUsd(price)} according to ${source}. The quote is ${ageSec} seconds old, which exceeds the ${maxStale} second freshness limit agents use before signing an attestation. Treat this figure as indicative only until a fresh quote arrives.`,
        )
      : proseClean(
          `${asset} is trading at ${fmtUsd(price)} based on ${source}${confPct != null ? ` with ${confPct}% confidence` : ""}. The quote is ${ageSec} seconds old and remains within the ${maxStale} second freshness window. This price can be used for planning, sizing, and risk checks before you execute on chain.`,
        )
    : proseClean(
        `We could not retrieve a reliable spot price for ${asset}. This usually means the market feed timed out or the asset identifier was not recognized. Try naming the asset explicitly, for example ETH or Ethereum.`,
      );

  const thinking = proseClean(
    "I requested the latest spot price from live market feeds, validated it against sanity bounds, and checked whether the quote is fresh enough to sign an on chain attestation.",
  );

  const recommendation = stale
    ? proseClean(
        "Wait for a fresh quote before trading or rebalancing. Stale prices can misstate slippage and profit and loss during volatile periods.",
      )
    : Number.isFinite(price)
      ? proseClean(
          "You can use this price for portfolio marks and pre trade checks. Refresh immediately before submitting a transaction if the market has moved quickly.",
        )
      : proseClean("Retry with a well known asset name such as Ethereum or Bitcoin, or submit again in a minute if feeds were rate limited.");

  return {
    role: "ORACLE",
    intent,
    headline: `${asset} market price`,
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Price attestation",
        lines: [
          proseClean(`Spot price: ${fmtUsd(price)} USD`),
          proseClean(`Data source: ${source}`),
          proseClean(`Quote age: ${ageSec} seconds (freshness limit ${maxStale} seconds)`),
          proseClean(`Quality tier: ${String(data.quality ?? "standard")}`),
          proseClean(`Wallet attestation: ${data.signature ? "signed by the oracle agent" : "unsigned"}`),
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
  const venueCount = Number(data.venueCount ?? (Array.isArray(data.venues) ? data.venues.length : 0));
  const minSpread = fmtNum(data.minSpreadBps ?? 15);
  const notional = fmtNum(data.notionalEth ?? 1);
  const refSource = sourceLabel(String(data.priceSource ?? "reference feed"));
  const gasSource = String(data.gasSource ?? "network estimate").replace(/_/g, " ");

  const summary = profitable
    ? proseClean(
        `${asset} shows a ${Number.isFinite(spreadBps) ? spreadBps : "unknown"} basis point spread across ${venueCount || "multiple"} live venues compared with ${refSource}. After estimating swap gas from ${gasSource}, the opportunity appears net positive at ${notional} ETH notional. Spreads can close quickly, so confirm liquidity and fees immediately before execution.`,
      )
    : proseClean(
        `${asset} does not currently offer a spread above your ${minSpread} basis point threshold after gas at ${notional} ETH notional. We compared ${venueCount || "available"} live venues against ${refSource}. Waiting for volatility or a wider dislocation is usually safer than forcing a marginal trade.`,
      );

  const thinking = proseClean(
    "I compared the reference spot price with live exchange tickers, on chain pool prices when configured, and DexScreener pairs, then subtracted estimated swap gas from gross edge.",
  );

  const recommendation = profitable
    ? proseClean(
        "If you execute, route through the cheapest buy venue and the highest sell venue listed below. Re run the scan after any failed transaction because mempool gas and venue prices change within seconds.",
      )
    : proseClean(
        "No trade is recommended right now. Monitor the pair or lower your minimum spread only if you accept higher execution risk.",
      );

  const buyVenue = String(data.bestBuyVenue ?? "not available");
  const sellVenue = String(data.bestSellVenue ?? "not available");

  return {
    role: "ARBITRAGE",
    intent,
    headline: profitable ? "Arbitrage opportunity detected" : "No actionable arbitrage",
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Spread analysis",
        lines: [
          proseClean(`Reference price: ${fmtUsd(data.referenceUsd)} from ${refSource}`),
          proseClean(`Observed spread: ${Number.isFinite(spreadBps) ? `${spreadBps} basis points` : "not available"} (your minimum ${minSpread} basis points)`),
          proseClean(`Best buy venue: ${buyVenue}`),
          proseClean(`Best sell venue: ${sellVenue}`),
          proseClean(`Trade size modeled: ${notional} ETH`),
          proseClean(`Estimated gas cost: ${data.gasEstimateWei ? `${data.gasEstimateWei} wei` : "not available"} (${gasSource})`),
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
  const allocation = Array.isArray(data.allocation)
    ? (data.allocation as Array<{ vaultId: string; pct: number; apyBps: number; chain?: string; project?: string }>)
    : [];
  const amountEth = String(data.amountEth ?? 1);
  const tolerance = String(data.riskTolerance ?? "moderate");
  const poolsAnalyzed = fmtNum(data.poolsAnalyzed);
  const blendedApy = fmtPctFromBps(data.expectedApyBps);
  const dailyYield = fmtNum(data.expectedDailyYieldEth);

  const allocationLines = allocation.map((a) => {
    const label = a.project && a.chain ? `${a.project} on ${a.chain}` : a.vaultId;
    return proseClean(`Allocate ${a.pct}% to ${label} at ${fmtPctFromBps(a.apyBps)} APY`);
  });

  const summary = allocation.length
    ? proseClean(
        `For ${amountEth} ETH with ${tolerance} risk tolerance, the yield agent screened ${poolsAnalyzed} live DefiLlama pools and recommends ${allocation.length > 1 ? "a diversified split" : "a single venue"}. Blended expected APY is ${blendedApy}, implying roughly ${dailyYield} ETH per day before compounding and protocol fees. Positions should be reviewed weekly because APY and liquidity shift with market utilization.`,
      )
    : proseClean(
        `No live pool matched ${tolerance} risk tolerance for ${amountEth} ETH after screening DefiLlama data. Consider relaxing risk settings, reducing size, or choosing a different base asset.`,
      );

  const thinking = proseClean(
    "I ranked live yield pools by risk adjusted APY, filtered by your tolerance, and built an allocation that balances return with diversification unless you requested concentration.",
  );

  const recommendation = allocation.length
    ? proseClean(
        "Before depositing, confirm pool contracts on the stated chain and compare protocol audit status. Rebalance if APY diverges by more than one hundred basis points from this plan.",
      )
    : proseClean(
        "Adjust risk tolerance or amount and submit again. Moderate profiles exclude high impermanent loss pools by design.",
      );

  const altLines = Array.isArray(data.alternatives)
    ? (data.alternatives as Array<{ project?: string; chain?: string; apyBps: number; tvlUsd?: number }>)
        .slice(0, 4)
        .map((a) =>
          proseClean(
            `${a.project ?? "Pool"} on ${a.chain ?? "unknown chain"}: ${fmtPctFromBps(a.apyBps)} APY, TVL ${a.tvlUsd ? `$${Math.round(a.tvlUsd).toLocaleString()}` : "not available"}`,
          ),
        )
    : [];

  return {
    role: "YIELD_OPT",
    intent,
    headline: "Yield allocation plan",
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Recommended allocation",
        lines: allocationLines.length ? allocationLines : [proseClean("No allocation was produced.")],
      },
      {
        title: "Other pools considered",
        lines: altLines.length ? altLines : [proseClean("No alternative pools met your filters.")],
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
  const participation = fmtNum(data.participationPct);
  const supportStake = fmtNum(data.supportStakeEth);
  const againstStake = fmtNum(data.againstStakeEth);
  const quorumStake = fmtNum(data.quorumEth);
  const passThreshold = Math.round(Number(data.passThreshold ?? 0.66) * 100);

  const llmSummary = typeof data.llmSummary === "string" ? proseClean(data.llmSummary.trim()) : "";
  const summary =
    llmSummary ||
    (quorumReached
      ? proseClean(
          `${proposalId} has reached quorum with ${participation}% participation. Support currently represents ${supportPct}% of cast stake against a ${passThreshold}% pass threshold. Based on stake weighting alone, a ${vote} vote is recommended. Always align with your delegate policy and any off chain discussion before casting on chain.`,
        )
      : proseClean(
          `${proposalId} has not reached quorum. Only ${supportStake} STT is for and ${againstStake} STT against, below the ${quorumStake} STT quorum requirement. Final outcomes remain uncertain until more stakeholders participate.`,
        ));

  const thinking = proseClean(
    "I calculated quorum, participation rate, and support ratio from the stake figures in your question, then compared the result to the configured pass threshold.",
  );

  const recommendation = quorumReached
    ? proseClean(
        `If you agree with the stake weighted outcome, prepare to vote ${vote}. If your governance policy requires broader participation, wait until participation exceeds fifty percent of quorum.`,
      )
    : proseClean(
        "Encourage stakeholders to vote or abstain explicitly so quorum can be reached. Avoid treating interim ratios as final until the voting window closes.",
      );

  const flags = Array.isArray(data.flags) ? (data.flags as string[]).join(", ") : "none";

  return {
    role: "GOVERNANCE",
    intent,
    headline: `Governance view on ${proposalId}`,
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Vote mechanics",
        lines: [
          proseClean(`Recommended vote: ${vote}`),
          proseClean(`Quorum status: ${quorumReached ? "met" : "not met"} (${participation}% participation)`),
          proseClean(`Stake for: ${supportStake} STT, against: ${againstStake} STT, quorum requirement: ${quorumStake} STT`),
          proseClean(`Support ratio: ${supportPct}% (pass threshold ${passThreshold}%)`),
          proseClean(`Flags: ${flags}`),
        ],
      },
    ],
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
  const levelLabel = level.charAt(0) + level.slice(1).toLowerCase();
  const activeAgents = fmtNum(data.activeAgents);
  const minHealthy = fmtNum(data.minHealthyAgents ?? 3);
  const failures = fmtNum(data.consecutiveFailures);
  const circuit = Boolean(data.circuitPaused);

  const factorLines = Array.isArray(data.riskFactors)
    ? (data.riskFactors as Array<{ name: string; score: number }>).map((f) =>
        proseClean(`${f.name.replace(/_/g, " ")} score ${f.score} out of 100`),
      )
    : [];

  const summary = proseClean(
    `Fleet health is ${levelLabel.toLowerCase()} with a composite score of ${Number.isFinite(score) ? score : "unknown"} out of 100. ${activeAgents} agents are online versus a minimum of ${minHealthy} required for comfortable production load. The circuit breaker is ${circuit ? "paused, which blocks new automated execution" : "active and allowing tasks"}. Consecutive failure count is ${failures}.`,
  );

  const thinking = proseClean(
    "I weighted circuit breaker state, fleet liveness from the stats API, agent gas reserves, and API reachability into a single operational risk score.",
  );

  const recommendation =
    level === "HIGH"
      ? proseClean(
          "Pause new trading or yield tasks until agents recover and the circuit breaker clears. Run a single oracle price check first to verify basic connectivity.",
        )
      : level === "MEDIUM"
        ? proseClean(
            "You may continue with small test tasks. Avoid large swarm briefings until the score returns above seventy.",
          )
        : proseClean(
            "Conditions support normal task submission. Keep monitoring fleet health during high traffic periods.",
          );

  return {
    role: "RISK_MGMT",
    intent,
    headline: `Fleet risk: ${levelLabel}`,
    summary,
    thinking,
    recommendation,
    sections: [
      {
        title: "Risk signals",
        lines: [
          proseClean(`Circuit breaker: ${circuit ? "paused" : "active"}`),
          proseClean(`Healthy agents online: ${activeAgents} (minimum ${minHealthy})`),
          proseClean(`Consecutive failures: ${failures}`),
          ...factorLines,
        ],
      },
    ],
    metrics: {
      compositeScore: score,
      riskLevel: level,
      proceed: Boolean(data.proceed),
      circuitPaused: circuit,
    },
  };
}
