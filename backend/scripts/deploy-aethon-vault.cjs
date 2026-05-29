const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function patchEnv(vaultAddr) {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, "utf8");
  const set = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content) ? content.replace(re, `${key}=${value}`) : `${content}\n${key}=${value}`;
  };
  set("AETHON_FLEET_VAULT_ADDR", vaultAddr);
  set("SOMNIA_VAULT_ENABLED", "true");
  fs.writeFileSync(envPath, content);
}

function mergeDeployment(networkName, chainId, vaultAddr, deployer) {
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: networkName,
    chainId,
    AethonFleetVault: vaultAddr,
    deployer,
    deployedAt: new Date().toISOString(),
    note: "Kit-compatible vault owned by AETHON deployer (shared Kit vault is third-party admin-only).",
  };
  fs.writeFileSync(path.join(outDir, `aethon-vault-${networkName}.json`), JSON.stringify(record, null, 2));

  const mainFile = path.join(outDir, `somniaTestnet-${chainId}.json`);
  if (fs.existsSync(mainFile)) {
    const main = JSON.parse(fs.readFileSync(mainFile, "utf8"));
    main.addresses = main.addresses || {};
    main.addresses.AethonFleetVault = vaultAddr;
    main.aethonVault = record;
    fs.writeFileSync(mainFile, JSON.stringify(main, null, 2));
  }

  const fleetFile = path.join(__dirname, "..", "env", "fleet.addresses.json");
  if (fs.existsSync(fleetFile)) {
    const fleet = JSON.parse(fs.readFileSync(fleetFile, "utf8"));
    fleet.somniaPlatform = fleet.somniaPlatform || {};
    fleet.aethonFleetVault = vaultAddr;
    fs.writeFileSync(fleetFile, JSON.stringify(fleet, null, 2));
  }
}

async function main() {
  const { ethers } = hre;
  const pk = process.env.DEPLOYER_PK?.trim();
  if (!pk) throw new Error("DEPLOYER_PK required");

  const deployer = new ethers.Wallet(pk, ethers.provider);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying AethonFleetVault...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "STT");

  if (balance < ethers.parseEther("0.1") && hre.network.name !== "hardhat") {
    throw new Error("Deployer needs >= 0.1 STT");
  }

  const Vault = await ethers.getContractFactory("AethonFleetVault", deployer);
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  const addr = await vault.getAddress();
  console.log("AethonFleetVault:", addr);

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  mergeDeployment(hre.network.name, chainId, addr, deployer.address);
  patchEnv(addr);
  console.log("Set AETHON_FLEET_VAULT_ADDR + SOMNIA_VAULT_ENABLED in backend/.env");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
