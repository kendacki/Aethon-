/**
 * Verifies catalog sample queries infer the correct intent, route to the right agent,
 * and produce structured report shapes.
 * Run: npx tsx scripts/verify-intent-samples.ts
 */
import { buildSkillReport } from "../src/shared/skillReport.js";
import {
  buildTaskPayload,
  buildTaskPayloadFromQuery,
  inferIntentFromQuery,
  INTENT_CATALOG,
  type TaskIntent,
} from "../src/shared/taskIntents.js";
import { validatePayloadRouting } from "../src/shared/taskRouting.js";
import type { AgentType } from "../src/shared/taskPayload.js";

const SAMPLE_INTENTS = Object.keys(INTENT_CATALOG) as TaskIntent[];

function mockDataForRole(role: AgentType): Record<string, unknown> {
  switch (role) {
    case "ORACLE":
      return { asset: "ethereum", price: 3200, stale: false, signature: "0xsig", source: "coingecko", ageSec: 5, confidence: 0.95, quality: "PRIMARY" };
    case "ARBITRAGE":
      return { asset: "ethereum", referenceUsd: 3200, spreadBps: 22, minSpreadBps: 15, profitable: true, recommendation: "Execute A→B", bestBuyVenue: "A", bestSellVenue: "B", confidence: 0.8 };
    case "YIELD_OPT":
      return { amountEth: 2, riskTolerance: "moderate", allocation: [{ vaultId: "somnia-stt-vault", pct: 65, apyBps: 620 }], expectedApyBps: 620, recommendation: "Route 2 ETH" };
    case "GOVERNANCE":
      return { proposalId: "AIP-12", recommendedVote: "FOR", quorumReached: true, supportRatio: 0.79, participationPct: 190, supportStakeEth: 15, againstStakeEth: 4, quorumEth: 10 };
    case "RISK_MGMT":
      return { compositeScore: 88, riskLevel: "LOW", circuitPaused: false, activeAgents: 5, minHealthyAgents: 3, consecutiveFailures: 0, recommendation: "Proceed", riskFactors: [{ name: "circuit_breaker", score: 100 }] };
  }
}

let failed = 0;

for (const intent of SAMPLE_INTENTS) {
  const entry = INTENT_CATALOG[intent];

  const inferred = inferIntentFromQuery(entry.exampleQuery);
  if (inferred !== intent) {
    console.error(`[FAIL] ${intent}: example query inferred as ${inferred}`);
    failed++;
    continue;
  }

  const payload = buildTaskPayloadFromQuery(entry.exampleQuery);
  if (!payload.userQuery || payload.intent !== intent) {
    console.error(`[FAIL] ${intent}: payload intent mismatch`);
    failed++;
    continue;
  }

  const routingErrors = validatePayloadRouting(payload);
  if (routingErrors.length) {
    console.error(`[FAIL] ${intent}: ${routingErrors.join("; ")}`);
    failed++;
    continue;
  }

  if (entry.defaultMode !== "swarm" && payload.primaryRole !== entry.primaryRole) {
    console.error(`[FAIL] ${intent}: primaryRole ${payload.primaryRole} !== ${entry.primaryRole}`);
    failed++;
    continue;
  }

  if (payload.successCriteria?.length !== entry.successCriteria.length) {
    console.error(`[FAIL] ${intent}: successCriteria missing`);
    failed++;
    continue;
  }

  const roles: AgentType[] =
    entry.defaultMode === "swarm"
      ? ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"]
      : [entry.primaryRole];

  for (const role of roles) {
    const report = buildSkillReport(role, intent, mockDataForRole(role));
    if (!report.headline || !report.summary || !report.thinking || !report.recommendation || !Array.isArray(report.sections)) {
      console.error(`[FAIL] ${intent}/${role}: invalid report shape`);
      failed++;
      continue;
    }
  }

  console.log(`[OK] ${intent} → ${roles.join(", ")}`);
}

const crossChecks: Array<{ query: string; intent: TaskIntent; role: AgentType; action: string }> = [
  {
    query: "Scan Ethereum for DEX arbitrage above 15 bps with 1 ETH notional.",
    intent: "ARBITRAGE_SCAN",
    role: "ARBITRAGE",
    action: "check_spread",
  },
  {
    query: "What is the current ETH price in USD?",
    intent: "MARKET_PRICE",
    role: "ORACLE",
    action: "fetch_price",
  },
  {
    query: "Allocate 2 ETH across Somnia vaults with moderate risk tolerance.",
    intent: "YIELD_STRATEGY",
    role: "YIELD_OPT",
    action: "optimize_yield",
  },
  {
    query: "Analyze AIP-12: 15 STT for, 4 STT against, quorum 10 STT.",
    intent: "GOVERNANCE_ANALYSIS",
    role: "GOVERNANCE",
    action: "analyze_proposal",
  },
  {
    query: "Is the Aethon agent fleet healthy enough to run production tasks?",
    intent: "RISK_CHECK",
    role: "RISK_MGMT",
    action: "assess_protocol_risk",
  },
  {
    query: "What is ETH price right now, and is the fleet healthy enough to trade?",
    intent: "PORTFOLIO_BRIEFING",
    role: "ARBITRAGE",
    action: "swarm_execute",
  },
];

for (const check of crossChecks) {
  const inferred = inferIntentFromQuery(check.query);
  const payload = buildTaskPayload({
    userQuery: check.query,
    intent: inferred,
    mode: INTENT_CATALOG[inferred].defaultMode,
  });

  if (inferred !== check.intent) {
    console.error(`[FAIL] cross-check inferred ${check.intent} as ${inferred}: ${check.query}`);
    failed++;
    continue;
  }
  if (payload.primaryRole !== check.role || payload.action !== check.action) {
    console.error(
      `[FAIL] cross-check ${check.intent}: routed to ${payload.primaryRole}/${payload.action}, expected ${check.role}/${check.action}`,
    );
    failed++;
    continue;
  }
  const routingErrors = validatePayloadRouting(payload);
  if (routingErrors.length) {
    console.error(`[FAIL] cross-check ${check.intent}: ${routingErrors.join("; ")}`);
    failed++;
    continue;
  }
  console.log(`[OK] cross-check ${check.intent}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll intents infer correctly and route to the right agent.");
