import { ethers } from "ethers";
import type { AgentType } from "../shared/taskPayload.js";
import { ALL_AGENT_TYPES } from "../shared/taskPayload.js";
import { DEFAULT_RELAYER_ADDRESS } from "../config/fleetDefaults.js";
import {
  getCanonicalFleetAddresses,
  isCanonicalFleetAgent,
  loadFleetAddressMap,
  loadRetiredFleetAddresses,
} from "../config/fleetAddresses.js";
import { AgentVaultClient } from "../somnia/AgentVaultClient.js";
import { query } from "../db/client.js";
import { repo } from "../db/repository.js";
import type { AgentRecord } from "./types.js";

export { loadFleetAddressMap } from "../config/fleetAddresses.js";

const AGENT_TYPES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
  "function getAgentStake(address) view returns (uint256)",
];

const REP_ABI = ["function getScore(address) view returns (uint256)"];

async function fetchAgentFromChain(
  provider: ethers.JsonRpcProvider,
  address: string,
): Promise<AgentRecord | null> {
  const registryAddr = process.env.AGENT_REGISTRY_ADDR;
  if (!registryAddr) return null;

  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider);
  const a = await registry.agents(address);
  let reputation = 100;
  const repAddr = process.env.REPUTATION_ENGINE_ADDR;
  if (repAddr) {
    const rep = new ethers.Contract(repAddr, REP_ABI, provider);
    reputation = Number(await rep.getScore(address));
  }
  const online = await registry.isAgentActive(address);
  return {
    address,
    agentType: AGENT_TYPES[Number(a.agentType)] ?? "ARBITRAGE",
    stake: a.stake.toString(),
    reputation,
    online,
    lastHeartbeat: new Date(Number(a.lastHeartbeat) * 1000).toISOString(),
    metadataURI: a.metadataURI,
  };
}

/** Mark retired / duplicate wallets offline — keep rows for leaderboard role aggregation. */
export async function pruneNonCanonicalFleetAgents(): Promise<number> {
  const canonical = new Set(getCanonicalFleetAddresses());
  const retired = loadRetiredFleetAddresses();
  const rows = await query<{ address: string }>(`SELECT address FROM agents`);
  let updated = 0;

  for (const row of rows.rows) {
    const addr = row.address.toLowerCase();
    if (retired.has(addr) || !canonical.has(addr)) {
      await query(`UPDATE agents SET online = false, updated_at = NOW() WHERE address = $1`, [addr]);
      updated += 1;
    }
  }

  if (updated > 0) {
    console.log(`[fleetSync] Marked ${updated} non-canonical agent wallet(s) offline (kept for leaderboard history)`);
  }

  return updated;
}

/** Refresh every known wallet from chain so role totals stay current. */
export async function syncAllAgentsForLeaderboard(): Promise<number> {
  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const provider = new ethers.JsonRpcProvider(rpc);
  const addresses = await repo.listAgentAddresses();
  let updated = 0;

  for (const address of addresses) {
    try {
      const record = await fetchAgentFromChain(provider, address);
      if (!record) continue;
      await repo.upsertAgent(record);
      updated += 1;
    } catch (err) {
      console.warn(
        `[fleetSync] leaderboard refresh failed for ${address}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return updated;
}

/** Refresh fleet agent rows from chain (isAgentActive respects 120s heartbeat TTL). */
export async function syncFleetFromChain(): Promise<AgentRecord[]> {
  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const provider = new ethers.JsonRpcProvider(rpc);
  const fleet = loadFleetAddressMap();
  const updated: AgentRecord[] = [];

  for (const role of ALL_AGENT_TYPES) {
    const address = fleet[role];
    if (!address) continue;
    try {
      const record = await fetchAgentFromChain(provider, address);
      if (!record) continue;
      await repo.upsertAgent(record);
      updated.push(record);
    } catch (err) {
      console.warn(
        `[fleetSync] ${role} sync failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await pruneNonCanonicalFleetAgents().catch((err) => {
    console.warn("[fleetSync] prune failed:", err instanceof Error ? err.message : err);
  });

  if (updated.length === 0) {
    console.warn("[fleetSync] No agents synced — check AGENT_REGISTRY_ADDR and fleet addresses");
  }

  return updated;
}

/** Unique fleet + relayer wallet addresses for stake totals (canonical fleet only). */
export function collectFleetWalletAddresses(
  fleet: Partial<Record<AgentType, string>>,
  _dbAddresses: string[] = [],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (addr: string | undefined) => {
    if (!addr) return;
    const key = addr.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ethers.getAddress(addr));
  };

  for (const role of ALL_AGENT_TYPES) add(fleet[role]);
  add(DEFAULT_RELAYER_ADDRESS);
  return out;
}

/** Sum on-chain registry stake + fleet vault reserves across canonical fleet wallets. */
export async function computeFleetTotalStakedWei(): Promise<string> {
  const registryAddr = process.env.AGENT_REGISTRY_ADDR;
  if (!registryAddr) return "0";

  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const provider = new ethers.JsonRpcProvider(rpc);
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider);
  const vault = AgentVaultClient.fromEnv(provider);

  const addresses = collectFleetWalletAddresses(loadFleetAddressMap());

  let total = 0n;
  for (const address of addresses) {
    try {
      const stake = (await registry.getAgentStake(address)) as bigint;
      total += stake;
    } catch {
      /* skip */
    }
    if (vault) {
      try {
        const status = await vault.getStatus(address);
        if (status.active) total += status.balanceWei;
      } catch {
        /* skip */
      }
    }
  }

  return total.toString();
}

export { isCanonicalFleetAgent, getCanonicalFleetAddresses, loadRetiredFleetAddresses };
