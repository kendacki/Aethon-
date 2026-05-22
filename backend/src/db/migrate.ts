import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await query(sql);
  await query(
    `INSERT INTO indexer_state (id, last_block) VALUES ('main', $1)
     ON CONFLICT (id) DO NOTHING`,
    [Number(process.env.INDEXER_START_BLOCK ?? 0)]
  );
  console.log("[DB] Migrations applied");
}
