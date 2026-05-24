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
  llm: { enabled: boolean; purpose?: string };
}

export const SKILL_MANIFESTS: Record<AgentType, SkillManifest> = {
  ARBITRAGE: {
    role: "ARBITRAGE",
    version: "1.0.0",
    description: "Cross-venue spread detection and gas-adjusted profit estimation.",
    capabilities: ["dex.quote", "spread.math", "gas.adjusted_pnl"],
    actions: ["check_spread"],
    tools: [
      { id: "coingecko_spot", type: "http", description: "Public spot price reference" },
      { id: "spread_simulator", type: "deterministic", description: "Synthetic DEX spread model" },
    ],
    inputs: ["asset", "minSpreadBps"],
    outputs: ["spreadBps", "profitable", "estimatedProfitWei"],
    llm: { enabled: false },
  },
  ORACLE: {
    role: "ORACLE",
    version: "1.0.0",
    description: "External data fetch with staleness checks and signed attestation payload.",
    capabilities: ["price.feed", "staleness.guard", "attestation.pack"],
    actions: ["fetch_price"],
    tools: [
      { id: "coingecko_api", type: "http", description: "CoinGecko simple price API" },
      { id: "wallet_sign", type: "crypto", description: "Agent wallet attestation signature" },
    ],
    inputs: ["asset", "currency", "maxStalenessSec"],
    outputs: ["price", "timestamp", "attestation", "signature"],
    llm: { enabled: false },
  },
  YIELD_OPT: {
    role: "YIELD_OPT",
    version: "1.0.0",
    description: "Vault APY comparison and risk-adjusted allocation routing.",
    capabilities: ["vault.apy_compare", "allocation.math", "rebalance.threshold"],
    actions: ["optimize_yield"],
    tools: [
      { id: "vault_registry", type: "deterministic", description: "Curated Somnia vault APY table" },
      { id: "risk_scorer", type: "deterministic", description: "Risk-adjusted yield scoring" },
    ],
    inputs: ["amountEth", "riskTolerance"],
    outputs: ["recommendedVault", "expectedApyBps", "allocationPct"],
    llm: { enabled: false },
  },
  GOVERNANCE: {
    role: "GOVERNANCE",
    version: "1.0.0",
    description: "Proposal quorum analysis and vote recommendation from stake weights.",
    capabilities: ["proposal.decode", "quorum.math", "vote.recommend"],
    actions: ["analyze_proposal"],
    tools: [
      { id: "stake_analyzer", type: "deterministic", description: "Support/against/quorum calculator" },
    ],
    inputs: ["proposalId", "supportStakeEth", "againstStakeEth", "quorumEth"],
    outputs: ["quorumReached", "recommendedVote", "confidence"],
    llm: { enabled: true, purpose: "Optional plain-language proposal summary" },
  },
  RISK_MGMT: {
    role: "RISK_MGMT",
    version: "1.0.0",
    description: "Circuit breaker, fleet liveness, and stake-at-risk monitoring.",
    capabilities: ["circuit.monitor", "fleet.liveness", "stake.at_risk"],
    actions: ["assess_protocol_risk"],
    tools: [
      { id: "circuit_breaker_rpc", type: "rpc", description: "On-chain CircuitBreaker contract read" },
      { id: "agent_registry_rpc", type: "rpc", description: "Active agent count from registry" },
    ],
    inputs: ["checkCircuitBreaker", "minHealthyAgents"],
    outputs: ["riskLevel", "circuitPaused", "activeAgents", "recommendation"],
    llm: { enabled: false },
  },
};

export function getManifest(role: string): SkillManifest | null {
  if (role in SKILL_MANIFESTS) return SKILL_MANIFESTS[role as AgentType];
  return null;
}
