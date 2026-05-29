const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const PLATFORM_BY_NETWORK = {
  somniaTestnet: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776",
  somniaMainnet: "0x5E5205CF39E766118C01636bED000A54D93163E6",
};

const ROLES = ["ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

function readAgentKey(roleFile) {
  const envPath = path.join(__dirname, "..", "env", "agents", roleFile);
  if (!fs.existsSync(envPath)) return null;
  const match = fs.readFileSync(envPath, "utf8").match(/^AGENT_PRIVATE_KEY=(.+)$/m);
  return match?.[1]?.trim() || null;
}

async function pickDeployer(ethers) {
  const candidates = [];
  if (process.env.CONSUMER_DEPLOYER_PK?.trim()) {
    candidates.push(process.env.CONSUMER_DEPLOYER_PK.trim());
  }
  if (process.env.DEPLOYER_PK?.trim()) {
    candidates.push(process.env.DEPLOYER_PK.trim());
  }
  for (const role of ROLES) {
    const pk = readAgentKey(`${role.toLowerCase()}.env`);
    if (pk) candidates.push(pk);
  }

  const min = ethers.parseEther("0.15");
  for (const pk of [...new Set(candidates)]) {
    const wallet = new ethers.Wallet(pk, ethers.provider);
    const balance = await ethers.provider.getBalance(wallet.address);
    if (balance >= min || hre.network.name === "hardhat") {
      return wallet;
    }
  }

  const first = candidates[0];
  if (!first) throw new Error("No deployer key. Set DEPLOYER_PK or env/agents/*.env");
  return new ethers.Wallet(first, ethers.provider);
}

function patchEnv(updates) {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    content = re.test(content) ? content.replace(re, `${key}=${value}`) : `${content}\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content);
}

function mergeDeployment(networkName, chainId, platform, consumerAddr, deployer) {
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const consumerFile = path.join(outDir, `somnia-consumer-${networkName}.json`);
  const consumerRecord = {
    network: networkName,
    chainId,
    platform,
    SomniaAgentConsumer: consumerAddr,
    deployer,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(consumerFile, JSON.stringify(consumerRecord, null, 2));

  const mainFile = path.join(outDir, `somniaTestnet-${chainId}.json`);
  if (fs.existsSync(mainFile)) {
    const main = JSON.parse(fs.readFileSync(mainFile, "utf8"));
    main.addresses = main.addresses || {};
    main.addresses.SomniaAgentConsumer = consumerAddr;
    main.addresses.SomniaAgentsPlatform = platform;
    main.somniaConsumer = consumerRecord;
    fs.writeFileSync(mainFile, JSON.stringify(main, null, 2));
  }

  return consumerFile;
}

async function main() {
  const { ethers } = hre;

  const platform =
    process.env.SOMNIA_AGENTS_PLATFORM_ADDR ?? PLATFORM_BY_NETWORK[hre.network.name];
  if (!platform) {
    throw new Error(
      `Unknown network ${hre.network.name}. Set SOMNIA_AGENTS_PLATFORM_ADDR or use somniaTestnet.`
    );
  }

  const deployer = await pickDeployer(ethers);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deploying SomniaAgentConsumer...");
  console.log("Platform:", platform);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "STT");

  if (balance < ethers.parseEther("0.15") && hre.network.name !== "hardhat") {
    throw new Error(
      `Deployer ${deployer.address} needs >= 0.15 STT. Fund via https://testnet.somnia.network/`
    );
  }

  const Consumer = await ethers.getContractFactory("SomniaAgentConsumer", deployer);
  const consumer = await Consumer.deploy(platform);
  await consumer.waitForDeployment();
  const addr = await consumer.getAddress();

  console.log("SomniaAgentConsumer:", addr);

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const consumerFile = mergeDeployment(hre.network.name, Number(chainId), platform, addr, deployer.address);

  patchEnv({
    SOMNIA_AGENTS_PLATFORM_ADDR: platform,
    SOMNIA_AGENT_CONSUMER_ADDR: addr,
    SOMNIA_AGENTS_ENABLED: "true",
  });

  console.log("Wrote", consumerFile);
  console.log("Updated backend/.env with SOMNIA_AGENT_CONSUMER_ADDR");
  console.log("\nSet on Railway API + ORACLE + GOVERNANCE agent services:");
  console.log(`SOMNIA_AGENTS_PLATFORM_ADDR=${platform}`);
  console.log(`SOMNIA_AGENT_CONSUMER_ADDR=${addr}`);
  console.log("SOMNIA_AGENTS_ENABLED=true");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
