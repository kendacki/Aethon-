#!/usr/bin/env node
/**
 * Print Railway env blocks for all 5 agents (reads gitignored env/agents/*.env).
 * Output: env/railway-setup.local.txt (gitignored) — paste into Railway dashboard.
 */
const fs = require("fs");
const path = require("path");

const ROLES = [
  { role: "ARBITRAGE", file: "arbitrage.env", service: "aethon-agent-arbitrage" },
  { role: "ORACLE", file: "oracle.env", service: "aethon-agent-oracle" },
  { role: "YIELD_OPT", file: "yield_opt.env", service: "aethon-agent-yield" },
  { role: "GOVERNANCE", file: "governance.env", service: "aethon-agent-governance" },
  { role: "RISK_MGMT", file: "risk_mgmt.env", service: "aethon-agent-risk" },
];

const agentsDir = path.join(__dirname, "..", "env", "agents");
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

let out = `# AETHON Railway Agent Setup — generated ${new Date().toISOString()}\n`;
out += `# GITIGNORED — contains private keys. Delete after pasting into Railway.\n\n`;
out += `API service URL: ${shared.API_PUBLIC_URL}\n\n`;
out += `=== FOR EACH AGENT SERVICE ===\n`;
out += `1. Railway → your project → New Service → GitHub Repo (same Aethon repo)\n`;
out += `2. Settings → Root Directory → backend\n`;
out += `3. Settings → Deploy → Start Command → npm run start:agent\n`;
out += `4. Variables → paste block below for that role\n`;
out += `5. Deploy\n\n`;

for (const { role, file, service } of ROLES) {
  const envPath = path.join(agentsDir, file);
  if (!fs.existsSync(envPath)) {
    console.error(`Missing ${envPath} — run node scripts/generate-agent-keys.cjs first`);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8");
  const pkMatch = lines.match(/^AGENT_PRIVATE_KEY=(.+)$/m);
  const pk = pkMatch?.[1]?.trim();
  if (!pk) {
    console.error(`No AGENT_PRIVATE_KEY in ${envPath}`);
    process.exit(1);
  }

  out += `${"=".repeat(60)}\n`;
  out += `SERVICE NAME: ${service}\n`;
  out += `AGENT_TYPE=${role}\n`;
  out += `${"=".repeat(60)}\n`;
  out += `AGENT_TYPE=${role}\n`;
  out += `AGENT_PRIVATE_KEY=${pk}\n`;
  for (const [k, v] of Object.entries(shared)) {
    out += `${k}=${v}\n`;
  }
  out += `\n`;
}

const outPath = path.join(__dirname, "..", "env", "railway-setup.local.txt");
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath}`);
console.log("Open that file and paste each block into Railway → Variables for each agent service.");
