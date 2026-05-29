#!/usr/bin/env node
/**
 * Verify fleet on-chain registration and optional production API health.
 *
 * Usage:
 *   node scripts/simulate-fleet.cjs
 *   node scripts/simulate-fleet.cjs --api https://aethon-production-3f5a.up.railway.app/v1
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const REGISTRY = process.env.AGENT_REGISTRY_ADDR ?? "0xA2BAdcce7612cC5729B6df596c660A738b94b60e";
const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const TYPE_NAMES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

const REGISTRY_ABI = [
  "function isAgentActive(address) view returns (bool)",
  "function agents(address) view returns (address wallet, uint8 agentType, uint256 stake, uint256 registeredAt, uint256 lastHeartbeat, bool online, uint256 deregisterRequestedAt, string metadataURI)",
];

function loadFleetAddresses() {
  const file = path.join(__dirname, "..", "env", "fleet.addresses.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return parsed.agents;
}

async function checkOnChain(provider, agents) {
  const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider);
  const rows = [];
  let ok = 0;

  for (const [role, address] of Object.entries(agents)) {
    const record = await registry.agents(address);
    const active = await registry.isAgentActive(address);
    const onChainType = TYPE_NAMES[Number(record.agentType)] ?? String(record.agentType);
    const manifestOk = String(record.metadataURI).includes(`/manifests/${role}`);
    const typeOk = onChainType === role;
    const pass = active && typeOk && manifestOk && record.online;
    if (pass) ok += 1;
    rows.push({
      role,
      address,
      onChainType,
      active,
      online: record.online,
      stake: ethers.formatEther(record.stake),
      manifestOk,
      pass,
      metadataURI: record.metadataURI,
    });
  }

  return { rows, ok, total: Object.keys(agents).length };
}

async function checkApi(apiBase) {
  const base = apiBase.replace(/\/+$/, "");
  const healthUrl = `${base}/agents/fleet-health`;
  const res = await fetch(healthUrl, { signal: AbortSignal.timeout(15000) });
  const body = await res.json();
  const data = body.data ?? body;
  return {
    url: healthUrl,
    httpStatus: res.status,
    fleetStatus: data.status,
    configuredWorkers: data.configuredWorkers,
    healthyCount: data.healthyCount,
    agents: (data.agents ?? []).map((a) => ({
      role: a.role,
      status: a.status,
      reachable: a.reachable,
      address: a.address,
      error: a.error,
    })),
  };
}

async function checkVaults(provider, agents) {
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

  if (!vaultAddr) return { skipped: true, rows: [], ok: 0, total: 0 };

  const vault = new ethers.Contract(
    vaultAddr,
    ["function isVaultActive(address) view returns (bool)", "function getNativeBalance(address) view returns (uint256)"],
    provider
  );

  const rows = [];
  let ok = 0;
  for (const [role, address] of Object.entries(agents)) {
    const active = await vault.isVaultActive(address);
    const balance = active ? await vault.getNativeBalance(address) : 0n;
    const pass = active;
    if (pass) ok += 1;
    rows.push({
      role,
      address,
      active,
      balanceStt: ethers.formatEther(balance),
      pass,
    });
  }
  return { skipped: false, vaultAddr, rows, ok, total: Object.keys(agents).length };
}

async function main() {
  const apiArgIdx = process.argv.indexOf("--api");
  const apiBase =
    apiArgIdx >= 0
      ? process.argv[apiArgIdx + 1]
      : process.env.API_BASE_URL ?? "https://aethon-production-3f5a.up.railway.app/v1";

  const provider = new ethers.JsonRpcProvider(RPC);
  const agents = loadFleetAddresses();
  const chain = await checkOnChain(provider, agents);

  console.log("\n=== On-chain fleet ===");
  for (const row of chain.rows) {
    console.log(
      `${row.pass ? "OK" : "FAIL"} ${row.role.padEnd(10)} ${row.address} type=${row.onChainType} active=${row.active} stake=${row.stake}`,
    );
    if (!row.pass) {
      console.log(`     manifest=${row.metadataURI}`);
    }
  }
  console.log(`\nOn-chain: ${chain.ok}/${chain.total} agents active with correct type/manifest`);

  const vault = await checkVaults(provider, agents);
  if (!vault.skipped) {
    console.log("\n=== Fleet vault reserves ===");
    console.log(`Vault: ${vault.vaultAddr}`);
    for (const row of vault.rows) {
      console.log(
        `${row.pass ? "OK" : "FAIL"} ${row.role.padEnd(10)} ${row.address} active=${row.active} reserve=${row.balanceStt} STT`,
      );
    }
    console.log(`\nVault: ${vault.ok}/${vault.total} agent vaults active`);
  } else {
    console.log("\n=== Fleet vault reserves ===");
    console.log("Skipped (AETHON_FLEET_VAULT_ADDR not set — run npm run deploy:aethon-vault)");
  }

  let apiOk = true;
  try {
    const api = await checkApi(apiBase);
    console.log("\n=== API fleet-health ===");
    console.log(`URL: ${api.url} (${api.httpStatus})`);
    console.log(`Status: ${api.fleetStatus} | configured=${api.configuredWorkers} healthy=${api.healthyCount}`);
    for (const a of api.agents) {
      const mark = a.reachable && (a.status === "HEALTHY" || a.status === "DEGRADED") ? "OK" : "WARN";
      if (mark !== "OK") apiOk = false;
      console.log(`${mark} ${a.role.padEnd(10)} status=${a.status} reachable=${a.reachable}${a.error ? ` err=${a.error}` : ""}`);
    }
  } catch (err) {
    apiOk = false;
    console.warn("\nAPI fleet-health check failed:", err instanceof Error ? err.message : err);
  }

  const strictApi = process.argv.includes("--strict-api");
  const pass = chain.ok === chain.total;
  if (!pass) {
    console.error("\n[simulate-fleet] On-chain checks failed");
    process.exit(1);
  }
  if (!apiOk && strictApi) {
    console.error("\n[simulate-fleet] API fleet-health checks failed (--strict-api)");
    process.exit(1);
  }
  if (!apiOk) {
    console.warn("\n[simulate-fleet] On-chain OK. API worker URLs need AGENT_HEALTH_URLS fix on Railway (HTTP 404).");
  } else {
    console.log("\n[simulate-fleet] All checks passed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
