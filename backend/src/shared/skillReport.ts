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

export function fmtUsd(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "not available";
}

export function fmtPctFromBps(bps: unknown): string {
  const v = Number(bps);
  return Number.isFinite(v) ? `${(v / 100).toFixed(2)}%` : "not available";
}

function fmtNum(n: unknown, suffix = ""): string {
  const v = Number(n);
  return Number.isFinite(v) ? `${v}${suffix}` : "not available";
}

export function titleCaseAsset(asset: string): string {
  const lower = asset.toLowerCase();
  if (lower === "ethereum" || lower === "eth") return "Ethereum";
  if (lower === "bitcoin" || lower === "btc") return "Bitcoin";
  if (lower === "solana" || lower === "sol") return "Solana";
  return asset.charAt(0).toUpperCase() + asset.slice(1).toLowerCase();
}

function assetTicker(asset: string): string | null {
  const map: Record<string, string> = {
    ethereum: "ETH",
    bitcoin: "BTC",
    solana: "SOL",
    somnia: "STT",
  };
  return map[asset.toLowerCase()] ?? null;
}

function humanAgeSec(ageSec: unknown): string {
  const sec = Number(ageSec);
  if (!Number.isFinite(sec) || sec <= 5) return "just now";
  if (sec < 60) return `${Math.round(sec)} seconds ago`;
  const mins = Math.round(sec / 60);
  return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
}

function userDataSource(source: string): string {
  const map: Record<string, string> = {
    coingecko: "CoinGecko live market data",
    somnia_json_api: "Somnia on-chain oracle",
    fallback_table: "reference pricing while live feeds recover",
    defillama: "DefiLlama yield data",
    coingecko_tickers: "CoinGecko exchange prices",
    dexscreener: "DexScreener on-chain pairs",
  };
  return map[source] ?? "live market data";
}

export function spreadPct(spreadBps: number): string {
  return `${(spreadBps / 100).toFixed(2)}%`;
}

function isPortfolioBriefing(intent: TaskIntent | string): boolean {
  return intent === "PORTFOLIO_BRIEFING";
}

/** Turn internal venue ids (cex_binance) into readable exchange names. */
export function formatVenueLabel(id: string): string {
  if (!id) return "Unknown venue";
  const cex = id.match(/^cex_(.+)$/i);
  if (cex) {
    const name = cex[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (id.startsWith("dex_")) return "On-chain DEX pool";
  return id.replace(/_/g, " ");
}

/** Turn defillama project slugs into readable protocol names. */
export function formatProjectLabel(project: string): string {
  if (!project) return "Pool";
  return project
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskHealthLabel(level: string): string {
  switch (level) {
    case "LOW":
      return "healthy";
    case "MEDIUM":
      return "cautious";
    case "HIGH":
      return "critical";
    default:
      return "unknown";
  }
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
        thinking: proseClean("Checking the latest data for your question."),
        recommendation: proseClean(String(data.recommendation ?? "")),
        sections: [],
        metrics: {},
      };
  }
}

function buildOracleReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const assetRaw = String(data.asset ?? "ethereum");
  const asset = titleCaseAsset(assetRaw);
  const ticker = assetTicker(assetRaw);
  const price = Number(data.price);
  const stale = Boolean(data.stale);
  const sourceKey = String(data.source ?? "coingecko");
  const source = userDataSource(sourceKey);
  const ageLabel = humanAgeSec(data.ageSec);
  const usingFallback = sourceKey === "fallback_table";

  const assetLabel = ticker ? `${asset} (${ticker})` : asset;

  const summary = !Number.isFinite(price)
    ? proseClean(
        `We could not retrieve a reliable price for ${assetLabel}. Try naming the asset clearly, for example "ETH" or "Ethereum", and submit again in a moment if market feeds were busy.`,
      )
    : stale
      ? proseClean(
          `${assetLabel} was last seen near ${fmtUsd(price)} about ${ageLabel}. That quote is older than we accept for live trading, so treat it as a rough reference only. Ask again for a fresh price before you act.`,
        )
      : usingFallback
        ? proseClean(
            `${assetLabel} is about ${fmtUsd(price)} USD. Live market feeds were temporarily unavailable, so this figure comes from Aethon's built-in reference prices. It is useful for planning and conversation, but refresh before you trade or rebalance.`,
          )
        : proseClean(
            `${assetLabel} is trading at ${fmtUsd(price)} USD based on ${source}. The quote was updated ${ageLabel} and reflects current spot activity across major markets.`,
          );

  const thinking = proseClean("Pulling the latest spot price and checking that it looks reasonable.");

  const recommendation = !Number.isFinite(price)
    ? proseClean(`Retry with a well-known asset such as Ethereum or Bitcoin.`)
    : stale
      ? proseClean("Request an updated price before placing a trade. Stale quotes can misstate slippage during fast markets.")
      : usingFallback
        ? proseClean(
            "Use this as a ballpark figure for now. Submit the same question again in a minute if you need a live exchange-grade quote.",
          )
        : proseClean(
            "You can use this price for portfolio marks and pre-trade checks. Refresh right before execution if the market has been volatile.",
          );

  const snapshotLines = Number.isFinite(price)
    ? [
        proseClean(`Price: ${fmtUsd(price)} USD`),
        proseClean(`Updated: ${ageLabel}`),
        proseClean(`Source: ${source}`),
        ...(usingFallback
          ? [proseClean("Note: live feeds were unavailable when this answer was prepared.")]
          : stale
            ? [proseClean("Note: this quote is no longer considered fresh.")]
            : []),
      ]
    : [proseClean("No price could be loaded.")];

  return {
    role: "ORACLE",
    intent,
    headline: `${asset} price`,
    summary,
    thinking,
    recommendation,
    sections: isPortfolioBriefing(intent) ? [] : [{ title: "Market snapshot", lines: snapshotLines }],
    metrics: {
      price,
      stale,
      confidence: Number(data.confidence ?? 0),
      quality: String(data.quality ?? ""),
    },
  };
}

