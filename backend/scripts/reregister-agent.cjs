#!/usr/bin/env node
/**
 * Re-register an agent wallet with the correct on-chain type.
 *
 * Usage:
 *   node scripts/reregister-agent.cjs status --role RISK_MGMT
 *   node scripts/reregister-agent.cjs request-deregister --role RISK_MGMT
 *   node scripts/reregister-agent.cjs complete-deregister --role RISK_MGMT
 *   node scripts/reregister-agent.cjs auto-complete --role RISK_MGMT   # CI / cron — no-op until unlock
 *   node scripts/reregister-agent.cjs wait-and-complete --role RISK_MGMT [--poll-ms 300000]
 *
 * Flow:
 *   1. request-deregister  — starts 24h timelock (AgentRegistry DEREGISTER_DELAY)
 *   2. complete-deregister / auto-complete — after timelock, returns stake
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
];

function stateFilePath(role) {
  return path.join(__dirname, "..", "env", `reregister.${role.toLowerCase()}.json`);
}

function loadRoleEnv(role) {
  const candidates = [
    path.join(__dirname, "..", "env", "agents", `${role.toLowerCase()}.env`),
    role === "RISK_MGMT" ? path.join(__dirname, "..", "env", "agents", "risk_mgmt.env") : null,
  ].filter(Boolean);
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) {
    throw new Error(`Missing env file for ${role} — expected backend/env/agents/${role.toLowerCase()}.env`);
  }
  const vars = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function loadState(role) {
  const file = stateFilePath(role);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveState(role, patch) {
  const file = stateFilePath(role);
  const prev = loadState(role) ?? { role };
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

async function getStatus(registry, address, expectedRole) {
  const a = await registry.agents(address);
  const active = await registry.isAgentActive(address);
  const requestedAt = Number(a.deregisterRequestedAt);
  const unlockAt = requestedAt > 0 ? requestedAt + DEREGISTER_DELAY_SEC : 0;
  const now = Math.floor(Date.now() / 1000);
  const stakeWei = a.stake;
  const agentType = TYPE_NAMES[Number(a.agentType)] ?? String(a.agentType);
  const metadataURI = a.metadataURI;
  return {
    address,
    agentType,
    stake: ethers.formatEther(stakeWei),
    stakeWei: stakeWei.toString(),
    online: a.online,
    active,
    metadataURI,
    deregisterRequestedAt: requestedAt,
    unlockAt,
    unlockAtIso: unlockAt > 0 ? new Date(unlockAt * 1000).toISOString() : null,
    canCompleteDeregister: requestedAt > 0 && now >= unlockAt && stakeWei > 0n,
    canRegisterFresh: requestedAt > 0 && stakeWei === 0n && !a.online,
    secondsUntilUnlock: requestedAt > 0 ? Math.max(0, unlockAt - now) : 0,
    correctlyRegistered:
      expectedRole != null &&
      agentType === expectedRole &&
      a.online &&
      active &&
      metadataURI.includes(`/manifests/${expectedRole}`),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArg(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : fallback;
}

async function runCompleteDeregister(registry, role, before) {
  if (!before.canCompleteDeregister) {
    const hrs = Math.ceil(before.secondsUntilUnlock / 3600);
    return {
      completed: false,
      reason: `Timelock active — ${hrs}h remaining (unlock at ${before.unlockAtIso})`,
    };
  }
  const tx = await registry.completeDeregister({ gasLimit: 500_000n });
  console.log("[tx] completeDeregister", tx.hash);
  const receipt = await tx.wait();
  const after = await getStatus(registry, before.address, role);
  saveState(role, {
    status: "stake_returned",
    completeTx: tx.hash,
    completedAt: Math.floor(Date.now() / 1000),
    completedAtIso: new Date().toISOString(),
    onChain: after,
  });
  console.log("[done] Stake returned. Redeploy Railway worker — it will register as", role);
  console.log(JSON.stringify(after, null, 2));
  return { completed: true, tx: tx.hash, receipt, after };
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const role = parseArg(args, "--role", process.env.AGENT_TYPE);
  if (!role || !ROLES.includes(role)) {
    console.error(
      "Usage: node scripts/reregister-agent.cjs <status|request-deregister|complete-deregister|auto-complete|wait-and-complete> --role RISK_MGMT",
    );
    process.exit(1);
  }

  const env = loadRoleEnv(role);
  const pk = process.env.AGENT_PRIVATE_KEY ?? env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY not set (env file or AGENT_PRIVATE_KEY env var)");

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet);

  let before = await getStatus(registry, wallet.address, role);
  console.log("[status]", JSON.stringify(before, null, 2));

  if (cmd === "status") {
    const state = loadState(role);
    if (state) console.log("[state-file]", JSON.stringify(state, null, 2));
    return;
  }

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
    before = await getStatus(registry, wallet.address, role);
    saveState(role, {
      role,
      wallet: wallet.address,
      previousOnChainType: before.agentType,
      targetOnChainType: role,
      requestTx: tx.hash,
      requestedAt: before.deregisterRequestedAt,
      unlockAt: before.unlockAt,
      unlockAtIso: before.unlockAtIso,
      status: "pending_timelock",
      expectedManifest: env.API_PUBLIC_URL
        ? `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/v1/agents/manifests/${role}`
        : null,
    });
    console.log("[done] Deregister requested. Wait 24h then run auto-complete or complete-deregister.");
    console.log(JSON.stringify(before, null, 2));
    return;
  }

  if (cmd === "complete-deregister") {
    const result = await runCompleteDeregister(registry, role, before);
    if (!result.completed) throw new Error(result.reason);
    return;
  }

  if (cmd === "auto-complete") {
    if (before.stakeWei === "0" && before.deregisterRequestedAt > 0) {
      console.log("[auto-complete] Stake already returned — redeploy Railway worker to register as", role);
      saveState(role, { status: "stake_returned", onChain: before });
      return;
    }
    if (before.correctlyRegistered) {
      console.log("[auto-complete] Already registered correctly as", role);
      saveState(role, { status: "registered", onChain: before });
      return;
    }
    const result = await runCompleteDeregister(registry, role, before);
    if (!result.completed) {
      console.log(`[auto-complete] ${result.reason}`);
      process.exit(0);
    }
    return;
  }

  if (cmd === "wait-and-complete") {
    const pollMs = Number(parseArg(args, "--poll-ms", "300000"));
    while (true) {
      before = await getStatus(registry, wallet.address, role);
      if (before.stakeWei === "0" && before.deregisterRequestedAt > 0) {
        console.log("[wait-and-complete] Stake already returned.");
        return;
      }
      if (before.canCompleteDeregister) {
        await runCompleteDeregister(registry, role, before);
        return;
      }
      const mins = Math.ceil(before.secondsUntilUnlock / 60);
      console.log(`[wait-and-complete] ${mins}m until unlock (${before.unlockAtIso}) — sleeping ${pollMs}ms`);
      await sleep(pollMs);
    }
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
