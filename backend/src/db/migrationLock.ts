import { query } from "./client.js";

/** Stable advisory lock id for Aethon schema migrations (single flight). */
export const MIGRATION_ADVISORY_LOCK_KEY = 734829104;

export async function withMigrationLock<T>(fn: () => Promise<T>): Promise<T> {
  const acquired = await query<{ locked: boolean }>(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [MIGRATION_ADVISORY_LOCK_KEY],
  );
  if (!acquired.rows[0]?.locked) {
    throw new Error(
      "Another migration is already running (advisory lock held). Retry shortly or run migrations from a single CI/CD step.",
    );
  }
  try {
    return await fn();
  } finally {
    await query(`SELECT pg_advisory_unlock($1)`, [MIGRATION_ADVISORY_LOCK_KEY]);
  }
}
