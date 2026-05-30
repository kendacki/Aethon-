import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const deploymentBlockCache = new Map<string, number>();

export function readEnvStartBlock(): number | null {
  const raw = process.env.START_BLOCK ?? process.env.INDEXER_START_BLOCK;
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function readDeploymentBlockFromFile(): number | null {
  const chainId = String(process.env.SOMNIA_CHAIN_ID ?? 50312);
  const dir = path.join(__dirname, "..", "..", "deployments");
  if (!fs.existsSync(dir)) return null;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(`-${chainId}.json`)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as {
        deploymentBlock?: number;
        startBlock?: number;
      };
      if (typeof data.deploymentBlock === "number" && data.deploymentBlock >= 0) {
        return data.deploymentBlock;
      }
      if (typeof data.startBlock === "number" && data.startBlock >= 0) {
        return data.startBlock;
      }
    } catch {
      /* skip malformed deployment file */
    }
  }
  return null;
}

export async function getContractDeploymentBlock(
  provider: ethers.Provider,
  address: string,
): Promise<number> {
  const key = address.toLowerCase();
  const cached = deploymentBlockCache.get(key);
  if (cached !== undefined) return cached;

  const latest = await provider.getBlockNumber();
  const atHead = await provider.getCode(address, latest);
  if (atHead === "0x") {
    throw new Error(`No contract code at ${address} on chain head ${latest}`);
  }

  let low = 0;
  let high = latest;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const code = await provider.getCode(address, mid);
    if (code === "0x") low = mid + 1;
    else high = mid;
  }

  deploymentBlockCache.set(key, low);
  return low;
}

export async function resolveStartBlock(provider: ethers.Provider, taskMarketAddr?: string): Promise<number> {
  const fromEnv = readEnvStartBlock();
  if (fromEnv !== null) return fromEnv;

  const fromFile = readDeploymentBlockFromFile();
  if (fromFile !== null) return fromFile;

  if (taskMarketAddr?.startsWith("0x")) {
    try {
      return await getContractDeploymentBlock(provider, taskMarketAddr);
    } catch (err) {
      console.warn(
        "[Indexer] Could not resolve TaskMarket deployment block:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return 0;
}
