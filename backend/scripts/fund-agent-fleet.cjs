#!/usr/bin/env node
/**
 * Send STT from FUND_PK or DEPLOYER_PK to fleet wallets.
 *
 * Usage:
 *   FUND_PK=0x... node scripts/fund-agent-fleet.cjs 3
 *   node scripts/fund-agent-fleet.cjs 3 --top-up        # only send if below target
 *   node scripts/fund-agent-fleet.cjs 1 --include-deployer
 */
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const amountStt = args.find((a) => !a.startsWith("-")) ?? "3";
const topUpOnly = args.includes("--top-up");
const includeDeployer = args.includes("--include-deployer");
const amountWei = ethers.parseEther(amountStt);

const pk = process.env.FUND_PK ?? process.env.DEPLOYER_PK;
const rpc = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";

if (!pk) {
  console.error("Set FUND_PK or DEPLOYER_PK in environment.");
  process.exit(1);
}

const fleetPath = path.join(__dirname, "..", "env", "fleet.addresses.json");
const fleet = JSON.parse(fs.readFileSync(fleetPath, "utf8"));
const recipients = Object.entries(fleet.agents);

if (includeDeployer) {
  const deployerAddr =
    process.env.DEPLOYER_ADDR ?? fleet.relayer?.address ?? "0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6";
  recipients.unshift(["DEPLOYER", deployerAddr]);
}

(async () => {
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`\nSender:  ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} STT`);
  console.log(`Mode:    ${topUpOnly ? "top-up to" : "send"} ${amountStt} STT\n`);

  let totalSend = 0n;
  const plan = [];
  for (const [role, address] of recipients) {
    const current = await provider.getBalance(address);
    let send = amountWei;
    if (topUpOnly) {
      if (current >= amountWei) {
        plan.push({ role, address, send: 0n, skip: true, current });
        continue;
      }
      send = amountWei - current;
    }
    plan.push({ role, address, send, skip: false, current });
    totalSend += send;
  }

  if (balance < totalSend + ethers.parseEther("0.05")) {
    console.error(
      `Insufficient balance (need ~${ethers.formatEther(totalSend)} STT + gas, have ${ethers.formatEther(balance)}).`
    );
    process.exit(1);
  }

  for (const item of plan) {
    if (item.skip) {
      console.log(`${item.role}: skip (already ${ethers.formatEther(item.current)} STT)`);
      continue;
    }
    const tx = await wallet.sendTransaction({ to: item.address, value: item.send });
    console.log(`${item.role}: ${tx.hash}`);
    await tx.wait();
    const after = await provider.getBalance(item.address);
    console.log(`  → ${ethers.formatEther(after)} STT`);
  }
  console.log("\nDone.\n");
})().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
