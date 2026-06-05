import { query } from "./client.js";

export type VectorSupport = {
  enabled: boolean;
  reason?: string;
};

/** Idempotent RAG indexes, dedupe, optional pgvector column for future hybrid search. */
export async function ensureKnowledgeSchema(): Promise<VectorSupport> {
  await query(`
    DELETE FROM agent_knowledge a
    USING agent_knowledge b
    WHERE a.id > b.id
      AND a.agent_role = b.agent_role
      AND a.title = b.title
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_knowledge_role_title
    ON agent_knowledge (agent_role, title)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_agent_knowledge_role_updated
    ON agent_knowledge (agent_role, updated_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_agent_knowledge_tags
    ON agent_knowledge USING GIN (tags)
  `);

  await query(`
    CREATE OR REPLACE FUNCTION agent_knowledge_search_vector_update()
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
      NEW.updated_at = NOW();
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_agent_knowledge_search_vector ON agent_knowledge
  `);

  await query(`
    CREATE TRIGGER trg_agent_knowledge_search_vector
    BEFORE INSERT OR UPDATE OF title, content, tags ON agent_knowledge
    FOR EACH ROW EXECUTE FUNCTION agent_knowledge_search_vector_update()
  `);

  await query(`
    UPDATE agent_knowledge
    SET search_vector =
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C'),
        updated_at = NOW()
    WHERE search_vector IS NULL
  `);

  return ensurePgVectorColumn();
}

async function ensurePgVectorColumn(): Promise<VectorSupport> {
  if (process.env.PGVECTOR_ENABLED === "false") {
    return { enabled: false, reason: "PGVECTOR_ENABLED=false" };
  }

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await query(`
      ALTER TABLE agent_knowledge
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);
    const countR = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM agent_knowledge WHERE embedding IS NOT NULL`,
    );
    const embedded = Number(countR.rows[0]?.count ?? 0);
    if (embedded >= 100) {
      try {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_agent_knowledge_embedding_hnsw
          ON agent_knowledge USING hnsw (embedding vector_cosine_ops)
          WHERE embedding IS NOT NULL
        `);
      } catch {
        console.log("[DB] HNSW vector index skipped (requires pgvector with HNSW support)");
      }
    }
    return { enabled: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      enabled: false,
      reason: `pgvector unavailable (${message}). Full-text search remains active.`,
    };
  }
}
