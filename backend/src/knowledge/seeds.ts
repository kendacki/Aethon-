import type { AgentType } from "../shared/taskPayload.js";

export type KnowledgeSeed = {
  role: AgentType;
  title: string;
  content: string;
  sourceUrl?: string;
  tags: string[];
};

export const KNOWLEDGE_CATALOG_SEEDS: KnowledgeSeed[] = [
  {
    role: "ORACLE",
    title: "Oracle freshness policy",
    content:
      "Prefer Somnia JSON API consensus when enabled, then CoinGecko spot, then bounded fallback. Reject prices outside sanity bounds. Sign every attestation digest with the agent wallet.",
    sourceUrl: "https://api.coingecko.com/api/v3/simple/price",
    tags: ["price", "oracle", "staleness", "attestation"],
  },
  {
    role: "ARBITRAGE",
    title: "Spread scan methodology",
    content:
      "Compare reference spot (CoinGecko) against live exchange tickers and on-chain UniswapV2-style pair reserves when SOMNIA_DEX_PAIR_ADDR is set. Recommend execute only when spread exceeds minSpreadBps after live gas estimate.",
    tags: ["arbitrage", "spread", "dex", "gas"],
  },
  {
    role: "YIELD_OPT",
    title: "Yield allocation policy",
    content:
      "Rank live DeFi pools by risk-adjusted APY from DefiLlama. Respect conservative, moderate, and aggressive risk tolerance. Diversify across two vaults unless aggressive mode requests concentration.",
    sourceUrl: "https://yields.llama.fi/pools",
    tags: ["yield", "vault", "apy", "allocation"],
  },
  {
    role: "GOVERNANCE",
    title: "Governance vote framework",
    content:
      "Compute quorum from support and against stake. Apply pass threshold to support ratio. Flag low participation and split votes. Optional Somnia LLM summary must not override deterministic vote math.",
    tags: ["governance", "quorum", "proposal", "vote"],
  },
  {
    role: "RISK_MGMT",
    title: "Fleet risk composite score",
    content:
      "Weight circuit breaker state, fleet liveness from stats API, agent gas reserve, and API reachability. HALT when circuit paused or active agents below minHealthyAgents. CAUTION when consecutive failures elevated.",
    tags: ["risk", "fleet", "circuit", "health"],
  },
  {
    role: "ORACLE",
    title: "ETH price sources",
    content:
      "Ethereum spot uses CoinGecko id ethereum vs USD. Max staleness default 120 seconds. Quality ranks: SOMNIA_CONSENSUS, PRIMARY (CoinGecko), FALLBACK table.",
    tags: ["ethereum", "eth", "usd", "price"],
  },
  {
    role: "ARBITRAGE",
    title: "Gas-adjusted profitability",
    content:
      "Estimate swap gas from live network fee data with 380k gas limit. Net profit must exceed zero wei after gas for proceed=true. Hold recommendation when spread below threshold or gas dominates.",
    tags: ["gas", "profit", "execute", "hold"],
  },
  {
    role: "YIELD_OPT",
    title: "Risk tolerance mapping",
    content:
      "Conservative caps pool risk at 2, moderate at 3, aggressive at 5. Risk score derives from DefiLlama ilRisk and exposure fields when available.",
    tags: ["risk", "tolerance", "conservative", "moderate"],
  },
  {
    role: "GOVERNANCE",
    title: "Proposal parsing",
    content:
      "Extract proposal id from AIP-N patterns in user query. Default proposal URL from GOVERNANCE_PROPOSAL_URL env. Live page context via Somnia parseWebsite when available.",
    tags: ["aip", "snapshot", "proposal"],
  },
  {
    role: "RISK_MGMT",
    title: "Production halt conditions",
    content:
      "HIGH risk when circuit breaker paused, composite score under 40, or healthy agents below minimum. Users should retry after fleet recovery or switch to single-agent price tasks.",
    tags: ["halt", "production", "recovery"],
  },
];
