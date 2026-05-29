/** Somnia Agentic L1 platform constants — https://docs.somnia.network/agents */

export const SOMNIA_PLATFORM_ADDR: Record<number, string> = {
  5031: "0x5E5205CF39E766118C01636bED000A54D93163E6",
  50312: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776",
};

/** Base agent IDs — same on testnet and mainnet per Somnia docs. */
export const SOMNIA_BASE_AGENTS = {
  JSON_API: 13174292974160097713n,
  LLM_INFERENCE: 12847293847561029384n,
  LLM_PARSE_WEBSITE: 12875401142070969085n,
} as const;

export const SOMNIA_SUBCOMMITTEE_SIZE = 3;

/** Per-validator execution reward (wei) — see docs gas-fees table. */
export const SOMNIA_PER_AGENT_PRICE_WEI: Record<keyof typeof SOMNIA_BASE_AGENTS, bigint> = {
  JSON_API: 30_000_000_000_000_000n, // 0.03 STT/SOMI
  LLM_INFERENCE: 70_000_000_000_000_000n, // 0.07
  LLM_PARSE_WEBSITE: 100_000_000_000_000_000n, // 0.10
};

export const SOMNIA_PRACTICAL_DEPOSIT_WEI: Record<keyof typeof SOMNIA_BASE_AGENTS, bigint> = {
  JSON_API: 120_000_000_000_000_000n, // 0.12
  LLM_INFERENCE: 240_000_000_000_000_000n, // 0.24
  LLM_PARSE_WEBSITE: 330_000_000_000_000_000n, // 0.33
};

export const SOMNIA_AGENT_EXPLORER: Record<number, string> = {
  5031: "https://agents.somnia.network",
  50312: "https://agents.testnet.somnia.network",
};

export const AETHON_SOMNIA_FIT = {
  layer: "application",
  description:
    "AETHON is an agent economy dApp on Somnia: custom registry, task market, coalitions, and five role workers. Somnia platform agents supply consensus-verified oracles and LLM when enabled.",
  nativePlatformAgents: ["JSON_API", "LLM_INFERENCE", "LLM_PARSE_WEBSITE"],
  aethonRoles: ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"],
  integrations: {
    oraclePriceFeed: "ORACLE uses Somnia JSON API agent when SOMNIA_AGENTS_ENABLED + consumer deployed",
    governanceSummary: "GOVERNANCE uses Somnia LLM inferString for plain-language summaries",
    peerDiscovery: "CoalitionEngine uses API registry with ADP fallback",
    onChainSettlement: "AETHON AgentRegistry, TaskMarket, CoalitionManager on Somnia",
  },
} as const;
