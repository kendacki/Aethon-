import type { AgentType, TaskPayload } from "./payload";
import { ALL_AGENT_TYPES } from "./payload";
import {
  parseAssetFromQuery,
  parseEthAmountFromQuery,
  parseGovernanceStakes,
  parseMinSpreadBpsFromQuery,
  parseProposalFromQuery,
  parseRiskToleranceFromQuery,
} from "./queryParsing";

export type TaskIntent =
  | "MARKET_PRICE"
  | "ARBITRAGE_SCAN"
  | "YIELD_STRATEGY"
  | "GOVERNANCE_ANALYSIS"
  | "RISK_CHECK"
  | "PORTFOLIO_BRIEFING";

export type SuccessCriterion = {
  id: string;
  label: string;
  description: string;
};

export type IntentCatalogEntry = {
  intent: TaskIntent;
  label: string;
  description: string;
  exampleQuery: string;
  defaultMode: "single" | "swarm";
  primaryRole: AgentType;
  action: string;
  agentWork: string;
  sources: string[];
  successCriteria: SuccessCriterion[];
};

export const INTENT_CATALOG: Record<TaskIntent, IntentCatalogEntry> = {
  MARKET_PRICE: {
    intent: "MARKET_PRICE",
    label: "Market price",
    description: "Attested spot price for a crypto asset in USD.",
    exampleQuery: "What is the current ETH price in USD?",
    defaultMode: "single",
    primaryRole: "ORACLE",
    action: "fetch_price",
    agentWork: "Oracle agent fetches live price data, checks freshness, signs an attestation, and returns confidence.",
    sources: ["CoinGecko price API", "Somnia JSON oracle (when enabled)", "Deterministic fallback table"],
    successCriteria: [
      { id: "price_returned", label: "Price returned", description: "A numeric USD price is produced." },
      { id: "fresh_data", label: "Fresh data", description: "Quote age is within maxStalenessSec." },
      { id: "signed_attestation", label: "Signed attestation", description: "Agent signs the attestation digest." },
    ],
  },
  ARBITRAGE_SCAN: {
    intent: "ARBITRAGE_SCAN",
    label: "Arbitrage scan",
    description: "Cross venue spread scan with gas adjusted profit estimate.",
    exampleQuery: "Scan Ethereum for DEX arbitrage above 15 bps with 1 ETH notional.",
    defaultMode: "single",
    primaryRole: "ARBITRAGE",
    action: "check_spread",
    agentWork: "Arbitrage agent loads a reference price, simulates venue quotes, and recommends execute or hold.",
    sources: ["CoinGecko reference price", "Simulated Somnia DEX venue book"],
    successCriteria: [
      { id: "spread_computed", label: "Spread computed", description: "Best buy/sell venues and spread bps are reported." },
      { id: "recommendation", label: "Recommendation", description: "Clear execute or hold recommendation is returned." },
    ],
  },
  YIELD_STRATEGY: {
    intent: "YIELD_STRATEGY",
    label: "Yield strategy",
    description: "Vault allocation for STT or ETH based on your risk level.",
    exampleQuery: "Allocate 2 ETH across Somnia vaults with moderate risk tolerance.",
    defaultMode: "single",
    primaryRole: "YIELD_OPT",
    action: "optimize_yield",
    agentWork: "Yield agent scores vaults by risk adjusted APY and returns an allocation plan.",
    sources: ["Aethon vault registry (on-chain catalog)", "Internal APY and risk model"],
    successCriteria: [
      { id: "allocation_plan", label: "Allocation plan", description: "At least one vault allocation with expected APY." },
      { id: "risk_respected", label: "Risk respected", description: "Vaults match the stated risk tolerance." },
    ],
  },
  GOVERNANCE_ANALYSIS: {
    intent: "GOVERNANCE_ANALYSIS",
    label: "Governance analysis",
    description: "Proposal quorum, participation, and recommended vote.",
    exampleQuery: "Analyze AIP-12: 15 STT for, 4 STT against, quorum 10 STT.",
    defaultMode: "single",
    primaryRole: "GOVERNANCE",
    action: "analyze_proposal",
    agentWork: "Governance agent evaluates quorum and vote ratio. Optional Somnia LLM summary.",
    sources: ["Task payload vote parameters", "Somnia LLM inference (optional)"],
    successCriteria: [
      { id: "vote_recommendation", label: "Vote recommendation", description: "FOR, AGAINST, or ABSTAIN with rationale." },
      { id: "quorum_status", label: "Quorum status", description: "Whether quorum is met is explicitly stated." },
    ],
  },
  RISK_CHECK: {
    intent: "RISK_CHECK",
    label: "Fleet risk check",
    description: "Protocol and fleet health score from live signals.",
    exampleQuery: "Is the Aethon agent fleet healthy enough to run production tasks?",
    defaultMode: "single",
    primaryRole: "RISK_MGMT",
    action: "assess_protocol_risk",
    agentWork: "Risk agent reads circuit breaker, fleet stats API, and agent gas reserves.",
    sources: ["CircuitBreaker contract", "Aethon /v1/stats API", "Agent wallet balance on Somnia RPC"],
    successCriteria: [
      { id: "risk_score", label: "Risk score", description: "Composite risk score from 0 to 100 is returned." },
      { id: "fleet_signal", label: "Fleet signal", description: "Active agent count and circuit state are reported." },
    ],
  },
  PORTFOLIO_BRIEFING: {
    intent: "PORTFOLIO_BRIEFING",
    label: "Full portfolio briefing",
    description: "All five specialists answer your question in one swarm run.",
    exampleQuery:
      "Brief me on ETH: live price, arbitrage spreads, yield options for 1 ETH, governance on AIP 1, and fleet risk.",
    defaultMode: "swarm",
    primaryRole: "ARBITRAGE",
    action: "swarm_execute",
    agentWork:
      "Each fleet role runs its skill on your query. The lead agent aggregates signed results for on-chain completion.",
    sources: [
      "CoinGecko + Somnia oracle",
      "DEX spread model",
      "Vault registry",
      "Governance parameters + optional LLM",
      "Circuit breaker + fleet stats",
    ],
    successCriteria: [
      { id: "all_roles_reported", label: "All roles reported", description: "Five skill results are posted for the task." },
      { id: "majority_success", label: "Majority success", description: "At least 4 of 5 skills succeed." },
      { id: "oracle_price", label: "Oracle price", description: "Oracle skill returns a fresh USD price." },
    ],
  },
};

