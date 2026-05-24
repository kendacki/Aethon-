#!/usr/bin/env node
/**
 * Send STT from FUND_PK (env only — never commit) to agent wallets.
 * Usage: FUND_PK=0x... node scripts/fund-agent-fleet.cjs [amountStt]
 */
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const amountStt = process.argv[2] ?? "5";
const amountWei = ethers.parseEther(amountStt);
const pk = process.env.FUND_PK;
const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";

if (!pk) {
  console.error("Set FUND_PK in environment for this run only (do not save to .env).");
  process.exit(1);
}

const fleetPath = path.join(__dirname, "..", "env", "fleet.addresses.json");
const fleet = JSON.parse(fs.readFileSync(fleetPath, "utf8"));
const recipients = Object.entries(fleet.agents);

(async () => {
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const balance = await provider.getBalance(wallet.address);
  const totalNeeded = amountWei * BigInt(recipients.length);

  console.log(`\nSender:  ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} STT`);
  console.log(`Sending: ${amountStt} STT × ${recipients.length}\n`);

  if (balance < totalNeeded + ethers.parseEther("0.01")) {
    console.error(`Insufficient balance (need ~${ethers.formatEther(totalNeeded)} STT + gas).`);
    process.exit(1);
  }

  for (const [role, address] of recipients) {
    const tx = await wallet.sendTransaction({ to: address, value: amountWei });
    console.log(`${role}: ${tx.hash}`);
    await tx.wait();
    const after = await provider.getBalance(address);
    console.log(`  → ${ethers.formatEther(after)} STT`);
  }
  console.log("\nDone.\n");
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
