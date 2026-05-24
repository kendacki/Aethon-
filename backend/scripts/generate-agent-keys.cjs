#!/usr/bin/env node
/**
 * Generate 5 agent wallets for the AETHON fleet.
 * Run: node scripts/generate-agent-keys.cjs
 *
 * INPUT REQUIRED: Fund each address from https://testnet.somnia.network/
 * Then paste private keys into backend/env/agents/*.env (never commit real keys).
 */
const { Wallet } = require("ethers");
const fs = require("fs");
const path = require("path");

const ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const outDir = path.join(__dirname, "..", "env", "agents");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log("\nAETHON — 5-agent fleet key generation\n");
console.log("Fund each address on Somnia testnet, then copy keys into Railway/Docker env.\n");

const summary = [];

for (const role of ROLES) {
  const wallet = Wallet.createRandom();
  const envContent = `# ${role} agent — DO NOT COMMIT WITH REAL FUNDS ON MAINNET
AGENT_TYPE=${role}
AGENT_PRIVATE_KEY=${wallet.privateKey}
AGENT_STAKE_WEI=500000000000000000
REACTIVITY_ENABLED=true
`;

  const examplePath = path.join(outDir, `${role.toLowerCase()}.env.example`);
  fs.writeFileSync(examplePath, envContent);
  summary.push({ role, address: wallet.address, examplePath });
  console.log(`${role}`);
  console.log(`  Address:     ${wallet.address}`);
  console.log(`  Private key: ${wallet.privateKey}`);
  console.log(`  Template:    ${examplePath}\n`);
}

console.log("--- Next steps ---");
console.log("1. Fund all 5 addresses with Somnia testnet STT (≥0.6 STT each recommended)");
console.log("2. Set AGENT_PRIVATE_KEY per role in Railway services or docker-compose");
console.log("3. Set API_BASE_URL to your backend (e.g. http://api:3001/v1 for Docker)");
console.log("4. Set API_PUBLIC_URL to public URL for manifest URIs on-chain");
console.log("5. Run: docker compose --profile agents up -d\n");
