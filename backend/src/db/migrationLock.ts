import { query } from "./client.js";

/** Stable advisory lock id for Aethon schema migrations (single flight). */
export const MIGRATION_ADVISORY_LOCK_KEY = 734829104;

const LOCK_RETRY_MS = 2000;
const LOCK_MAX_WAIT_MS = 90_000;

export async function withMigrationLock<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  let acquired = false;
  while (Date.now() < deadline) {
    const res = await query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock($1) AS locked`,
      [MIGRATION_ADVISORY_LOCK_KEY],
    );
    if (res.rows[0]?.locked) {
      acquired = true;
      break;
    }
    await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
  }
  if (!acquired) {
    throw new Error(
      "Migration lock timeout after 90s (another deploy may be running migrations). Retry shortly.",
    );
  }
  try {
    return await fn();
  } finally {
    await query(`SELECT pg_advisory_unlock($1)`, [MIGRATION_ADVISORY_LOCK_KEY]);
  }
}
