#!/usr/bin/env node
/**
 * Post-deploy demo seeder: register 5 agents + submit one ORACLE task on-chain.
 * Prereqs: npm run deploy:testnet, Railway env updated, env/agents/*.env funded (≥0.6 STT each).
 *
 * Usage:
 *   node scripts/judge-demo.cjs
 *   node scripts/judge-demo.cjs --register-only
 *   node scripts/judge-demo.cjs --oracle-only
 */
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const ROLES = [
  { role: "ARBITRAGE", type: 0 },
  { role: "ORACLE", type: 1 },
  { role: "YIELD_OPT", type: 2 },
  { role: "GOVERNANCE", type: 3 },
  { role: "RISK_MGMT", type: 4 },
];

const REGISTRY_ABI = [
  "function register(uint8 agentType, string metadataURI) payable",
  "function isAgentActive(address) view returns (bool)",
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function heartbeat() external",
];

const MARKET_ABI = [
  "function submitOracleTask(bytes32 hash, uint256 complexity, string coinId) payable returns (uint256)",
  "function taskCounter() view returns (uint256)",
];

function loadAgentKey(role) {
  const envPath = path.join(__dirname, "..", "env", "agents", `${role.toLowerCase()}.env`);
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, "utf8");
  const m = text.match(/^AGENT_PRIVATE_KEY=(.+)$/m);
  return m ? m[1].trim() : null;
}

async function registerFleet(provider, registryAddr, apiPublic) {
  const txs = [];
  for (const { role, type } of ROLES) {
    const pk = loadAgentKey(role);
    if (!pk) {
      console.warn(`[skip] No env/agents/${role.toLowerCase()}.env — run generate-agent-keys.cjs`);
      continue;
    }
    const wallet = new ethers.Wallet(pk, provider);
    const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, wallet);
    const active = await registry.isAgentActive(wallet.address);
    if (active) {
      console.log(`[ok] ${role} already active: ${wallet.address}`);
      continue;
    }
    const record = await registry.agents(wallet.address);
    const meta = `${apiPublic.replace(/\/+$/, "")}/v1/agents/manifests/${role}`;
    if (record.stake === 0n) {
      const tx = await registry.register(type, meta, {
        value: ethers.parseEther("0.5"),
        gasLimit: 5000000n,
      });
      await tx.wait();
      console.log(`[registered] ${role} ${wallet.address} tx=${tx.hash}`);
      txs.push({ role, tx: tx.hash, address: wallet.address });
    } else {
      console.log(`[heartbeat] ${role} stake present, refreshing TTL: ${wallet.address}`);
    }
    const hbTx = await registry.heartbeat({ gasLimit: 200000n });
    await hbTx.wait();
    console.log(`[active] ${role} heartbeat ok`);
  }
  return txs;
}

async function submitOracleTask(provider, marketAddr, coinId = "bitcoin") {
  const pk =
    process.env.RELAYER_PRIVATE_KEY ??
    process.env.DEPLOYER_PK ??
    loadAgentKey("ORACLE");
  if (!pk) throw new Error("Need RELAYER_PRIVATE_KEY, DEPLOYER_PK, or oracle agent key");

  const wallet = new ethers.Wallet(pk, provider);
  const market = new ethers.Contract(marketAddr, MARKET_ABI, wallet);
  const payload = {
    version: 1,
    primaryRole: "ORACLE",
    action: "fetch_price",
    params: { asset: coinId, currency: "usd", maxStalenessSec: 120 },
    label: "Oracle price attestation",
    oracle: true
  };
  const canonical = JSON.stringify({
    version: 1,
    primaryRole: "ORACLE",
    action: "fetch_price",
    params: { asset: coinId, currency: "usd", maxStalenessSec: 120 },
    label: "Oracle price attestation",
    oracle: true
  });
  const taskHash = ethers.keccak256(ethers.toUtf8Bytes(canonical));

  try {
    const { repo } = require("../dist/db/repository.js");
    await repo.saveTaskPayload(taskHash, payload);
    console.log(`[local-db] Saved task payload for hash: ${taskHash}`);
  } catch (err) {
    console.warn("[local-db] Could not save payload directly to DB:", err.message);
  }

  const reward = ethers.parseEther("0.05");

  const tx = await market.submitOracleTask(taskHash, 1, coinId, {
    value: reward,
    gasLimit: 5000000n,
  });
  const receipt = await tx.wait();
  const taskId = Number(await market.taskCounter());
  console.log(`[oracle-task] taskId=${taskId} coinId=${coinId}`);
  console.log(`  submitOracleTask tx: ${receipt.hash}`);
  console.log(`  explorer: https://shannon-explorer.somnia.network/tx/${receipt.hash}`);
  console.log(`  poll: curl -s $API/v1/tasks/${taskId}/oracle`);
  return { taskId, txHash: receipt.hash };
}

async function main() {
  const registerOnly = process.argv.includes("--register-only");
  const oracleOnly = process.argv.includes("--oracle-only");

  const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
  const registryAddr = process.env.AGENT_REGISTRY_ADDR;
  const marketAddr = process.env.TASK_MARKET_ADDR;
  const apiPublic = process.env.API_PUBLIC_URL ?? "https://aethon-production-3f5a.up.railway.app";

  if (!registryAddr || !marketAddr) {
    console.error("Set AGENT_REGISTRY_ADDR and TASK_MARKET_ADDR in backend/.env (deploy:testnet writes these).");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  console.log("\nAETHON judge-demo seeder\n");
  console.log("Registry:", registryAddr);
  console.log("TaskMarket:", marketAddr);
  console.log("OracleResolver:", process.env.ORACLE_RESOLVER_ADDR ?? "(not set)\n");

  if (!oracleOnly) {
    await registerFleet(provider, registryAddr, apiPublic);
  }

  if (!registerOnly) {
    await submitOracleTask(provider, marketAddr, process.env.JUDGE_DEMO_COIN_ID ?? "bitcoin");
  }

  console.log("\nNext: assign coalition from ORACLE agent worker, wait for Somnia callback, then:");
  console.log("  https://agents.testnet.somnia.network/receipts/<requestId>\n");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
