import type { TaskPayload } from "./taskPayload.js";
import type { TaskIntent } from "./taskIntents.js";
import { fmtUsd, fmtPctFromBps, formatProjectLabel, formatVenueLabel, proseClean, spreadPct, titleCaseAsset } from "./skillReport.js";

export type PortfolioBriefingSection = {
  role: string;
  title: string;
  summary: string;
  action: string;
  bullets: string[];
};

export type PortfolioBriefing = {
  headline: string;
  atGlance: string;
  sections: PortfolioBriefingSection[];
  nextSteps: string[];
};

type SkillRow = {
  agentType: string;
  result: {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
};

const ROLE_ORDER = ["ORACLE", "ARBITRAGE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"] as const;

const ROLE_TITLES: Record<string, string> = {
  ORACLE: "Live price",
  ARBITRAGE: "Arbitrage spreads",
  YIELD_OPT: "Yield options",
  GOVERNANCE: "Governance",
  RISK_MGMT: "Fleet risk",
};

function reportOf(data: Record<string, unknown>) {
  return data.report as
    | { summary?: string; recommendation?: string; headline?: string }
    | undefined;
}

function sectionBullets(role: string, data: Record<string, unknown>): string[] {
  switch (role) {
    case "ORACLE": {
      const price = Number(data.price);
      if (!Number.isFinite(price)) return [];
      const asset = titleCaseAsset(String(data.asset ?? "ethereum"));
      return [proseClean(`${asset} spot: ${fmtUsd(price)} USD`), proseClean(`Updated: ${String(data.stale) === "true" ? "stale quote" : "fresh"}`)];
    }
    case "ARBITRAGE": {
      const spreadBps = Number(data.spreadBps);
      const lines: string[] = [];
      if (Number.isFinite(spreadBps)) lines.push(proseClean(`Spread: ${spreadPct(spreadBps)}`));
      const buy = formatVenueLabel(String(data.bestBuyVenue ?? ""));
      const sell = formatVenueLabel(String(data.bestSellVenue ?? ""));
      if (buy !== "Unknown venue") lines.push(proseClean(`Buy on ${buy}, sell on ${sell}`));
      if (data.profitable) lines.push(proseClean("Net positive after estimated gas"));
      else lines.push(proseClean("Not above your minimum after gas"));
      return lines;
    }
    case "YIELD_OPT": {
      const allocation = Array.isArray(data.allocation)
        ? (data.allocation as Array<{ pct: number; apyBps: number; chain?: string; project?: string; vaultId?: string }>)
        : [];
      return allocation.map((a) => {
        const label =
          a.project && a.chain
            ? `${formatProjectLabel(a.project)} on ${titleCaseAsset(a.chain)}`
            : formatProjectLabel(String(a.vaultId ?? "pool"));
        return proseClean(`${a.pct}% ${label} (${fmtPctFromBps(a.apyBps)} APY)`);
      });
    }
    case "GOVERNANCE": {
      const vote = String(data.recommendedVote ?? "ABSTAIN");
      const proposalId = String(data.proposalId ?? "proposal");
      const supportPct = Math.round(Number(data.supportRatio ?? 0) * 100);
      return [
        proseClean(`${proposalId}: ${data.quorumReached ? "quorum met" : "quorum not met"}`),
        proseClean(`Support: ${supportPct}% of cast stake`),
        proseClean(`Suggested vote: ${vote}`),
      ];
    }
    case "RISK_MGMT": {
      const level = String(data.riskLevel ?? "UNKNOWN");
      const score = Number(data.compositeScore);
      const health =
        level === "LOW" ? "Healthy" : level === "MEDIUM" ? "Cautious" : level === "HIGH" ? "Critical" : "Unknown";
      return [
        proseClean(`Status: ${health}${Number.isFinite(score) ? ` (${score}/100)` : ""}`),
        proseClean(`Agents online: ${data.activeAgents ?? "?"} of ${data.minHealthyAgents ?? 3} recommended`),
        proseClean(`Execution: ${data.circuitPaused ? "paused" : "available"}`),
      ];
    }
    default:
      return [];
  }
}

function atGlanceChip(parts: string[]): string {
  return parts.filter(Boolean).join(" · ");
}

function buildAtGlance(rows: Map<string, Record<string, unknown>>): string {
  const oracle = rows.get("ORACLE") ?? {};
  const arb = rows.get("ARBITRAGE") ?? {};
  const yieldR = rows.get("YIELD_OPT") ?? {};
  const gov = rows.get("GOVERNANCE") ?? {};
  const risk = rows.get("RISK_MGMT") ?? {};

  const chips: string[] = [];

  const price = Number(oracle.price);
  if (Number.isFinite(price)) chips.push(`ETH ${fmtUsd(price)}`);

  const spreadBps = Number(arb.spreadBps);
  if (Number.isFinite(spreadBps)) {
    chips.push(arb.profitable ? `${spreadPct(spreadBps)} arb (actionable)` : `${spreadPct(spreadBps)} arb (pass)`);
  }

  const apyBps = Number(yieldR.expectedApyBps);
  if (Number.isFinite(apyBps)) chips.push(`${fmtPctFromBps(apyBps)} yield`);

  const vote = gov.recommendedVote;
  if (vote) chips.push(`${gov.proposalId ?? "Proposal"}: vote ${vote}`);

  const riskLevel = String(risk.riskLevel ?? "");
  if (riskLevel === "LOW") chips.push("Fleet healthy");
  else if (riskLevel === "MEDIUM") chips.push("Fleet cautious");
  else if (riskLevel === "HIGH") chips.push("Fleet critical");

  return atGlanceChip(chips);
}

function buildNextSteps(rows: Map<string, Record<string, unknown>>): string[] {
  const steps: string[] = [];
  const arb = rows.get("ARBITRAGE") ?? {};
  const yieldR = rows.get("YIELD_OPT") ?? {};
  const gov = rows.get("GOVERNANCE") ?? {};
  const risk = rows.get("RISK_MGMT") ?? {};
  const oracle = rows.get("ORACLE") ?? {};

  if (String(risk.riskLevel) === "HIGH" || risk.circuitPaused) {
    steps.push("Hold automated trades until fleet risk clears and the circuit breaker reopens.");
  }

  if (arb.profitable) {
    const buy = formatVenueLabel(String(arb.bestBuyVenue ?? ""));
    const sell = formatVenueLabel(String(arb.bestSellVenue ?? ""));
    steps.push(`If trading: buy on ${buy} and sell on ${sell}. Re-scan immediately before execution.`);
  }

  const allocation = Array.isArray(yieldR.allocation) ? yieldR.allocation : [];
  if (allocation.length) {
    const amount = yieldR.amountEth ?? 1;
    const targets = allocation
      .map((a: { pct: number; project?: string; chain?: string }) =>
        `${a.pct}% ${formatProjectLabel(String(a.project ?? "pool"))} (${titleCaseAsset(String(a.chain ?? "Ethereum"))})`,
      )
      .join(", ");
    steps.push(`For yield: deploy ${amount} ETH as ${targets}. Confirm contracts on chain before depositing.`);
  }

  if (gov.quorumReached && gov.recommendedVote) {
    steps.push(`For governance: lean ${gov.recommendedVote} on ${gov.proposalId ?? "the proposal"} unless your delegate policy differs.`);
  } else if (gov.proposalId) {
    steps.push(`For governance: quorum is not met on ${gov.proposalId}. Wait for more participation before deciding.`);
  }

  if (oracle.stale || String(oracle.source) === "fallback_table") {
    steps.push("Refresh the live ETH price before sizing trades or deposits.");
  } else if (Number.isFinite(Number(oracle.price))) {
    steps.push("Use the quoted ETH price for planning and refresh right before any on-chain action.");
  }

  if (String(risk.riskLevel) === "MEDIUM" && steps.length < 4) {
    steps.push("Keep new task size small until the fleet risk score improves.");
  }

  return [...new Set(steps.map((s) => proseClean(s)))].slice(0, 5);
}

export function buildPortfolioBriefing(
  skillResults: SkillRow[],
  payload: TaskPayload | null,
): PortfolioBriefing | null {
  const intent = (payload?.intent ?? payload?.params?.intent) as TaskIntent | undefined;
  if (intent !== "PORTFOLIO_BRIEFING" || skillResults.length === 0) return null;

  const byRole = new Map<string, Record<string, unknown>>();
  for (const row of skillResults) {
    if (row.result.data) byRole.set(row.agentType, row.result.data);
  }

  const sections: PortfolioBriefingSection[] = [];

  for (const role of ROLE_ORDER) {
    const row = skillResults.find((r) => r.agentType === role);
    const data = row?.result.data;
    const report = data ? reportOf(data) : undefined;
    const failed = row?.result.success === false;

    sections.push({
      role,
      title: ROLE_TITLES[role] ?? role,
      summary: failed
        ? proseClean(row?.result.error ?? "This specialist could not complete its check.")
        : proseClean(String(report?.summary ?? data?.summary ?? "No data returned.")),
      action: failed
        ? proseClean("Retry the briefing or ask this specialist individually.")
        : proseClean(String(report?.recommendation ?? data?.recommendation ?? "")),
      bullets: failed || !data ? [] : sectionBullets(role, data),
    });
  }

  const asset = titleCaseAsset(String(payload?.params?.asset ?? "ethereum"));
  const headline = proseClean(`${asset} portfolio briefing`);

  return {
    headline,
    atGlance: buildAtGlance(byRole),
    sections,
    nextSteps: buildNextSteps(byRole),
  };
}
