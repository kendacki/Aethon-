#!/usr/bin/env node
/**
 * Create AETHON fleet vaults and optional seed deposits.
 * Usage: node scripts/setup-agent-vaults.cjs [--seed 0.5]
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const fleet = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "env", "fleet.addresses.json"), "utf8")
);

const vaultAddr =
  process.env.AETHON_FLEET_VAULT_ADDR ??
  (() => {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(__dirname, "..", "deployments", "aethon-vault-somniaTestnet.json"), "utf8")
      ).AethonFleetVault;
    } catch {
      return null;
    }
  })();

const VAULT_ABI = [
  "function createVault(address agent, uint256 dailyLimit)",
  "function depositNative(address agent) payable",
  "function isVaultActive(address agent) view returns (bool)",
  "function getNativeBalance(address agent) view returns (uint256)",
  "event VaultCreated(address indexed agent, uint256 dailyLimit)",
];

async function main() {
  const args = process.argv.slice(2);
  const seedIdx = args.indexOf("--seed");
  const seedStt = seedIdx >= 0 ? args[seedIdx + 1] ?? "0.5" : null;

  if (!vaultAddr) throw new Error("AETHON_FLEET_VAULT_ADDR not set. Run npm run deploy:aethon-vault first.");

  const pk = process.env.DEPLOYER_PK?.trim();
  if (!pk) throw new Error("DEPLOYER_PK required");

  const provider = new ethers.JsonRpcProvider(RPC);
  const deployer = new ethers.Wallet(pk, provider);
  const vault = new ethers.Contract(vaultAddr, VAULT_ABI, deployer);
  const dailyLimit = ethers.parseEther(process.env.SOMNIA_VAULT_DAILY_LIMIT_STT ?? "10");

  console.log("Vault:", vaultAddr);
  console.log("Daily limit:", ethers.formatEther(dailyLimit), "STT");
  if (seedStt) console.log("Seed deposit:", seedStt, "STT per agent\n");

  const results = {};
  for (const [role, address] of Object.entries(fleet.agents)) {
    const active = await vault.isVaultActive(address);
    if (!active) {
      console.log(`[${role}] Creating vault...`);
      const tx = await vault.createVault(address, dailyLimit);
      await tx.wait();
    } else {
      console.log(`[${role}] Vault already active`);
    }

    if (seedStt) {
      const amount = ethers.parseEther(seedStt);
      const tx = await vault.depositNative(address, { value: amount });
      console.log(`[${role}] Deposited ${seedStt} STT — ${tx.hash}`);
      await tx.wait();
    }

    const bal = await vault.getNativeBalance(address);
    results[role] = {
      address,
      balanceStt: ethers.formatEther(bal),
      active: true,
    };
    console.log(`[${role}] Vault balance: ${ethers.formatEther(bal)} STT\n`);
  }

  const outFile = path.join(__dirname, "..", "deployments", "aethon-vault-setup.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify({ vault: vaultAddr, dailyLimitStt: "10", agents: results, updatedAt: new Date().toISOString() }, null, 2)
  );
  console.log("Wrote", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
