import { ethers } from "ethers";
import type { AgentType } from "../shared/taskPayload.js";
import { ALL_AGENT_TYPES } from "../shared/taskPayload.js";
import { DEFAULT_FLEET_AGENTS, DEFAULT_RELAYER_ADDRESS } from "../config/fleetDefaults.js";
import { AgentVaultClient } from "../somnia/AgentVaultClient.js";
import { readJsonFile } from "../config/resolveDataPath.js";
import { repo } from "../db/repository.js";
import type { AgentRecord } from "./types.js";

const AGENT_TYPES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
  "function getAgentStake(address) view returns (uint256)",
];

const REP_ABI = ["function getScore(address) view returns (uint256)"];

export function loadFleetAddressMap(): Partial<Record<AgentType, string>> {
  const fromEnv = process.env.FLEET_AGENTS_JSON?.trim();
  if (fromEnv) {
    try {
      const parsed = JSON.parse(fromEnv) as Record<string, string>;
      const map: Partial<Record<AgentType, string>> = {};
      for (const role of ALL_AGENT_TYPES) {
        if (parsed[role]) map[role] = parsed[role];
      }
      if (Object.keys(map).length > 0) return map;
    } catch {
      console.warn("[fleetSync] FLEET_AGENTS_JSON is not valid JSON");
    }
  }

  const fileData = readJsonFile<{ agents?: Record<string, string> }>("fleet.addresses.json");
  if (fileData?.agents) {
    const map: Partial<Record<AgentType, string>> = {};
    for (const role of ALL_AGENT_TYPES) {
      const addr = fileData.agents[role];
      if (addr) map[role] = addr;
    }
    if (Object.keys(map).length > 0) return map;
  }

  return { ...DEFAULT_FLEET_AGENTS };
}

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

  if (updated.length === 0) {
    console.warn("[fleetSync] No agents synced — check AGENT_REGISTRY_ADDR and fleet addresses");
  }

  return updated;
}

/** Unique fleet + relayer + any DB-registered agent addresses (swarm and individual). */
export function collectFleetWalletAddresses(
  fleet: Partial<Record<AgentType, string>>,
  dbAddresses: string[] = [],
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
  for (const addr of dbAddresses) add(addr);
  return out;
}

/** Sum on-chain registry stake + fleet vault reserves across all swarm/individual wallets. */
export async function computeFleetTotalStakedWei(): Promise<string> {
  const registryAddr = process.env.AGENT_REGISTRY_ADDR;
  if (!registryAddr) return "0";

  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const provider = new ethers.JsonRpcProvider(rpc);
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider);
  const vault = AgentVaultClient.fromEnv(provider);

  const dbAgents = await repo.listAgents({ page: 0, pageSize: 100 });
  const addresses = collectFleetWalletAddresses(
    loadFleetAddressMap(),
    dbAgents.data.map((a) => a.address),
  );

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
