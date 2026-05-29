const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AETHON v3.0 contracts", () => {
  it("deploys full stack and completes task lifecycle", async () => {
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

    const CALLER_ROLE = ethers.id("CALLER_ROLE");
    const REPORTER_ROLE = ethers.id("REPORTER_ROLE");
    await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await coalMgr.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await market.getAddress());
    await cb.grantRole(REPORTER_ROLE, await market.getAddress());

    await registry.connect(agent).register(0, "meta", { value: ethers.parseEther("0.5") });

    await market.connect(submitter).submitTask(ethers.id("task-1"), 1, {
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

    expect(await repEngine.getScore(agent.address)).to.be.gt(100);
    expect(await cb.consecutiveFailures()).to.equal(0);
  });

  it("allows re-register after deregister without re-initializing reputation", async () => {
    const [admin, agent] = await ethers.getSigners();

    const RepEngine = await ethers.getContractFactory("ReputationEngine");
    const repEngine = await RepEngine.deploy(admin.address);

    const CB = await ethers.getContractFactory("CircuitBreaker");
    const cb = await CB.deploy(admin.address, admin.address, []);

    const Registry = await ethers.getContractFactory("AgentRegistry");
    const registry = await Registry.deploy(await repEngine.getAddress(), await cb.getAddress(), admin.address);

    const CALLER_ROLE = ethers.id("CALLER_ROLE");
    await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());

    await registry.connect(agent).register(3, "ipfs://gov", { value: ethers.parseEther("0.5") });
    expect(await repEngine.initialized(agent.address)).to.equal(true);
    expect(await repEngine.getScore(agent.address)).to.equal(100);

    await registry.connect(agent).requestDeregister();
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    await registry.connect(agent).completeDeregister();

    await registry.connect(agent).register(4, "ipfs://risk", { value: ethers.parseEther("0.5") });
    const record = await registry.agents(agent.address);
    expect(record.agentType).to.equal(4);
    expect(record.metadataURI).to.equal("ipfs://risk");
    expect(await registry.isAgentActive(agent.address)).to.equal(true);
    expect(await repEngine.getScore(agent.address)).to.equal(100);
  });
});
