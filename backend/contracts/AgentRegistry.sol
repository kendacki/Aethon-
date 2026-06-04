// SPDX-License-Identifier: MIT
// File: AgentRegistry.sol  (AETHON v3.0 — Somnia Agentic L1)
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IReputationEngine.sol";
import "./interfaces/ICircuitBreaker.sol";

contract AgentRegistry is ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    enum AgentType { ARBITRAGE, ORACLE, YIELD_OPT, GOVERNANCE, RISK_MGMT }

    struct Agent {
        address wallet;
        AgentType agentType;
        uint256 stake;
        uint256 registeredAt;
        uint256 lastHeartbeat;
        bool online;
        uint256 deregisterRequestedAt;
        string metadataURI;
    }

    IReputationEngine public repEngine;
    ICircuitBreaker public circuitBreaker;
    address public immutable slashMultisig;
    address public coalitionManager;

    EnumerableSet.AddressSet private _activeAgents;
    mapping(address => Agent) public agents;

    uint256 public constant MIN_STAKE = 0.1 ether;
    uint256 public constant HEARTBEAT_TTL = 120;
    uint256 public constant MIN_REPUTATION = 50;
    uint256 public constant DEREGISTER_DELAY = 24 hours;

    event AgentRegistered(address indexed wallet, AgentType agentType);
    event AgentOffline(address indexed wallet, string reason);
    event AgentSlashed(address indexed wallet, uint256 amount, string reason);
    event DeregisterRequested(address indexed wallet, uint256 unlockAt);
    event DeregisterCompleted(address indexed wallet, uint256 stakeReturned);
    event StakeCredited(address indexed wallet, uint256 amount);
    event CoalitionManagerSet(address indexed manager);

    modifier onlySlashMultisig() {
        require(msg.sender == slashMultisig, "Only slash multisig");
        _;
    }

    modifier systemNotPaused() {
        require(!circuitBreaker.isPaused(), "Circuit breaker active");
        _;
    }

    constructor(address _repEngine, address _cb, address _slashMultisig) {
        repEngine = IReputationEngine(_repEngine);
        circuitBreaker = ICircuitBreaker(_cb);
        slashMultisig = _slashMultisig;
    }

    function setCoalitionManager(address _manager) external {
        require(msg.sender == slashMultisig, "Only slash multisig");
        require(_manager != address(0), "Zero address");
        require(coalitionManager == address(0), "Already set");
        coalitionManager = _manager;
        emit CoalitionManagerSet(_manager);
    }

    function register(AgentType _type, string calldata _metaURI)
        external
        payable
        nonReentrant
        systemNotPaused
    {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!agents[msg.sender].online, "Already registered");
        agents[msg.sender] = Agent({
            wallet: msg.sender,
            agentType: _type,
            stake: msg.value,
            registeredAt: block.timestamp,
            lastHeartbeat: block.timestamp,
            online: true,
            deregisterRequestedAt: 0,
            metadataURI: _metaURI
        });
        _activeAgents.add(msg.sender);
        if (!repEngine.initialized(msg.sender)) {
            repEngine.initializeAgent(msg.sender);
        }
        emit AgentRegistered(msg.sender, _type);
    }

    function requestDeregister() external {
        Agent storage a = agents[msg.sender];
        require(a.online, "Not active");
        a.online = false;
        a.deregisterRequestedAt = block.timestamp;
        _activeAgents.remove(msg.sender);
        emit DeregisterRequested(msg.sender, block.timestamp + DEREGISTER_DELAY);
    }

    function completeDeregister() external nonReentrant {
        Agent storage a = agents[msg.sender];
        require(a.deregisterRequestedAt > 0, "Not requested");
        require(block.timestamp >= a.deregisterRequestedAt + DEREGISTER_DELAY, "Timelock active");
        uint256 stake = a.stake;
        a.stake = 0;
        (bool ok,) = msg.sender.call{value: stake}("");
        require(ok, "Transfer failed");
        emit DeregisterCompleted(msg.sender, stake);
    }

    function heartbeat() external {
        require(agents[msg.sender].online, "Not online");
        agents[msg.sender].lastHeartbeat = block.timestamp;
    }

    function slash(address _agent, uint256 _amount, string calldata _reason)
        external
        onlySlashMultisig
        nonReentrant
    {
        Agent storage a = agents[_agent];
        require(a.online, "Not active");
        uint256 sl = _amount > a.stake ? a.stake : _amount;
        a.stake -= sl;
        uint256 newRep = repEngine.applyPenalty(_agent, 10);
        if (newRep < MIN_REPUTATION || a.stake == 0) {
            a.online = false;
            _activeAgents.remove(_agent);
            emit AgentOffline(_agent, "Slashed below threshold");
        }
        emit AgentSlashed(_agent, sl, _reason);
    }

    function isAgentActive(address _agent) external view returns (bool) {
        Agent storage a = agents[_agent];
        return a.online && (block.timestamp - a.lastHeartbeat) < HEARTBEAT_TTL;
    }

    function getAgentStake(address _agent) external view returns (uint256) {
        return agents[_agent].stake;
    }

    /// @notice Credits native STT to an agent's on-chain stake (used for task reward distribution).
    function creditStake(address _agent) external payable nonReentrant {
        require(msg.sender == coalitionManager, "Only coalition manager");
        require(msg.value > 0, "Zero amount");
        Agent storage a = agents[_agent];
        require(a.stake > 0, "Agent not registered");
        a.stake += msg.value;
        emit StakeCredited(_agent, msg.value);
    }

    function getActiveAgentsByType(AgentType _type, uint256 page, uint256 pageSize)
        external
        view
        returns (address[] memory result, uint256 total)
    {
        address[] memory buf = new address[](_activeAgents.length());
        uint256 count;
        for (uint256 i; i < _activeAgents.length(); i++) {
            address a = _activeAgents.at(i);
            if (
                agents[a].agentType == _type
                    && (block.timestamp - agents[a].lastHeartbeat) < HEARTBEAT_TTL
            ) {
                buf[count++] = a;
            }
        }
        uint256 start = page * pageSize;
        uint256 end = start + pageSize > count ? count : start + pageSize;
        result = new address[](end - start);
        for (uint256 i; i < end - start; i++) {
            result[i] = buf[start + i];
        }
        total = count;
    }
}
