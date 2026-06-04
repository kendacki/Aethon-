import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import type { AgentType } from "../shared/taskPayload.js";
import { ALL_AGENT_TYPES } from "../shared/taskPayload.js";
import { repo } from "../db/repository.js";
import type { AgentRecord } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_TYPES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
];

const REP_ABI = ["function getScore(address) view returns (uint256)"];

export function loadFleetAddressMap(): Partial<Record<AgentType, string>> {
  const filePath =
    process.env.FLEET_ADDRESSES_FILE ??
    path.join(__dirname, "..", "..", "env", "fleet.addresses.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      agents?: Record<string, string>;
    };
    const map: Partial<Record<AgentType, string>> = {};
    for (const role of ALL_AGENT_TYPES) {
      const addr = parsed.agents?.[role];
      if (addr) map[role] = addr;
    }
    return map;
  } catch {
    return {};
  }
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
    const record = await fetchAgentFromChain(provider, address);
    if (!record) continue;
    await repo.upsertAgent(record);
    updated.push(record);
  }

  return updated;
}
