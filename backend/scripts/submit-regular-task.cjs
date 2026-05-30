const { ethers } = require("ethers");
require("dotenv").config();

const MARKET_ABI = [
  "function submitTask(bytes32 hash, uint256 complexity) payable returns (uint256)",
  "function taskCounter() view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);
  const market = new ethers.Contract(process.env.TASK_MARKET_ADDR, MARKET_ABI, wallet);

  const payload = {
    version: 1,
    primaryRole: "ORACLE",
    action: "fetch_price",
    params: { asset: "ethereum", currency: "usd" },
    label: "Attestation (Regular Task)",
  };

  const canonical = JSON.stringify(payload);
  const taskHash = ethers.keccak256(ethers.toUtf8Bytes(canonical));

  const { repo } = require("../dist/db/repository.js");
  await repo.saveTaskPayload(taskHash, payload);
  console.log(`[local-db] Saved task payload for hash: ${taskHash}`);

  const reward = ethers.parseEther("0.05");
  const tx = await market.submitTask(taskHash, 1, {
    value: reward,
    gasLimit: 5000000n,
  });
  const receipt = await tx.wait();
  const taskId = Number(await market.taskCounter());
  console.log(`[regular-task] taskId=${taskId} txHash=${receipt.hash}`);
}

main().catch(console.error);
