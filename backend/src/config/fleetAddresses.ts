import type { AgentType } from "../shared/taskPayload.js";
import { ALL_AGENT_TYPES } from "../shared/taskPayload.js";
import { DEFAULT_FLEET_AGENTS } from "./fleetDefaults.js";
import { readJsonFile } from "./resolveDataPath.js";

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
      console.warn("[fleetAddresses] FLEET_AGENTS_JSON is not valid JSON");
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

export function loadRetiredFleetAddresses(): Set<string> {
  const retired = new Set<string>();
  const fileData = readJsonFile<{ retired?: Record<string, { address?: string }> }>("fleet.addresses.json");
  if (fileData?.retired) {
    for (const entry of Object.values(fileData.retired)) {
      if (entry.address) retired.add(entry.address.toLowerCase());
    }
  }
  return retired;
}

export function getCanonicalFleetAddresses(): string[] {
  const fleet = loadFleetAddressMap();
  return ALL_AGENT_TYPES.map((role) => fleet[role]?.toLowerCase()).filter(Boolean) as string[];
}

export function isCanonicalFleetAgent(address: string, agentType: string): boolean {
  const fleet = loadFleetAddressMap();
  const canonical = fleet[agentType as AgentType];
  return !!canonical && address.toLowerCase() === canonical.toLowerCase();
}
