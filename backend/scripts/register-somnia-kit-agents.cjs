#!/usr/bin/env node
/**
 * Register AETHON fleet agents in the Somnia Agent Kit registry (testnet).
 * Each agent wallet calls registerAgent() — owner must match fleet wallet.
 *
 * Usage:
 *   node scripts/register-somnia-kit-agents.cjs
 *   node scripts/register-somnia-kit-agents.cjs --role ORACLE
 *   node scripts/register-somnia-kit-agents.cjs --dry-run
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const KIT_REGISTRY =
  process.env.SOMNIA_KIT_REGISTRY_ADDR ?? "0xC9f3452090EEB519467DEa4a390976D38C008347";
const API_PUBLIC = process.env.API_PUBLIC_URL ?? "https://aethon-production-3f5a.up.railway.app";

const REGISTRY_ABI = [
  "function registerAgent(string name, string description, string ipfsMetadata, string[] capabilities) returns (uint256)",
  "function getAgent(uint256 agentId) view returns (tuple(string name, string description, string ipfsMetadata, address owner, bool isActive, uint256 registeredAt, uint256 lastUpdated, string[] capabilities, uint256 executionCount))",
  "function agents(uint256 agentId) view returns (string name, string description, string ipfsMetadata, address owner, bool isActive, uint256 registeredAt, uint256 lastUpdated, uint256 executionCount)",
  "function getTotalAgents() view returns (uint256)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string name)",
];

const ROLES = [
  {
    role: "ARBITRAGE",
    file: "arbitrage.env",
    capabilities: ["dex.quote", "spread.math", "arbitrage", "defi"],
  },
  {
    role: "ORACLE",
    file: "oracle.env",
    capabilities: ["price.feed", "oracle", "attestation", "somnia.json_api"],
  },
  {
    role: "YIELD_OPT",
    file: "yield_opt.env",
    capabilities: ["yield.optimization", "vault.routing", "defi"],
  },
  {
    role: "GOVERNANCE",
    file: "governance.env",
    capabilities: ["governance", "quorum.analysis", "somnia.llm"],
  },
  {
    role: "RISK_MGMT",
    file: "risk_mgmt.env",
    capabilities: ["risk.management", "circuit.monitor", "fleet.health"],
  },
];

const fleet = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "env", "fleet.addresses.json"), "utf8")
);

function readAgentKey(file) {
  const envPath = path.join(__dirname, "..", "env", "agents", file);
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, "utf8").match(/^AGENT_PRIVATE_KEY=(.+)$/m);
  return match?.[1]?.trim() || null;
}

function manifestUri(role) {
  return `${API_PUBLIC.replace(/\/+$/, "")}/v1/agents/manifests/${role}`;
}

async function findExistingByOwner(registry, owner, roleName) {
  const total = Number(await registry.getTotalAgents());
  for (let i = 1; i <= total; i++) {
    try {
      const agent = await registry.getAgent(i);
      if (agent.owner.toLowerCase() !== owner.toLowerCase()) continue;
      if (agent.name === roleName || String(agent.ipfsMetadata).includes("/manifests/")) {
        return { id: String(i), name: agent.name };
      }
    } catch {
      try {
        const agent = await registry.agents(i);
        if (agent.owner.toLowerCase() === owner.toLowerCase()) {
          return { id: String(i), name: agent.name };
        }
      } catch {
        // skip
      }
    }
  }
  return null;
}

async function registerRole(registry, provider, { role, file, capabilities }, dryRun) {
  const pk = readAgentKey(file);
  const expectedAddr = fleet.agents[role];
  if (!pk) {
    console.warn(`[${role}] Skip — missing env/agents/${file}`);
    return null;
  }
  const wallet = new ethers.Wallet(pk, provider);
  if (wallet.address.toLowerCase() !== expectedAddr.toLowerCase()) {
    console.warn(`[${role}] Skip — key address ${wallet.address} != fleet ${expectedAddr}`);
    return null;
  }

  const name = `AETHON ${role}`;
  const description = `AETHON v3 ${role} worker — Somnia Agentic L1 fleet agent`;
  const metadata = manifestUri(role);
  const existing = await findExistingByOwner(registry, wallet.address, name);
  if (existing) {
    console.log(`[${role}] Already registered as kit agent #${existing.id} (${existing.name})`);
    return { role, agentId: existing.id, status: "existing" };
  }

  if (dryRun) {
    console.log(`[${role}] Would register ${name} owner=${wallet.address} metadata=${metadata}`);
    return { role, status: "dry-run" };
  }

  const balance = await provider.getBalance(wallet.address);
  if (balance < ethers.parseEther("0.01")) {
    throw new Error(`[${role}] Insufficient STT on ${wallet.address} for kit registration`);
  }

  const reg = new ethers.Contract(KIT_REGISTRY, REGISTRY_ABI, wallet);
  console.log(`[${role}] Registering in Somnia Kit registry...`);
  const tx = await reg.registerAgent(name, description, metadata, capabilities);
  const receipt = await tx.wait();

  let agentId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = reg.interface.parseLog(log);
      if (parsed?.name === "AgentRegistered") {
        agentId = parsed.args.agentId.toString();
      }
    } catch {
      // not our event
    }
  }

  console.log(`[${role}] Registered kit agent #${agentId ?? "?"} tx=${receipt.hash}`);
  return { role, agentId, status: "registered", txHash: receipt.hash };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const roleFilter = args.find((a) => a.startsWith("--role="))?.split("=")[1]
    ?? (args.includes("--role") ? args[args.indexOf("--role") + 1] : null);

  const provider = new ethers.JsonRpcProvider(RPC);
  const registry = new ethers.Contract(KIT_REGISTRY, REGISTRY_ABI, provider);

  const total = await registry.getTotalAgents();
  console.log("Somnia Kit registry:", KIT_REGISTRY);
  console.log("Total kit agents:", total.toString());
  console.log("Dry run:", dryRun);

  const targets = roleFilter
    ? ROLES.filter((r) => r.role === roleFilter.toUpperCase())
    : ROLES;

  if (targets.length === 0) {
    throw new Error(`Unknown role: ${roleFilter}`);
  }

  const results = [];
  for (const spec of targets) {
    results.push(await registerRole(registry, provider, spec, dryRun));
  }

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "somnia-kit-registrations.json");
  const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : { agents: {} };
  for (const r of results.filter(Boolean)) {
    if (r.agentId) prev.agents[r.role] = { agentId: r.agentId, status: r.status, updatedAt: new Date().toISOString() };
  }
  prev.registry = KIT_REGISTRY;
  prev.updatedAt = new Date().toISOString();
  if (!dryRun) fs.writeFileSync(outFile, JSON.stringify(prev, null, 2));

  console.log("\nDone.", dryRun ? "(dry-run — no txs)" : `Wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