export {
  parseAssetFromQuery,
  parseEthAmountFromQuery,
  parseGovernanceStakes,
  parseMinSpreadBpsFromQuery,
  parseProposalFromQuery,
  parseRiskToleranceFromQuery,
} from "./queryParsing";

export function inferIntentFromQuery(query: string): TaskIntent {
  const q = query.toLowerCase();
  if (/\b(brief|portfolio|full swarm|all agents|everything)\b/.test(q)) return "PORTFOLIO_BRIEFING";
  if (/\b(yield|allocate|vault|apy)\b/.test(q)) return "YIELD_STRATEGY";
  if (/\b(arbitrage|spread|dex)\b/.test(q)) return "ARBITRAGE_SCAN";
  if (/\b(aip|governance|vote|proposal|quorum)\b/.test(q)) return "GOVERNANCE_ANALYSIS";
  if (/\b(risk|healthy|fleet|circuit|safe)\b/.test(q)) return "RISK_CHECK";
  if (/\b(price|usd|oracle|cost)\b/.test(q)) return "MARKET_PRICE";
  return "MARKET_PRICE";
}

export function buildTaskPayload(opts: {
  userQuery: string;
  intent: TaskIntent;
  mode: "single" | "swarm";
}): TaskPayload {
  const entry = INTENT_CATALOG[opts.intent];
  const query = opts.userQuery.trim();
  const asset = parseAssetFromQuery(query);
  const mode = opts.mode === "swarm" || entry.defaultMode === "swarm" ? "swarm" : "single";
  const primaryRole = mode === "swarm" ? "ARBITRAGE" : entry.primaryRole;
  const action = mode === "swarm" ? "swarm_execute" : entry.action;

  const baseParams: Record<string, unknown> = {
    userQuery: query,
    intent: opts.intent,
    asset,
  };

  switch (opts.intent) {
    case "MARKET_PRICE":
      Object.assign(baseParams, { currency: "usd", maxStalenessSec: 120 });
      break;
    case "ARBITRAGE_SCAN":
      Object.assign(baseParams, {
        minSpreadBps: parseMinSpreadBpsFromQuery(query, 15),
        slippageBps: 30,
        notionalEth: parseEthAmountFromQuery(query, 1),
      });
      break;
    case "YIELD_STRATEGY": {
      Object.assign(baseParams, {
        amountEth: parseEthAmountFromQuery(query, 1),
        riskTolerance: parseRiskToleranceFromQuery(query),
        diversify: true,
      });
      break;
    }
    case "GOVERNANCE_ANALYSIS": {
      const stakes = parseGovernanceStakes(query);
      Object.assign(baseParams, {
        proposalId: parseProposalFromQuery(query),
        supportStakeEth: stakes.support,
        againstStakeEth: stakes.against,
        quorumEth: stakes.quorum,
        passThreshold: 0.66,
        llmSummary: true,
      });
      break;
    }
    case "RISK_CHECK":
      Object.assign(baseParams, {
        minHealthyAgents: 3,
        checkCircuitBreaker: true,
        maxConsecutiveFailures: 2,
      });
      break;
    case "PORTFOLIO_BRIEFING": {
      const stakes = parseGovernanceStakes(query);
      Object.assign(baseParams, {
        pipeline: "user_briefing",
        amountEth: parseEthAmountFromQuery(query, 1),
        proposalId: parseProposalFromQuery(query),
        supportStakeEth: stakes.support,
        againstStakeEth: stakes.against,
        quorumEth: stakes.quorum,
        minSpreadBps: parseMinSpreadBpsFromQuery(query, 15),
        maxStalenessSec: 120,
      });
      break;
    }
  }

  const label =
    query.length > 72 ? `${query.slice(0, 69)}…` : query || entry.label;

  return {
    version: 1,
    primaryRole,
    action,
    params: baseParams,
    ...(mode === "swarm" ? { requiredRoles: [...ALL_AGENT_TYPES] } : {}),
    label,
    userQuery: query,
    intent: opts.intent,
    successCriteria: entry.successCriteria,
  };
}
