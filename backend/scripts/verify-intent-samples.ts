/**
 * Verifies catalog sample queries produce well-formed payloads and structured report shapes.
 * Run: npx tsx scripts/verify-intent-samples.ts
 */
import { SKILL_MANIFESTS } from "../src/agent/manifests/data.js";
import { buildSkillReport } from "../src/shared/skillReport.js";
import { buildTaskPayload, INTENT_CATALOG, type TaskIntent } from "../src/shared/taskIntents.js";
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
  const payload = buildTaskPayload({
    userQuery: entry.exampleQuery,
    intent,
    mode: entry.defaultMode,
  });

  if (!payload.userQuery || payload.intent !== intent) {
    console.error(`[FAIL] ${intent}: payload intent mismatch`);
    failed++;
    continue;
  }

  const manifest = SKILL_MANIFESTS[payload.primaryRole];
  if (!manifest?.actions.includes(payload.action)) {
    console.error(
      `[FAIL] ${intent}: action "${payload.action}" not allowed for ${payload.primaryRole}`,
    );
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

  console.log(`[OK] ${intent} — ${roles.join(", ")}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log("\nAll sample intents produce valid payloads and structured reports.");
