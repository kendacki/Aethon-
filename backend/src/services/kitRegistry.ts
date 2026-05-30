import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const KIT_FLEET_ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"] as const;
export type KitFleetRole = (typeof KIT_FLEET_ROLES)[number];

export interface KitFleetEntry {
  role: KitFleetRole;
  agentId: string;
  owner?: string;
  manifest?: string;
  source: "file" | "chain" | "fleet.addresses";
}

const KIT_REGISTRY_ABI = [
  "function getAgent(uint256 agentId) view returns (tuple(string name, string description, string ipfsMetadata, address owner, bool isActive, uint256 registeredAt, uint256 lastUpdated, string[] capabilities, uint256 executionCount))",
  "function agents(uint256 agentId) view returns (string name, string description, string ipfsMetadata, address owner, bool isActive, uint256 registeredAt, uint256 lastUpdated, uint256 executionCount)",
  "function getTotalAgents() view returns (uint256)",
] as const;

function deploymentsPath(name: string): string | null {
  const candidates = [
    path.join(process.cwd(), "deployments", name),
    path.join(process.cwd(), "backend", "deployments", name),
    path.join(__dirname, "../deployments", name),
    path.join(__dirname, "../../deployments", name),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadKitRegistrationsFile(): Record<string, { agentId?: string; owner?: string; manifest?: string }> | null {
  const file = deploymentsPath("somnia-kit-registrations.json");
  if (!file) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
      agents?: Record<string, { agentId?: string; owner?: string; manifest?: string }>;
    };
    return data.agents ?? null;
  } catch {
    return null;
  }
}

function loadFleetAddresses(): Record<string, string> | null {
  const candidates = [
    path.join(process.cwd(), "env", "fleet.addresses.json"),
    path.join(process.cwd(), "backend", "env", "fleet.addresses.json"),
    path.join(__dirname, "../../env/fleet.addresses.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as { agents?: Record<string, string> };
      return data.agents ?? null;
    } catch {
      /* try next path */
    }
  }
  return null;
}

function loadFleetAgentIdsFromFile(): Record<string, string> | null {
  const candidates = [
    path.join(process.cwd(), "env", "fleet.addresses.json"),
    path.join(process.cwd(), "backend", "env", "fleet.addresses.json"),
    path.join(__dirname, "../../env/fleet.addresses.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
        somniaKitRegistry?: { agentIds?: Record<string, string> };
      };
      return data.somniaKitRegistry?.agentIds ?? null;
    } catch {
      /* try next path */
    }
  }
  return null;
}

function entriesFromFileAgents(
  agents: Record<string, { agentId?: string; owner?: string; manifest?: string }>,
): KitFleetEntry[] {
  return KIT_FLEET_ROLES.flatMap((role) => {
    const row = agents[role];
    if (!row?.agentId) return [];
    return [
      {
        role,
        agentId: String(row.agentId),
        owner: row.owner,
        manifest: row.manifest,
        source: "file" as const,
      },
    ];
  });
}

async function findAgentIdByOwner(registry: ethers.Contract, owner: string, role: string): Promise<string | null> {
  const total = Number(await registry.getTotalAgents());
  const ownerLower = owner.toLowerCase();
  for (let i = 1; i <= total; i++) {
    try {
      const agent = await registry.getAgent(i);
      if (agent.owner.toLowerCase() !== ownerLower) continue;
      if (agent.name === role || String(agent.ipfsMetadata).includes(`/manifests/${role}`)) {
        return String(i);
      }
    } catch {
      try {
        const agent = await registry.agents(i);
        if (agent.owner.toLowerCase() === ownerLower) return String(i);
      } catch {
        /* skip missing slot */
      }
    }
  }
  return null;
}

async function loadKitRegistrationsFromChain(): Promise<KitFleetEntry[]> {
  const registryAddr =
    process.env.SOMNIA_KIT_REGISTRY_ADDR ?? "0xC9f3452090EEB519467DEa4a390976D38C008347";
  const owners = loadFleetAddresses();
  if (!owners) return [];

  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const provider = new ethers.JsonRpcProvider(rpc);
  const registry = new ethers.Contract(registryAddr, KIT_REGISTRY_ABI, provider);

  const entries: KitFleetEntry[] = [];
  for (const role of KIT_FLEET_ROLES) {
    const owner = owners[role];
    if (!owner) continue;
    try {
      const agentId = await findAgentIdByOwner(registry, owner, role);
      if (agentId) entries.push({ role, agentId, owner, source: "chain" });
    } catch (err) {
      console.warn(`[kitRegistry] On-chain lookup failed for ${role}:`, err instanceof Error ? err.message : err);
    }
  }
  return entries;
}

function entriesFromFleetAddressIds(): KitFleetEntry[] {
  const ids = loadFleetAgentIdsFromFile();
  const owners = loadFleetAddresses();
  if (!ids) return [];
  return KIT_FLEET_ROLES.flatMap((role) => {
    const agentId = ids[role];
    if (!agentId) return [];
    return [{ role, agentId: String(agentId), owner: owners?.[role], source: "fleet.addresses" as const }];
  });
}

export async function getKitFleetRegistrations(): Promise<KitFleetEntry[]> {
  const fileAgents = loadKitRegistrationsFile();
  if (fileAgents) {
    const fromFile = entriesFromFileAgents(fileAgents);
    if (fromFile.length > 0) return fromFile;
  }

  const fromChain = await loadKitRegistrationsFromChain();
  if (fromChain.length > 0) return fromChain;

  return entriesFromFleetAddressIds();
}

export function kitFleetToAgentsMap(
  fleet: KitFleetEntry[],
): Record<string, { id: string; agentId: string; owner?: string; manifest?: string }> {
  return Object.fromEntries(
    fleet.map((e) => [
      e.role,
      { id: e.agentId, agentId: e.agentId, owner: e.owner, manifest: e.manifest },
    ]),
  );
}
