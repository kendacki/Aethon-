const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function updateEnv(addresses, deployerAddress) {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  let content = fs.readFileSync(envPath, "utf8");
  const set = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content) ? content.replace(re, `${key}=${value}`) : `${content}\n${key}=${value}`;
  };

  set("REPUTATION_ENGINE_ADDR", addresses.ReputationEngine);
  set("CIRCUIT_BREAKER_ADDR", addresses.CircuitBreaker);
  set("AGENT_REGISTRY_ADDR", addresses.AgentRegistry);
  set("COALITION_MANAGER_ADDR", addresses.CoalitionManager);
  set("TASK_MARKET_ADDR", addresses.TaskMarket);
  set("DEPLOYER_ADDR", deployerAddress);

  fs.writeFileSync(envPath, content);
  console.log("\nUpdated backend/.env with deployed contract addresses.");
}

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account. Set DEPLOYER_PK in backend/.env");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "STT");
  console.log("Network:", hre.network.name);

  if (balance === 0n && hre.network.name !== "hardhat") {
    throw new Error(
      `Deployer has 0 STT. Fund ${deployer.address} at https://testnet.somnia.network/ then re-run npm run deploy:testnet`
    );
  }

  const addr = (v) => (v && v.trim().startsWith("0x") ? v.trim() : null);
  const guardian = addr(process.env.GUARDIAN_MULTISIG_ADDR) ?? deployer.address;
  const treasury = addr(process.env.TREASURY_ADDR) ?? deployer.address;
  const multisig = addr(process.env.SLASH_MULTISIG_ADDR) ?? deployer.address;

  console.log("Deploying AETHON v3.0...");
  console.log("Deployer:", deployer.address);
  console.log("Guardian:  ", guardian);
  console.log("Treasury:   ", treasury);
  console.log("Slash MSIG: ", multisig);

  const RepEngine = await ethers.getContractFactory("ReputationEngine");
  const repEngine = await RepEngine.deploy(deployer.address);
  await repEngine.waitForDeployment();
  const repEngineAddr = await repEngine.getAddress();
  console.log("ReputationEngine.sol:", repEngineAddr);

  const CB = await ethers.getContractFactory("CircuitBreaker");
  const cb = await CB.deploy(deployer.address, guardian, []);
  await cb.waitForDeployment();
  const cbAddr = await cb.getAddress();
  console.log("CircuitBreaker.sol:", cbAddr);

  const Registry = await ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy(repEngineAddr, cbAddr, multisig);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("AgentRegistry.sol:", registryAddr);

  const CoalMgr = await ethers.getContractFactory("CoalitionManager");
  const coalMgr = await CoalMgr.deploy(registryAddr, repEngineAddr, cbAddr);
  await coalMgr.waitForDeployment();
  const coalMgrAddr = await coalMgr.getAddress();
  console.log("CoalitionManager.sol:", coalMgrAddr);

  const Market = await ethers.getContractFactory("TaskMarket");
  const market = await Market.deploy(registryAddr, coalMgrAddr, cbAddr, treasury);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("TaskMarket.sol:", marketAddr);

  const CALLER_ROLE = ethers.id("CALLER_ROLE");
  const REPORTER_ROLE = ethers.id("REPORTER_ROLE");

  await (await repEngine.grantRole(CALLER_ROLE, registryAddr)).wait();
  await (await repEngine.grantRole(CALLER_ROLE, coalMgrAddr)).wait();
  await (await repEngine.grantRole(CALLER_ROLE, marketAddr)).wait();
  await (await cb.grantRole(REPORTER_ROLE, marketAddr)).wait();

  if (multisig.toLowerCase() === deployer.address.toLowerCase()) {
    await (await registry.setCoalitionManager(coalMgrAddr)).wait();
    console.log("AgentRegistry coalition manager set:", coalMgrAddr);
  } else {
    console.warn(
      `Call AgentRegistry.setCoalitionManager(${coalMgrAddr}) from slash multisig ${multisig} before distributing rewards.`,
    );
  }

  const deployment = {
    network: hre.network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    roles: { guardian, treasury, slashMultisig: multisig },
    addresses: {
      ReputationEngine: repEngineAddr,
      CircuitBreaker: cbAddr,
      AgentRegistry: registryAddr,
      CoalitionManager: coalMgrAddr,
      TaskMarket: marketAddr,
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}-${deployment.chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  if (hre.network.name !== "hardhat") {
    updateEnv(deployment.addresses, deployer.address);
  }

  console.log("\nAETHON v3.0 deployment complete.");
  console.log(JSON.stringify(deployment, null, 2));
  console.log(`\nExplorer: https://shannon-explorer.somnia.network/address/${marketAddr}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
