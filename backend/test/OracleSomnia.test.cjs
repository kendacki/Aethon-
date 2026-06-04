const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deployOracleStack() {
  const [admin, submitter, agent, treasury] = await ethers.getSigners();

  const RepEngine = await ethers.getContractFactory("ReputationEngine");
  const repEngine = await RepEngine.deploy(admin.address);

  const CB = await ethers.getContractFactory("CircuitBreaker");
  const cb = await CB.deploy(admin.address, admin.address, []);

  const Registry = await ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy(await repEngine.getAddress(), await cb.getAddress(), admin.address);

  const CoalMgr = await ethers.getContractFactory("CoalitionManager");
  const coalMgr = await CoalMgr.deploy(
    await registry.getAddress(),
    await repEngine.getAddress(),
    await cb.getAddress()
  );

  const Market = await ethers.getContractFactory("TaskMarket");
  const market = await Market.deploy(
    await registry.getAddress(),
    await coalMgr.getAddress(),
    await cb.getAddress(),
    treasury.address
  );
  const marketAddr = await market.getAddress();

  const MockPlatform = await ethers.getContractFactory("MockSomniaPlatform");
  const platform = await MockPlatform.deploy();

  const OracleResolver = await ethers.getContractFactory("OracleResolver");
  const resolver = await OracleResolver.deploy(await platform.getAddress(), marketAddr);
  const resolverAddr = await resolver.getAddress();

  await market.setOracleResolver(resolverAddr);
  await admin.sendTransaction({ value: ethers.parseEther("1"), to: resolverAddr });

  const CALLER_ROLE = ethers.id("CALLER_ROLE");
  const REPORTER_ROLE = ethers.id("REPORTER_ROLE");
  await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());
  await repEngine.grantRole(CALLER_ROLE, await coalMgr.getAddress());
  await repEngine.grantRole(CALLER_ROLE, await market.getAddress());
  await cb.grantRole(REPORTER_ROLE, await market.getAddress());
  await registry.setCoalitionManager(await coalMgr.getAddress());

  await registry.connect(agent).register(1, "oracle-meta", { value: ethers.parseEther("0.5") });

  return { admin, submitter, agent, treasury, repEngine, cb, registry, coalMgr, market, platform, resolver };
}

describe("OracleResolver + Somnia JSON API path", () => {
  it("submitOracleTask → assign triggers resolver → callback unlocks reportCompletion", async () => {
    const { submitter, agent, coalMgr, market, platform, resolver } = await deployOracleStack();

    await market.connect(submitter).submitOracleTask(ethers.id("oracle-eth"), 1, "ethereum", {
      value: ethers.parseEther("1"),
    });

    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);

    await market.connect(agent).assignToCoalition(1, coalitionAddr);

    const somniaRequestId = await resolver.getSomniaRequestId(1);
    expect(somniaRequestId).to.be.gt(0);

    await expect(market.connect(agent).reportCompletion(1, true, "")).to.be.revertedWith(
      "Somnia oracle pending"
    );

    const scaledPrice = 2500_00000000n; // $2500 × 1e8
    await platform.finalizeWithPrice(somniaRequestId, scaledPrice);

    expect(await resolver.isResolved(1)).to.equal(true);
    expect(await resolver.getPrice(1)).to.equal(scaledPrice);

    await market.connect(agent).reportCompletion(1, true, "");
    expect((await market.tasks(1)).status).to.equal(2); // COMPLETED
  });

  it("regular submitTask does not require Somnia oracle resolution", async () => {
    const { submitter, agent, coalMgr, market } = await deployOracleStack();

    await market.connect(submitter).submitTask(ethers.id("plain-task"), 1, {
      value: ethers.parseEther("1"),
    });

    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);

    await market.connect(agent).assignToCoalition(1, coalitionAddr);
    await market.connect(agent).reportCompletion(1, true, "");
    expect((await market.tasks(1)).status).to.equal(2);
  });

  it("OracleResolver forwards platform.getRequestDeposit() dynamically", async () => {
    const { admin, submitter, agent, coalMgr, market, platform, resolver } = await deployOracleStack();

    const customDeposit = ethers.parseEther("0.25");
    await platform.setDepositOverride(customDeposit);
    await admin.sendTransaction({ value: customDeposit, to: await resolver.getAddress() });

    await market.connect(submitter).submitOracleTask(ethers.id("oracle-btc"), 1, "bitcoin", {
      value: ethers.parseEther("1"),
    });

    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);

    const balanceBefore = await ethers.provider.getBalance(await platform.getAddress());
    await market.connect(agent).assignToCoalition(1, coalitionAddr);
    const balanceAfter = await ethers.provider.getBalance(await platform.getAddress());
    expect(balanceAfter - balanceBefore).to.equal(customDeposit);
  });
});
