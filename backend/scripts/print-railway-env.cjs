#!/usr/bin/env node
/**
 * Print Railway env vars from the latest deployment JSON (run after deploy:testnet).
 * Usage: node scripts/print-railway-env.cjs
 */
const fs = require("fs");
const path = require("path");

const deploymentPath = path.join(__dirname, "..", "deployments", "somniaTestnet-50312.json");
if (!fs.existsSync(deploymentPath)) {
  console.error("Missing", deploymentPath, "— run npm run deploy:testnet first.");
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const a = deployment.addresses;
const platform = process.env.SOMNIA_AGENTS_PLATFORM_ADDR ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

const vars = {
  REPUTATION_ENGINE_ADDR: a.ReputationEngine,
  CIRCUIT_BREAKER_ADDR: a.CircuitBreaker,
  AGENT_REGISTRY_ADDR: a.AgentRegistry,
  COALITION_MANAGER_ADDR: a.CoalitionManager,
  TASK_MARKET_ADDR: a.TaskMarket,
  ORACLE_RESOLVER_ADDR: a.OracleResolver ?? "",
  SOMNIA_AGENT_CONSUMER_ADDR:
    a.SomniaAgentConsumer ?? deployment.somniaConsumer?.SomniaAgentConsumer ?? "0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353",
  AETHON_FLEET_VAULT_ADDR: a.AethonFleetVault ?? deployment.aethonVault?.AethonFleetVault ?? "",
  SWARM_EXECUTION_ROUTER_ADDR: a.AethonFleetVault ?? "",
  SOMNIA_AGENTS_PLATFORM_ADDR: a.SomniaAgentsPlatform ?? platform,
  SOMNIA_AGENTS_ENABLED: "true",
  SOMNIA_PARSE_WEBSITE_AGENT_ID: "12875401142070969085",
  SOMNIA_JSON_API_AGENT_ID: "13174292974160097713",
  SOMNIA_LLM_AGENT_ID: "12847293847561029384",
  INDEXER_START_BLOCK: String(deployment.deploymentBlock ?? 395765007),
  SOMNIA_WS_URL: "wss://dream-rpc.somnia.network/ws",
  COALITION_TIMEOUT_MS: "300000",
  ORACLE_RESOLVE_TIMEOUT_MS: "180000",
};

const agentVars = {
  AGENT_REGISTRY_ADDR: a.AgentRegistry,
  TASK_MARKET_ADDR: a.TaskMarket,
  COALITION_MANAGER_ADDR: a.CoalitionManager,
  CIRCUIT_BREAKER_ADDR: a.CircuitBreaker,
  REPUTATION_ENGINE_ADDR: a.ReputationEngine,
  SOMNIA_RPC_URL: "https://dream-rpc.somnia.network",
  SOMNIA_CHAIN_ID: "50312",
};

console.log("\n=== Railway API service — paste into Variables ===\n");
for (const [k, v] of Object.entries(vars)) {
  console.log(`${k}=${v}`);
}
console.log("\n=== Railway agent workers (all 5 services) — paste into Variables ===\n");
for (const [k, v] of Object.entries(agentVars)) {
  console.log(`${k}=${v}`);
}
console.log("\nDeployed at:", deployment.deployedAt);
console.log("Explorer TaskMarket:", `https://shannon-explorer.somnia.network/address/${a.TaskMarket}`);
if (a.OracleResolver) {
  console.log("Explorer OracleResolver:", `https://shannon-explorer.somnia.network/address/${a.OracleResolver}`);
}
console.log("");
