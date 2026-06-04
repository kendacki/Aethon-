/**
 * One-off: wire CoalitionManager on an existing AgentRegistry (required for reward → stake).
 * Run from backend/: node scripts/set-coalition-manager.cjs
 */
const { ethers } = require("ethers");
require("dotenv").config();

const REGISTRY_ABI = [
  "function coalitionManager() view returns (address)",
  "function setCoalitionManager(address manager)",
];

async function main() {
  const registryAddr = process.env.AGENT_REGISTRY_ADDR;
  const coalMgrAddr = process.env.COALITION_MANAGER_ADDR;
  const pk = process.env.DEPLOYER_PK ?? process.env.SLASH_MULTISIG_PK;
  if (!registryAddr || !coalMgrAddr || !pk) {
    throw new Error("Set AGENT_REGISTRY_ADDR, COALITION_MANAGER_ADDR, and DEPLOYER_PK (slash multisig)");
  }
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network");
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, wallet);
  const current = await registry.coalitionManager();
  if (current && current !== ethers.ZeroAddress) {
    console.log("Coalition manager already set:", current);
    return;
  }
  const tx = await registry.setCoalitionManager(coalMgrAddr);
  await tx.wait();
  console.log("setCoalitionManager OK:", coalMgrAddr, "tx", tx.hash);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
