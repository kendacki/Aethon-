import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Resolve a repo data file (env/*.json) for local dev, Nixpacks, and Docker dist layouts. */
export function resolveDataFile(fileName: string): string | null {
  if (process.env.FLEET_ADDRESSES_FILE && fileName === "fleet.addresses.json") {
    return process.env.FLEET_ADDRESSES_FILE;
  }
  if (process.env.FLEET_HEALTH_URLS_FILE && fileName.startsWith("fleet.health-urls")) {
    return process.env.FLEET_HEALTH_URLS_FILE;
  }

  const candidates = [
    path.join(process.cwd(), "env", fileName),
    path.join(process.cwd(), "backend", "env", fileName),
    path.join(moduleDir, "..", "..", "env", fileName),
    path.join(moduleDir, "..", "env", fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function readJsonFile<T>(fileName: string): T | null {
  const resolved = resolveDataFile(fileName);
  if (!resolved) return null;
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8")) as T;
  } catch {
    return null;
  }
}
