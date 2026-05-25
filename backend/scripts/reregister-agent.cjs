#!/usr/bin/env node
/**
 * Re-register an agent wallet with the correct on-chain type.
 *
 * Usage:
 *   node scripts/reregister-agent.cjs request-deregister --role RISK_MGMT
 *   node scripts/reregister-agent.cjs complete-deregister --role RISK_MGMT
 *   node scripts/reregister-agent.cjs status --role RISK_MGMT
 *
 * Flow:
 *   1. request-deregister  — starts 24h timelock (AgentRegistry DEREGISTER_DELAY)
 *   2. complete-deregister — after timelock, returns stake
 *   3. Redeploy Railway worker — AgentCore.register() runs with correct AGENT_TYPE
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const TYPE_NAMES = ROLES;
const REGISTRY = process.env.AGENT_REGISTRY_ADDR ?? "0xA2BAdcce7612cC5729B6df596c660A738b94b60e";
const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const DEREGISTER_DELAY_SEC = 24 * 60 * 60;

const REGISTRY_ABI = [
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
  "function isAgentActive(address) view returns (bool)",
  "function getAgentStake(address) view returns (uint256)",
  "function requestDeregister() external",
  "function completeDeregister() external",
  "function register(uint8 agentType, string metadataURI) payable",
];

function loadRoleEnv(role) {
  const file = path.join(__dirname, "..", "env", "agents", `${role.toLowerCase()}.env`);
  const alt = role === "RISK_MGMT" ? path.join(__dirname, "..", "env", "agents", "risk_mgmt.env") : file;
  const envPath = fs.existsSync(alt) ? alt : file;
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing env file: ${envPath}`);
  }
  const vars = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

async function getStatus(registry, address) {
  const a = await registry.agents(address);
  const active = await registry.isAgentActive(address);
  const requestedAt = Number(a.deregisterRequestedAt);
  const unlockAt = requestedAt > 0 ? requestedAt + DEREGISTER_DELAY_SEC : 0;
  const now = Math.floor(Date.now() / 1000);
  return {
    address,
    agentType: TYPE_NAMES[Number(a.agentType)] ?? String(a.agentType),
    stake: ethers.formatEther(a.stake),
    online: a.online,
    active,
    metadataURI: a.metadataURI,
    deregisterRequestedAt: requestedAt,
    unlockAt,
    canCompleteDeregister: requestedAt > 0 && now >= unlockAt,
    secondsUntilUnlock: requestedAt > 0 ? Math.max(0, unlockAt - now) : 0,
  };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const roleIdx = rest.indexOf("--role");
  const role = roleIdx >= 0 ? rest[roleIdx + 1] : process.env.AGENT_TYPE;
  if (!role || !ROLES.includes(role)) {
    console.error("Usage: node scripts/reregister-agent.cjs <request-deregister|complete-deregister|status> --role RISK_MGMT");
    process.exit(1);
  }

  const env = loadRoleEnv(role);
  const pk = process.env.AGENT_PRIVATE_KEY ?? env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet);

  const before = await getStatus(registry, wallet.address);
  console.log("[before]", JSON.stringify(before, null, 2));

  if (cmd === "status") return;

  if (cmd === "request-deregister") {
    if (before.deregisterRequestedAt > 0) {
      console.log("Deregister already requested.");
      return;
    }
    if (Number(before.stake) === 0 && !before.online) {
      console.log("Wallet not registered — redeploy Railway worker to register.");
      return;
    }
    const tx = await registry.requestDeregister({ gasLimit: 500_000n });
    console.log("[tx] requestDeregister", tx.hash);
    await tx.wait();
    console.log("[done] Deregister requested. Wait 24h then run complete-deregister.");
    console.log(JSON.stringify(await getStatus(registry, wallet.address), null, 2));
    return;
  }

  if (cmd === "complete-deregister") {
    if (!before.canCompleteDeregister) {
      const hrs = Math.ceil(before.secondsUntilUnlock / 3600);
      throw new Error(`Timelock active — ${hrs}h remaining (unlock at ${new Date(before.unlockAt * 1000).toISOString()})`);
    }
    const tx = await registry.completeDeregister({ gasLimit: 500_000n });
    console.log("[tx] completeDeregister", tx.hash);
    await tx.wait();
    console.log("[done] Stake returned. Redeploy Railway worker — it will register as", role);
    console.log(JSON.stringify(await getStatus(registry, wallet.address), null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
