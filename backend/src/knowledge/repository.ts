import type { AgentType } from "../shared/taskPayload.js";
import { query } from "../db/client.js";
import type { AgentObservation, KnowledgeChunk } from "./types.js";

function tokenizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 12)
    .join(" & ");
}

export async function searchKnowledge(
  role: AgentType,
  userQuery: string,
  limit = 5,
): Promise<KnowledgeChunk[]> {
  const tsQuery = tokenizeQuery(userQuery);
  if (!tsQuery) {
    const fallback = await query<{
      id: number;
      agent_role: string;
      title: string;
      content: string;
      source_url: string | null;
      tags: string[];
    }>(
      `SELECT id, agent_role, title, content, source_url, tags
       FROM agent_knowledge WHERE agent_role = $1
       ORDER BY updated_at DESC LIMIT $2`,
      [role, limit],
    );
    return fallback.rows.map((row) => ({
      id: row.id,
      role: row.agent_role as AgentType,
      title: row.title,
      content: row.content,
      sourceUrl: row.source_url ?? undefined,
      tags: row.tags ?? [],
      score: 0.1,
    }));
  }

  const r = await query<{
    id: number;
    agent_role: string;
    title: string;
    content: string;
    source_url: string | null;
    tags: string[];
    score: number;
  }>(
    `SELECT id, agent_role, title, content, source_url, tags,
            ts_rank(search_vector, to_tsquery('english', $2)) AS score
     FROM agent_knowledge
     WHERE agent_role = $1
       AND search_vector @@ to_tsquery('english', $2)
     ORDER BY score DESC
     LIMIT $3`,
    [role, tsQuery, limit],
  );

  if (r.rows.length > 0) {
    return r.rows.map((row) => ({
      id: row.id,
      role: row.agent_role as AgentType,
      title: row.title,
      content: row.content,
      sourceUrl: row.source_url ?? undefined,
      tags: row.tags ?? [],
      score: Number(row.score),
    }));
  }

  const ilike = `%${userQuery.toLowerCase().slice(0, 64)}%`;
  const fuzzy = await query<{
    id: number;
    agent_role: string;
    title: string;
    content: string;
    source_url: string | null;
    tags: string[];
  }>(
    `SELECT id, agent_role, title, content, source_url, tags
     FROM agent_knowledge
     WHERE agent_role = $1
       AND (LOWER(title) LIKE $2 OR LOWER(content) LIKE $2)
     ORDER BY updated_at DESC
     LIMIT $3`,
    [role, ilike, limit],
  );

  return fuzzy.rows.map((row) => ({
    id: row.id,
    role: row.agent_role as AgentType,
    title: row.title,
    content: row.content,
    sourceUrl: row.source_url ?? undefined,
    tags: row.tags ?? [],
    score: 0.05,
  }));
}

export async function upsertKnowledge(entry: {
  role: AgentType;
  title: string;
  content: string;
  sourceUrl?: string;
  tags?: string[];
}): Promise<void> {
  await query(
    `INSERT INTO agent_knowledge (agent_role, title, content, source_url, tags, search_vector, updated_at)
     VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $2 || ' ' || $3), NOW())
     ON CONFLICT DO NOTHING`,
    [entry.role, entry.title, entry.content, entry.sourceUrl ?? null, entry.tags ?? []],
  );
}

export async function seedKnowledgeIfEmpty(): Promise<number> {
  const count = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM agent_knowledge`);
  if (Number(count.rows[0]?.count ?? 0) > 0) return 0;

  const seeds: Array<{
    role: AgentType;
    title: string;
    content: string;
    sourceUrl?: string;
    tags: string[];
  }> = [
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

  for (const entry of seeds) {
    await query(
      `INSERT INTO agent_knowledge (agent_role, title, content, source_url, tags, search_vector, updated_at)
       VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $2 || ' ' || $3), NOW())`,
      [entry.role, entry.title, entry.content, entry.sourceUrl ?? null, entry.tags],
    );
  }

  return seeds.length;
}

export async function storeObservation(obs: AgentObservation): Promise<void> {
  await query(
    `INSERT INTO agent_observations (agent_role, task_id, observation_type, payload)
     VALUES ($1, $2, $3, $4)`,
    [obs.role, obs.taskId ?? null, obs.observationType, JSON.stringify(obs.payload)],
  );
}
