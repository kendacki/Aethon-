import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./client.js";
import { ensureKnowledgeSchema } from "./knowledgeSchema.js";
import { withMigrationLock } from "./migrationLock.js";
import { seedKnowledgeCatalog } from "../knowledge/repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  await withMigrationLock(async () => {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    await query(sql);

    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_target TEXT`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS execution_payload TEXT`);

    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await query(
      `INSERT INTO indexer_state (id, last_block) VALUES ('main', $1)
       ON CONFLICT (id) DO NOTHING`,
      [Number(process.env.INDEXER_START_BLOCK ?? 0)],
    );

    const vector = await ensureKnowledgeSchema();
    const seeded = await seedKnowledgeCatalog();

    await query(
      `INSERT INTO schema_migrations (id, applied_at) VALUES ('knowledge_rag_v1', NOW())
       ON CONFLICT (id) DO UPDATE SET applied_at = NOW()`,
    );

    if (seeded.upserted > 0) {
      console.log(`[DB] Knowledge catalog upserted ${seeded.upserted} entries (${seeded.inserted} new)`);
    }
    if (vector.enabled) {
      console.log("[DB] pgvector enabled for agent_knowledge.embedding");
    } else if (vector.reason) {
      console.log(`[DB] pgvector skipped: ${vector.reason}`);
    }
    console.log("[DB] Migrations applied");
  });
}

/** @deprecated Use runMigrations. Kept for backwards compatibility. */
export const migrate = runMigrations;

async function main(): Promise<void> {
  if (process.env.SKIP_DB_MIGRATE === "true" || process.env.AETHON_RUNTIME === "agent") {
    console.log("[DB] Skipping migrations (agent worker or SKIP_DB_MIGRATE=true)");
    return;
  }
  await runMigrations();
  await pool.end();
}

const isDirectRun =
  process.argv[1]?.replace(/\\/g, "/").includes("db/migrate") ||
  process.argv[1]?.replace(/\\/g, "/").includes("migrate.js");

if (isDirectRun) {
  main().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = err instanceof Error && err.stack ? err.stack : msg;
    console.error("[DB] Migration failed:", msg || detail);
    process.exit(1);
  });
}
