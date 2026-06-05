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
    await registry.setCoalitionManager(await coalMgr.getAddress());

    const stakeBefore = await registry.getAgentStake(agent.address);

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

    const stakeAfter = await registry.getAgentStake(agent.address);
    const fee = (ethers.parseEther("1") * 200n) / 10000n;
    const payout = ethers.parseEther("1") - fee;
    expect(stakeAfter - stakeBefore).to.equal(payout);

    expect(await repEngine.getScore(agent.address)).to.be.gt(100);
    expect(await cb.consecutiveFailures()).to.equal(0);
  });

  it("anchors execution payload via submitTaskResult", async () => {
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
      await cb.getAddress(),
    );
    const Market = await ethers.getContractFactory("TaskMarket");
    const market = await Market.deploy(
      await registry.getAddress(),
      await coalMgr.getAddress(),
      await cb.getAddress(),
      treasury.address,
    );

    const CALLER_ROLE = ethers.id("CALLER_ROLE");
    const REPORTER_ROLE = ethers.id("REPORTER_ROLE");
    await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await coalMgr.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await market.getAddress());
    await cb.grantRole(REPORTER_ROLE, await market.getAddress());
    await registry.setCoalitionManager(await coalMgr.getAddress());
    await registry.connect(agent).register(0, "meta", { value: ethers.parseEther("0.5") });

    await market.connect(submitter).submitTask(ethers.id("exec-task"), 1, { value: ethers.parseEther("0.1") });
    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);
    await market.connect(agent).assignToCoalition(1, coalitionAddr);
    await market.connect(agent).reportCompletion(1, true, "");

    const executionPayload = "0x" + "ab".repeat(32);
    const target = treasury.address;
    await expect(market.connect(agent).submitTaskResult(1, target, executionPayload)).to.emit(
      market,
      "TaskCompletedWithPayload",
    );

    const stored = await market.taskExecutionResults(1);
    expect(stored.submitted).to.equal(true);
    expect(stored.targetContract).to.equal(target);
  });

  it("refunds signed submitter on failure via submitTaskFor", async () => {
    const [admin, submitter, agent, treasury, relayer] = await ethers.getSigners();

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
      await cb.getAddress(),
    );

    const Market = await ethers.getContractFactory("TaskMarket");
    const market = await Market.deploy(
      await registry.getAddress(),
      await coalMgr.getAddress(),
      await cb.getAddress(),
      treasury.address,
    );

    const CALLER_ROLE = ethers.id("CALLER_ROLE");
    const REPORTER_ROLE = ethers.id("REPORTER_ROLE");
    await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await coalMgr.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await market.getAddress());
    await cb.grantRole(REPORTER_ROLE, await market.getAddress());
    await registry.setCoalitionManager(await coalMgr.getAddress());

    await registry.connect(agent).register(0, "meta", { value: ethers.parseEther("0.5") });

    const reward = ethers.parseEther("0.1");
    const taskHash = ethers.id("signed-task");
    const complexity = 1n;
    const digest = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "uint256", "uint256"],
      [submitter.address, taskHash, complexity, reward],
    );
    const signature = await submitter.signMessage(ethers.getBytes(digest));

    const balBefore = await ethers.provider.getBalance(submitter.address);
    await market.connect(relayer).submitTaskFor(submitter.address, taskHash, complexity, signature, {
      value: reward,
    });

    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);
    await market.connect(agent).assignToCoalition(1, coalitionAddr);
    await market.connect(agent).reportCompletion(1, false, "failed");

    const balAfter = await ethers.provider.getBalance(submitter.address);
    expect(balAfter).to.be.gt(balBefore);
  });

  it("rejects unauthorized TaskMarket admin setters and vault swarm execution", async () => {
    const [admin, submitter, agent, treasury, attacker] = await ethers.getSigners();

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
      await cb.getAddress(),
    );
    const Market = await ethers.getContractFactory("TaskMarket");
    const market = await Market.deploy(
      await registry.getAddress(),
      await coalMgr.getAddress(),
      await cb.getAddress(),
      treasury.address,
    );
    const Vault = await ethers.getContractFactory("AethonFleetVault");
    const vault = await Vault.deploy();
    const marketAddr = await market.getAddress();
    const vaultAddr = await vault.getAddress();

    await vault.setTaskMarket(marketAddr);
    await market.setFleetVault(vaultAddr);

    await expect(market.connect(attacker).setOracleResolver(attacker.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(market.connect(attacker).setFleetVault(attacker.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(
      vault.connect(attacker).executeSwarmConsensus(treasury.address, "0x"),
    ).to.be.revertedWith("Not authorized");
  });

  it("executes swarm via TaskMarket only after anchored reporter payload", async () => {
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
      await cb.getAddress(),
    );
    const Market = await ethers.getContractFactory("TaskMarket");
    const market = await Market.deploy(
      await registry.getAddress(),
      await coalMgr.getAddress(),
      await cb.getAddress(),
      treasury.address,
    );
    const Vault = await ethers.getContractFactory("AethonFleetVault");
    const vault = await Vault.deploy();
    await vault.setTaskMarket(await market.getAddress());
    await market.setFleetVault(await vault.getAddress());

    const CALLER_ROLE = ethers.id("CALLER_ROLE");
    const REPORTER_ROLE = ethers.id("REPORTER_ROLE");
    await repEngine.grantRole(CALLER_ROLE, await registry.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await coalMgr.getAddress());
    await repEngine.grantRole(CALLER_ROLE, await market.getAddress());
    await cb.grantRole(REPORTER_ROLE, await market.getAddress());
    await registry.setCoalitionManager(await coalMgr.getAddress());
    await registry.connect(agent).register(0, "meta", { value: ethers.parseEther("0.5") });

    const MockTarget = await ethers.getContractFactory("MockCallTarget");
    const mockTarget = await MockTarget.deploy();
    const mockAddr = await mockTarget.getAddress();

    await market.connect(submitter).submitTask(ethers.id("swarm-exec"), 1, {
      value: ethers.parseEther("0.1"),
    });
    const members = [agent.address];
    const taskId = 1n;
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    const sig = await agent.signMessage(ethers.getBytes(msgHash));
    const coalitionAddr = await coalMgr.formCoalition.staticCall(members, taskId, [sig]);
    await coalMgr.connect(agent).formCoalition(members, taskId, [sig]);
    await market.connect(agent).assignToCoalition(1, coalitionAddr);
    await market.connect(agent).reportCompletion(1, true, "");

    const executionPayload = "0x" + "ab".repeat(4);
    await market.connect(agent).submitTaskResult(1, mockAddr, executionPayload);

    await expect(market.connect(submitter).executeSwarmForTask(1)).to.be.revertedWith(
      "Not authorized reporter",
    );

    await expect(market.connect(agent).executeSwarmForTask(1)).to.emit(vault, "SwarmConsensusExecuted");
    await expect(market.connect(agent).executeSwarmForTask(1)).to.be.revertedWith("Already executed");
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
