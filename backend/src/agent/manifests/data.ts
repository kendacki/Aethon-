import type { AgentType } from "../../shared/taskPayload.js";

export interface SkillManifest {
  role: AgentType;
  version: string;
  description: string;
  capabilities: string[];
  actions: string[];
  tools: Array<{ id: string; type: string; description: string }>;
  inputs: string[];
  outputs: string[];
  health: {
    preflightValidation: boolean;
    healthGates: string[];
  };
  llm: { enabled: boolean; purpose?: string };
}

export const SKILL_MANIFESTS: Record<AgentType, SkillManifest> = {
  ARBITRAGE: {
    role: "ARBITRAGE",
    version: "1.1.0",
    description: "Multi-venue spread detection with slippage, gas-adjusted PnL, and confidence scoring.",
    capabilities: ["dex.quote", "spread.math", "gas.adjusted_pnl", "slippage.model", "confidence.score"],
    actions: ["check_spread", "swarm_execute"],
    tools: [
      { id: "coingecko_spot", type: "http", description: "Public spot price reference with fallback" },
      { id: "spread_simulator", type: "deterministic", description: "Multi-venue synthetic DEX spread model" },
    ],
    inputs: ["asset", "minSpreadBps", "slippageBps", "notionalEth"],
    outputs: ["spreadBps", "profitable", "estimatedProfitWei", "confidence", "recommendation"],
    health: { preflightValidation: true, healthGates: ["rpc_latency", "gas_price", "wallet_balance"] },
    llm: { enabled: false },
  },
  ORACLE: {
    role: "ORACLE",
    version: "1.1.0",
    description: "Price attestation with staleness guard, sanity bounds, and wallet-signed digest.",
    capabilities: ["price.feed", "staleness.guard", "attestation.pack", "sanity.bounds", "fallback.feed"],
    actions: ["fetch_price", "swarm_execute"],
    tools: [
      { id: "somnia_json_api", type: "somnia_agent", description: "Validator-consensus JSON API oracle (CoinGecko)" },
      { id: "coingecko_api", type: "http", description: "CoinGecko simple price API (fallback)" },
      { id: "fallback_table", type: "deterministic", description: "Resilient reference prices when API unavailable" },
      { id: "wallet_sign", type: "crypto", description: "Agent wallet attestation signature" },
    ],
    inputs: ["asset", "currency", "maxStalenessSec"],
    outputs: ["price", "fetchedAt", "attestation", "signature", "quality", "confidence"],
    health: { preflightValidation: true, healthGates: ["api_reachable", "rpc_latency", "somnia_consumer_funded"] },
    llm: { enabled: false },
  },
  YIELD_OPT: {
    role: "YIELD_OPT",
    version: "1.1.0",
    description: "Risk-adjusted vault routing with optional diversification and daily yield projection.",
    capabilities: ["vault.apy_compare", "allocation.math", "risk.adjusted_score", "diversify.split"],
    actions: ["optimize_yield", "swarm_execute"],
    tools: [
      { id: "vault_registry", type: "deterministic", description: "Curated Somnia vault APY table" },
      { id: "risk_scorer", type: "deterministic", description: "Sharpe-like APY/risk scoring" },
    ],
    inputs: ["amountEth", "riskTolerance", "diversify"],
    outputs: ["recommendedVault", "expectedApyBps", "allocation", "expectedDailyYieldEth", "confidence"],
    health: { preflightValidation: true, healthGates: ["wallet_balance"] },
    llm: { enabled: false },
  },
  GOVERNANCE: {
    role: "GOVERNANCE",
    version: "1.1.0",
    description: "Quorum analysis with configurable pass threshold, participation flags, and vote recommendation.",
    capabilities: ["proposal.decode", "quorum.math", "vote.recommend", "participation.flags"],
    actions: ["analyze_proposal", "swarm_execute"],
    tools: [
      { id: "stake_analyzer", type: "deterministic", description: "Support/against/quorum calculator" },
      { id: "somnia_llm_inference", type: "somnia_agent", description: "Qwen3-30B deterministic summary via Somnia LLM agent" },
    ],
    inputs: ["proposalId", "supportStakeEth", "againstStakeEth", "quorumEth", "passThreshold"],
    outputs: ["quorumReached", "recommendedVote", "confidence", "flags", "participationPct"],
    health: { preflightValidation: true, healthGates: ["on_chain_registration"] },
    llm: { enabled: true, purpose: "Optional plain-language proposal summary" },
  },
  RISK_MGMT: {
    role: "RISK_MGMT",
    version: "1.1.0",
    description: "Composite protocol risk scoring: circuit breaker, fleet liveness, gas reserve, API reachability.",
    capabilities: ["circuit.monitor", "fleet.liveness", "composite.risk_score", "gas.reserve"],
    actions: ["assess_protocol_risk", "swarm_execute"],
    tools: [
      { id: "circuit_breaker_rpc", type: "rpc", description: "On-chain CircuitBreaker contract read" },
      { id: "fleet_stats_api", type: "http", description: "Active agent count from API /stats" },
    ],
    inputs: ["checkCircuitBreaker", "minHealthyAgents", "maxConsecutiveFailures"],
    outputs: ["riskLevel", "compositeScore", "circuitPaused", "activeAgents", "recommendation", "confidence"],
    health: { preflightValidation: true, healthGates: ["circuit_breaker", "api_reachable"] },
    llm: { enabled: false },
  },
};

export function getManifest(role: string): SkillManifest | null {
  if (role in SKILL_MANIFESTS) return SKILL_MANIFESTS[role as AgentType];
  return null;
}
