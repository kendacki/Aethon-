#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const REGISTRY_ADDR = process.env.AGENT_REGISTRY_ADDR ?? "0x3EBB7D7343Ed74f34906f970e373F35d963cb797";
const API_PUBLIC = process.env.API_PUBLIC_URL ?? "https://aethon-production-3f5a.up.railway.app";

const REGISTRY_ABI = [
  "function register(uint8 agentType, string metadataURI) payable",
  "function heartbeat() external",
  "function isAgentActive(address) view returns (bool)",
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
];

const ROLES = [
  { role: "ARBITRAGE", file: "arbitrage.env", index: 0 },
  { role: "ORACLE", file: "oracle.env", index: 1 },
  { role: "YIELD_OPT", file: "yield_opt.env", index: 2 },
  { role: "GOVERNANCE", file: "governance.env", index: 3 },
  { role: "RISK_MGMT", file: "risk_mgmt.env", index: 4 },
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  console.log("Registry:", REGISTRY_ADDR);
  console.log("RPC:", RPC);

  for (const { role, file, index } of ROLES) {
    const envPath = path.join(__dirname, "..", "env", "agents", file);
    if (!fs.existsSync(envPath)) {
      console.warn(`[${role}] Skip — missing ${envPath}`);
      continue;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const pk = envContent.match(/^AGENT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
    if (!pk) {
      console.warn(`[${role}] Skip — no AGENT_PRIVATE_KEY in ${envPath}`);
      continue;
    }

    const wallet = new ethers.Wallet(pk, provider);
    const registry = new ethers.Contract(REGISTRY_ADDR, REGISTRY_ABI, wallet);

    console.log(`\n[${role}] Checking registration for ${wallet.address}...`);

    let active = false;
    try {
      active = await registry.isAgentActive(wallet.address);
    } catch (e) {
      console.error(`[${role}] Failed to check active status:`, e.message);
    }

    const metadataURI = `${API_PUBLIC.replace(/\/+$/, "")}/v1/agents/manifests/${role}`;

    if (!active) {
      const record = await registry.agents(wallet.address);
      const stake = record.stake;

      if (stake === 0n) {
        console.log(`[${role}] Registering with stake 0.5 STT...`);
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        const tx = await registry.register(index, metadataURI, {
          value: ethers.parseEther("0.5"),
          gasLimit: 5000000,
          nonce,
        });
        console.log(`[${role}] Register tx sent: ${tx.hash}`);
        await tx.wait();
        console.log(`[${role}] Registered successfully.`);
      } else {
        console.log(`[${role}] Already has stake, sending heartbeat to mark online...`);
      }

      console.log(`[${role}] Sending heartbeat...`);
      const nonce = await provider.getTransactionCount(wallet.address, "pending");
      const hbTx = await registry.heartbeat({ gasLimit: 200000, nonce });
      await hbTx.wait();
      console.log(`[${role}] Heartbeat completed.`);
    } else {
      console.log(`[${role}] Already active and online.`);
    }
  }

  console.log("\nDone registering agents!");
}

main().catch(console.error);
