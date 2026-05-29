#!/usr/bin/env node
/**
 * Verify Somnia integration: consumer contract, platform link, kit registry, env config.
 * Usage: node scripts/verify-somnia-integration.cjs
 */
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

const RPC = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";
const PLATFORM = process.env.SOMNIA_AGENTS_PLATFORM_ADDR ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";
const CONSUMER =
  process.env.SOMNIA_AGENT_CONSUMER_ADDR ??
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "somnia-consumer-somniaTestnet.json"), "utf8")
  ).SomniaAgentConsumer;
const KIT_REGISTRY = process.env.SOMNIA_KIT_REGISTRY_ADDR ?? "0xC9f3452090EEB519467DEa4a390976D38C008347";

const fleet = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "env", "fleet.addresses.json"), "utf8")
);

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const checks = [];

  const code = await provider.getCode(CONSUMER);
  checks.push({
    name: "SomniaAgentConsumer deployed",
    ok: code.length > 2,
    detail: CONSUMER,
  });

  const consumer = new ethers.Contract(
    CONSUMER,
    ["function platform() view returns (address)"],
    provider
  );
  const linked = (await consumer.platform()).toLowerCase();
  checks.push({
    name: "Consumer linked to platform",
    ok: linked === PLATFORM.toLowerCase(),
    detail: linked,
  });

  const reg = new ethers.Contract(
    KIT_REGISTRY,
    [
      "function getTotalAgents() view returns (uint256)",
      "function agents(uint256) view returns (string name, string description, string ipfsMetadata, address owner, bool isActive, uint256 registeredAt, uint256 lastUpdated, uint256 executionCount)",
    ],
    provider
  );

  const total = Number(await reg.getTotalAgents());
  const kitAgents = {};
  for (let i = 1; i <= total; i++) {
    const a = await reg.agents(i);
    if (String(a.name).startsWith("AETHON")) {
      const role = a.name.replace("AETHON ", "");
      kitAgents[role] = { id: String(i), owner: a.owner, active: a.isActive };
    }
  }

  for (const role of Object.keys(fleet.agents)) {
    const expected = fleet.agents[role].toLowerCase();
    const found = kitAgents[role];
    checks.push({
      name: `Kit registry: ${role}`,
      ok: Boolean(found && found.owner.toLowerCase() === expected),
      detail: found ? `#${found.id} owner=${found.owner}` : "not found",
    });
  }

  checks.push({
    name: "SOMNIA_AGENTS_ENABLED",
    ok: process.env.SOMNIA_AGENTS_ENABLED === "true",
    detail: process.env.SOMNIA_AGENTS_ENABLED ?? "(unset)",
  });

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

  if (vaultAddr) {
    const vaultCode = await provider.getCode(vaultAddr);
    checks.push({
      name: "AethonFleetVault deployed",
      ok: vaultCode.length > 2,
      detail: vaultAddr,
    });

    const vault = new ethers.Contract(
      vaultAddr,
      ["function isVaultActive(address) view returns (bool)", "function getNativeBalance(address) view returns (uint256)"],
      provider
    );

    for (const role of Object.keys(fleet.agents)) {
      const addr = fleet.agents[role];
      const active = await vault.isVaultActive(addr);
      const bal = active ? await vault.getNativeBalance(addr) : 0n;
      checks.push({
        name: `Fleet vault: ${role}`,
        ok: active,
        detail: active ? `${ethers.formatEther(bal)} STT reserved` : "vault not created",
      });
    }
  } else if (process.env.SOMNIA_VAULT_ENABLED === "true") {
    checks.push({
      name: "AethonFleetVault configured",
      ok: false,
      detail: "SOMNIA_VAULT_ENABLED but AETHON_FLEET_VAULT_ADDR unset",
    });
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (!c.ok) failed++;
    console.log(`${mark}  ${c.name} — ${c.detail}`);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll Somnia integration checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
