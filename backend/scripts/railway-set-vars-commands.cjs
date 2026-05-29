#!/usr/bin/env node
/**
 * Print Railway CLI commands to set agent variables (run after: railway login).
 * Usage: node scripts/railway-set-vars-commands.cjs
 *
 * Does NOT call Railway — only prints commands for you to run locally.
 */
const fs = require("fs");
const path = require("path");

const ROLES = [
  { role: "ARBITRAGE", file: "arbitrage.env" },
  { role: "ORACLE", file: "oracle.env" },
  { role: "YIELD_OPT", file: "yield_opt.env" },
  { role: "GOVERNANCE", file: "governance.env" },
  { role: "RISK_MGMT", file: "risk_mgmt.env" },
];

const shared = {
  AETHON_RUNTIME: "agent",
  SOMNIA_RPC_URL: "https://dream-rpc.somnia.network",
  SOMNIA_CHAIN_ID: "50312",
  AGENT_REGISTRY_ADDR: "0xA2BAdcce7612cC5729B6df596c660A738b94b60e",
  TASK_MARKET_ADDR: "0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8",
  COALITION_MANAGER_ADDR: "0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B",
  REPUTATION_ENGINE_ADDR: "0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab",
  CIRCUIT_BREAKER_ADDR: "0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0",
  API_BASE_URL: "https://aethon-production-3f5a.up.railway.app/v1",
  API_PUBLIC_URL: "https://aethon-production-3f5a.up.railway.app",
  AGENT_STAKE_WEI: "500000000000000000",
  REACTIVITY_ENABLED: "true",
  MAX_GAS_PER_TX: "5000000",
  MIN_REPUTATION: "50",
  WATCHDOG_INTERVAL_MS: "5000",
  SOMNIA_AGENTS_ENABLED: "true",
  SOMNIA_AGENTS_PLATFORM_ADDR: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776",
  SOMNIA_AGENT_CONSUMER_ADDR: "0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353",
  SOMNIA_JSON_API_AGENT_ID: "13174292974160097713",
  SOMNIA_LLM_AGENT_ID: "12847293847561029384",
  SOMNIA_KIT_REGISTRY_ADDR: "0xC9f3452090EEB519467DEa4a390976D38C008347",
};

const agentsDir = path.join(__dirname, "..", "env", "agents");

console.log("\n=== Railway CLI (after: railway login && railway link) ===\n");
console.log("# Run each block in the correct agent service context:\n");
console.log("#   railway service   # pick the agent service\n");
console.log("#   <paste variables below>\n");
console.log("#   railway up\n");

for (const { role, file } of ROLES) {
  const envPath = path.join(agentsDir, file);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath}`);
    process.exit(1);
  }
  const pk = fs.readFileSync(envPath, "utf8").match(/^AGENT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
  if (!pk) {
    console.error(`No AGENT_PRIVATE_KEY in ${envPath}`);
    process.exit(1);
  }

  console.log(`# --- ${role} ---`);
  console.log(`railway variables set AGENT_TYPE=${role}`);
  console.log(`railway variables set AGENT_PRIVATE_KEY=${pk}`);
  for (const [k, v] of Object.entries(shared)) {
    console.log(`railway variables set ${k}=${v}`);
  }
  console.log("");
}

console.log("=== Or use Railway Dashboard ===");
console.log("Service → Variables → Raw Editor → paste block from env/railway-setup.local.txt\n");
