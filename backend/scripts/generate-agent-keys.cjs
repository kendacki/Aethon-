#!/usr/bin/env node
/**
 * Generate 5 agent wallets for the AETHON fleet.
 * Run: node scripts/generate-agent-keys.cjs
 *
 * Writes gitignored backend/env/agents/*.env and env/fleet.generated.json
 * Fund addresses from https://testnet.somnia.network/
 */
const { Wallet } = require("ethers");
const fs = require("fs");
const path = require("path");

const ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const agentsDir = path.join(__dirname, "..", "env", "agents");
const apiPublic = process.env.API_PUBLIC_URL ?? "https://aethon-production-3f5a.up.railway.app";

if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });

console.log("\nAETHON — 5-agent fleet key generation\n");

const fleet = { generatedAt: new Date().toISOString(), agents: {} };

for (const role of ROLES) {
  const wallet = Wallet.createRandom();
  const fileKey = role.toLowerCase();
  const envPath = path.join(agentsDir, `${fileKey}.env`);
  const envContent = `# ${role} agent — gitignored
AGENT_TYPE=${role}
AGENT_PRIVATE_KEY=${wallet.privateKey}
AGENT_STAKE_WEI=500000000000000000
REACTIVITY_ENABLED=true
API_BASE_URL=http://api:3001/v1
API_PUBLIC_URL=${apiPublic}
`;
  fs.writeFileSync(envPath, envContent);
  fleet.agents[role] = { address: wallet.address, envFile: envPath };
  console.log(`${role}`);
  console.log(`  Address:  ${wallet.address}`);
  console.log(`  Env file: ${envPath}\n`);
}

const fleetPath = path.join(__dirname, "..", "env", "fleet.generated.json");
fs.writeFileSync(fleetPath, JSON.stringify(fleet, null, 2));

console.log("--- FUND NOW (before starting agents) ---");
console.log("Faucet: https://testnet.somnia.network/");
console.log("Send ≥0.6 STT to EACH address above, plus fund relayer/deployer for task rewards.\n");
console.log(`Fleet record: ${fleetPath}`);
console.log("Then: docker compose --profile agents up -d\n");