function buildArbitrageReport(intent: TaskIntent | string, data: Record<string, unknown>): SkillReport {
  const spreadBps = Number(data.spreadBps);
  const profitable = Boolean(data.profitable);
  const asset = titleCaseAsset(String(data.asset ?? "asset"));
  const venueCount = Number(data.venueCount ?? (Array.isArray(data.venues) ? data.venues.length : 0));
  const minSpreadBps = Number(data.minSpreadBps ?? 15);
  const notional = fmtNum(data.notionalEth ?? 1);
  const refSource = userDataSource(String(data.priceSource ?? "coingecko"));
  const spreadLabel = Number.isFinite(spreadBps) ? spreadPct(spreadBps) : "unknown";

  const summary = profitable
    ? proseClean(
        `${asset} shows a ${spreadLabel} price gap across ${venueCount || "several"} live venues after comparing ${refSource}. At ${notional} ETH notional, estimated profit still looks positive after swap gas. Spreads can close within seconds, so verify liquidity before you execute.`,
      )
    : proseClean(
        `${asset} does not currently offer enough edge to trade. The gap is ${spreadLabel}, below your ${spreadPct(minSpreadBps)} minimum once gas is included at ${notional} ETH notional. Waiting for wider dislocation is usually safer than forcing a marginal trade.`,
      );

  const thinking = proseClean(
    "Comparing reference prices with exchange and on-chain venues, then estimating whether gas would erase the edge.",
  );

  const recommendation = profitable
    ? proseClean(
        "If you proceed, buy on the cheaper venue and sell on the richer one shown below. Re-run the scan after any failed transaction because prices move quickly.",
      )
    : proseClean("No trade is recommended right now. Monitor the pair or wait for volatility to widen the gap.");

  const buyVenue = formatVenueLabel(String(data.bestBuyVenue ?? ""));
  const sellVenue = formatVenueLabel(String(data.bestSellVenue ?? ""));
  const gasEth =
    data.gasEstimateWei != null
      ? `${(Number(data.gasEstimateWei) / 1e18).toFixed(6)} ETH`
      : "not available";

  return {
    role: "ARBITRAGE",
    intent,
    headline: profitable ? "Arbitrage opportunity" : "No actionable arbitrage",
    summary,
    thinking,
    recommendation,
    sections: isPortfolioBriefing(intent)
      ? []
      : [
          {
            title: "Spread breakdown",
            lines: [
              proseClean(`Reference price: ${fmtUsd(data.referenceUsd)} (${refSource})`),
              proseClean(`Observed gap: ${spreadLabel} (your minimum ${spreadPct(minSpreadBps)})`),
              proseClean(`Cheapest venue: ${buyVenue}`),
              proseClean(`Richest venue: ${sellVenue}`),
              proseClean(`Modeled size: ${notional} ETH`),
              proseClean(`Estimated gas: ${gasEth}`),
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
    const label =
      a.project && a.chain
        ? `${formatProjectLabel(a.project)} on ${titleCaseAsset(a.chain)}`
        : formatProjectLabel(String(a.vaultId ?? "pool"));
    return proseClean(`${a.pct}% to ${label} at ${fmtPctFromBps(a.apyBps)} APY`);
  });

  const summary = allocation.length
    ? proseClean(
        `For ${amountEth} ETH with ${tolerance} risk tolerance, the yield agent screened ${poolsAnalyzed} live pools and suggests ${allocation.length > 1 ? "splitting across" : "using"} ${allocation.length} venue${allocation.length > 1 ? "s" : ""}. Blended expected APY is ${blendedApy}, roughly ${dailyYield} ETH per day before fees and compounding. Yields move with utilization, so review weekly.`,
      )
    : proseClean(
        `No live pool matched ${tolerance} risk tolerance for ${amountEth} ETH after screening current DeFi yield data. Try relaxing risk settings, reducing size, or choosing a different asset.`,
      );

  const thinking = proseClean(
    "Ranking live yield pools by risk-adjusted return and building an allocation that matches your tolerance.",
  );

  const recommendation = allocation.length
    ? proseClean(
        "Before depositing, confirm pool contracts on the stated chain and check audit status. Rebalance if APY drifts more than one percentage point from this plan.",
      )
    : proseClean("Adjust risk tolerance or amount and submit again.");

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
    headline: "Yield allocation",
    summary,
    thinking,
    recommendation,
    sections: isPortfolioBriefing(intent)
      ? []
      : [
          {
            title: "Recommended split",
            lines: allocationLines.length ? allocationLines : [proseClean("No allocation was produced.")],
          },
          ...(altLines.length ? [{ title: "Other pools considered", lines: altLines }] : []),
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

  const llmSummary =
    !isPortfolioBriefing(intent) && typeof data.llmSummary === "string"
      ? proseClean(data.llmSummary.trim())
      : "";
  const summary =
    llmSummary ||
    (quorumReached
      ? proseClean(
          `${proposalId} has reached quorum with ${participation}% of eligible stake participating. Support currently represents ${supportPct}% of votes cast against a ${passThreshold}% pass threshold. On stake weight alone, a ${vote} vote is the suggested direction. Align with your delegate policy before casting on chain.`,
        )
      : proseClean(
          `${proposalId} has not reached quorum yet. ${supportStake} STT is for and ${againstStake} STT against, below the ${quorumStake} STT quorum requirement. Outcomes remain uncertain until more stakeholders vote.`,
        ));

  const thinking = proseClean("Reviewing quorum, participation, and how stake is split between for and against.");

  const recommendation = quorumReached
    ? proseClean(
        `If you agree with the stake-weighted outcome, prepare to vote ${vote}. If your policy requires broader turnout, wait until participation improves.`,
      )
    : proseClean(
        "Encourage stakeholders to vote so quorum can be reached. Interim ratios are not final until the window closes.",
      );

  return {
    role: "GOVERNANCE",
    intent,
    headline: `Governance: ${proposalId}`,
    summary,
    thinking,
    recommendation,
    sections: isPortfolioBriefing(intent)
      ? []
      : [
          {
            title: "Vote snapshot",
            lines: [
              proseClean(`Suggested vote: ${vote}`),
              proseClean(`Quorum: ${quorumReached ? "reached" : "not reached"} (${participation}% participation)`),
              proseClean(`For: ${supportStake} STT, against: ${againstStake} STT`),
              proseClean(`Quorum needed: ${quorumStake} STT`),
              proseClean(`Support share: ${supportPct}% (pass threshold ${passThreshold}%)`),
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
  const health = riskHealthLabel(level);
  const activeAgents = fmtNum(data.activeAgents);
  const minHealthy = fmtNum(data.minHealthyAgents ?? 3);
  const failures = fmtNum(data.consecutiveFailures);
  const circuit = Boolean(data.circuitPaused);

  const summary = proseClean(
    `Fleet status is ${health}${Number.isFinite(score) ? ` (${score} out of 100)` : ""}. ${activeAgents} agents are online versus ${minHealthy} recommended for comfortable load. Automated execution is ${circuit ? "paused by the circuit breaker" : "available"}. Recent consecutive failures: ${failures}.`,
  );

  const thinking = proseClean(
    "Combining circuit breaker state, agent liveness, gas reserves, and API reachability into one operational risk view.",
  );

  const recommendation =
    level === "HIGH"
      ? proseClean(
          "Pause new trading or yield tasks until agents recover and the circuit breaker clears. Start with a small price check to verify connectivity.",
        )
      : level === "MEDIUM"
        ? proseClean("You may continue with small test tasks. Avoid large swarm briefings until the score rises above 70.")
        : proseClean("Conditions support normal task submission. Keep monitoring during busy periods.");

  return {
    role: "RISK_MGMT",
    intent,
    headline: `Fleet risk: ${health.charAt(0).toUpperCase()}${health.slice(1)}`,
    summary,
    thinking,
    recommendation,
    sections: isPortfolioBriefing(intent)
      ? []
      : [
          {
            title: "Health signals",
            lines: [
              proseClean(`Execution gate: ${circuit ? "paused" : "open"}`),
              proseClean(`Agents online: ${activeAgents} (recommended minimum ${minHealthy})`),
              proseClean(`Consecutive failures: ${failures}`),
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
