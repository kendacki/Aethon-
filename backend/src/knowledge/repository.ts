import type { AgentType } from "../shared/taskPayload.js";
import { query } from "../db/client.js";
import { KNOWLEDGE_CATALOG_SEEDS } from "./seeds.js";
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
            ts_rank_cd(search_vector, to_tsquery('english', $2), 32) AS score
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
    `INSERT INTO agent_knowledge (agent_role, title, content, source_url, tags)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (agent_role, title) DO UPDATE SET
       content = EXCLUDED.content,
       source_url = EXCLUDED.source_url,
       tags = EXCLUDED.tags,
       updated_at = NOW()`,
    [entry.role, entry.title, entry.content, entry.sourceUrl ?? null, entry.tags ?? []],
  );
}

/** Idempotent catalog seed: safe to run on every deploy (UPSERT by role + title). */
export async function seedKnowledgeCatalog(): Promise<{ upserted: number; inserted: number }> {
  let inserted = 0;

  for (const entry of KNOWLEDGE_CATALOG_SEEDS) {
    const before = await query<{ id: number }>(
      `SELECT id FROM agent_knowledge WHERE agent_role = $1 AND title = $2`,
      [entry.role, entry.title],
    );

    await upsertKnowledge(entry);

    if (before.rows.length === 0) inserted += 1;
  }

  return { upserted: KNOWLEDGE_CATALOG_SEEDS.length, inserted };
}

/** @deprecated Use seedKnowledgeCatalog */
export async function seedKnowledgeIfEmpty(): Promise<number> {
  const result = await seedKnowledgeCatalog();
  return result.inserted;
}

export async function storeObservation(obs: AgentObservation): Promise<void> {
  await query(
    `INSERT INTO agent_observations (agent_role, task_id, observation_type, payload)
     VALUES ($1, $2, $3, $4)`,
    [obs.role, obs.taskId ?? null, obs.observationType, JSON.stringify(obs.payload)],
  );
}
