// SPDX-License-Identifier: MIT
// File: TaskMarket.sol  (AETHON v3.0 — Somnia Agentic L1)
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/ICoalitionManager.sol";
import "./interfaces/ICircuitBreaker.sol";

interface IOracleResolver {
    function requestPriceForTask(uint256 taskId, string calldata coinId) external;
    function isResolved(uint256 taskId) external view returns (bool);
}

contract TaskMarket is ReentrancyGuard {
    using ECDSA for bytes32;

    enum TaskStatus { PENDING, ASSIGNED, COMPLETED, FAILED, EXPIRED }

    struct Task {
        uint256 id;
        address submitter;
        bytes32 taskHash;
        uint256 reward;
        uint256 complexity;
        uint256 deadline;
        TaskStatus status;
        address coalitionAddr;
        address authorizedReporter;
        uint256 platformFee;
    }

    IAgentRegistry public registry;
    ICoalitionManager public coalitionMgr;
    ICircuitBreaker public circuitBreaker;
    address public immutable treasury;
    address public oracleResolver;

    mapping(uint256 => bool) public isOracleTask;
    mapping(uint256 => string) public oracleCoinId;

    uint256 public taskCounter;
    mapping(uint256 => Task) public tasks;

    function setOracleResolver(address _resolver) external {
        oracleResolver = _resolver;
    }

    function setFleetVault(address _vault) external {
        fleetVault = _vault;
    }

    uint256 public constant TASK_TIMEOUT = 1 hours;
    uint256 public constant EXPIRY_GRACE_BLOCKS = 750;
    uint256 public constant PLATFORM_FEE_BP = 200;

    event TaskSubmitted(uint256 indexed id, address submitter, uint256 reward, uint256 complexity);
    event TaskAssigned(uint256 indexed id, address coalition, address reporter);
    event TaskCompleted(uint256 indexed id, uint256 payout, uint256 fee);
    event TaskFailed(uint256 indexed id, string reason);
    event TaskExpired(uint256 indexed id);
    event TaskCompletedWithPayload(
        uint256 indexed id,
        address targetContract,
        bytes executionPayload,
        uint256 payout,
        uint256 fee
    );

    struct TaskExecutionResult {
        address targetContract;
        bytes executionPayload;
        bool submitted;
    }

    mapping(uint256 => TaskExecutionResult) public taskExecutionResults;

    address public fleetVault;

    modifier onlyRegisteredAgent() {
        require(registry.isAgentActive(msg.sender), "Not active agent");
        _;
    }

    modifier systemNotPaused() {
        require(!circuitBreaker.isPaused(), "Circuit breaker active");
        _;
    }

    constructor(address _registry, address _coalMgr, address _cb, address _treasury) {
        registry = IAgentRegistry(_registry);
        coalitionMgr = ICoalitionManager(_coalMgr);
        circuitBreaker = ICircuitBreaker(_cb);
        treasury = _treasury;
    }

    function submitTask(bytes32 _hash, uint256 _complexity)
        external
        payable
        nonReentrant
        systemNotPaused
        returns (uint256 taskId)
    {
        require(msg.value > 0, "Reward required");
        require(_complexity >= 1 && _complexity <= 5, "Bad complexity");
        taskId = ++taskCounter;
        tasks[taskId] = Task({
            id: taskId,
            submitter: msg.sender,
            taskHash: _hash,
            reward: msg.value,
            complexity: _complexity,
            deadline: block.timestamp + TASK_TIMEOUT,
            status: TaskStatus.PENDING,
            coalitionAddr: address(0),
            authorizedReporter: address(0),
            platformFee: 0
        });
        emit TaskSubmitted(taskId, msg.sender, msg.value, _complexity);
    }

    /// @notice Relayer submits on behalf of `_submitter` who signed (submitter, hash, complexity, msg.value).
    function submitTaskFor(
        address _submitter,
        bytes32 _hash,
        uint256 _complexity,
        bytes calldata _signature
    )
        external
        payable
        nonReentrant
        systemNotPaused
        returns (uint256 taskId)
    {
        require(_submitter != address(0), "Zero submitter");
        require(msg.value > 0, "Reward required");
        require(_complexity >= 1 && _complexity <= 5, "Bad complexity");
        bytes32 digest = keccak256(abi.encodePacked(_submitter, _hash, _complexity, msg.value));
        address signer = digest.toEthSignedMessageHash().recover(_signature);
        require(signer == _submitter, "Invalid signature");
        taskId = ++taskCounter;
        tasks[taskId] = Task({
            id: taskId,
            submitter: _submitter,
            taskHash: _hash,
            reward: msg.value,
            complexity: _complexity,
            deadline: block.timestamp + TASK_TIMEOUT,
            status: TaskStatus.PENDING,
            coalitionAddr: address(0),
            authorizedReporter: address(0),
            platformFee: 0
        });
        emit TaskSubmitted(taskId, _submitter, msg.value, _complexity);
    }

    function submitOracleTask(
        bytes32 _hash,
        uint256 _complexity,
        string calldata _coinId
    )
        external
        payable
        nonReentrant
        systemNotPaused
        returns (uint256 taskId)
    {
        require(msg.value > 0, "Reward required");
        require(_complexity >= 1 && _complexity <= 5, "Bad complexity");
        taskId = ++taskCounter;
        tasks[taskId] = Task({
            id: taskId,
            submitter: msg.sender,
            taskHash: _hash,
            reward: msg.value,
            complexity: _complexity,
            deadline: block.timestamp + TASK_TIMEOUT,
            status: TaskStatus.PENDING,
            coalitionAddr: address(0),
            authorizedReporter: address(0),
            platformFee: 0
        });
        isOracleTask[taskId] = true;
        oracleCoinId[taskId] = _coinId;
        emit TaskSubmitted(taskId, msg.sender, msg.value, _complexity);
    }

    function assignToCoalition(uint256 _taskId, address _coalition)
        external
        nonReentrant
        onlyRegisteredAgent
        systemNotPaused
    {
        Task storage t = tasks[_taskId];
        require(t.status == TaskStatus.PENDING, "Not pending");
        require(block.timestamp <= t.deadline, "Expired");
        require(coalitionMgr.isValidCoalition(_coalition, t.complexity), "Invalid coalition");
        t.status = TaskStatus.ASSIGNED;
        t.coalitionAddr = _coalition;
        t.authorizedReporter = msg.sender;
        emit TaskAssigned(_taskId, _coalition, msg.sender);

        if (isOracleTask[_taskId] && oracleResolver != address(0)) {
            IOracleResolver(oracleResolver).requestPriceForTask(_taskId, oracleCoinId[_taskId]);
        }
    }

    function reportCompletion(uint256 _taskId, bool _success, string calldata _reason)
        external
        nonReentrant
    {
        Task storage t = tasks[_taskId];
        require(t.status == TaskStatus.ASSIGNED, "Not assigned");
        require(msg.sender == t.authorizedReporter, "Not authorized reporter");
        if (_success) {
            if (isOracleTask[_taskId] && oracleResolver != address(0)) {
                require(IOracleResolver(oracleResolver).isResolved(_taskId), "Somnia oracle pending");
            }
            uint256 fee = (t.reward * PLATFORM_FEE_BP) / 10000;
            uint256 payout = t.reward - fee;
            t.platformFee = fee;
            t.status = TaskStatus.COMPLETED;
            (bool feeOk,) = treasury.call{value: fee}("");
            require(feeOk, "Treasury transfer failed");
            coalitionMgr.distributeReward{value: payout}(t.coalitionAddr);
            circuitBreaker.reportSuccess();
            emit TaskCompleted(_taskId, payout, fee);
        } else {
            t.status = TaskStatus.FAILED;
            circuitBreaker.reportFailure();
            (bool refundOk,) = t.submitter.call{value: t.reward}("");
            require(refundOk, "Refund failed");
            emit TaskFailed(_taskId, _reason);
        }
    }

    /// @notice Stores verifiable execution calldata after successful task completion (additive).
    function submitTaskResult(
        uint256 _taskId,
        address _targetContract,
        bytes calldata _executionPayload
    ) external nonReentrant {
        Task storage t = tasks[_taskId];
        require(t.status == TaskStatus.COMPLETED, "Not completed");
        require(msg.sender == t.authorizedReporter, "Not authorized reporter");
        require(_targetContract != address(0), "Zero target");
        require(_executionPayload.length > 0, "Empty payload");
        TaskExecutionResult storage r = taskExecutionResults[_taskId];
        require(!r.submitted, "Already submitted");
        r.targetContract = _targetContract;
        r.executionPayload = _executionPayload;
        r.submitted = true;
        uint256 payout = t.reward - t.platformFee;
        emit TaskCompletedWithPayload(_taskId, _targetContract, _executionPayload, payout, t.platformFee);
    }

    function expireTask(uint256 _taskId) external nonReentrant {
        Task storage t = tasks[_taskId];
        require(t.status == TaskStatus.PENDING, "Not pending");
        require(block.number > t.deadline + EXPIRY_GRACE_BLOCKS, "Grace period active");
        t.status = TaskStatus.EXPIRED;
        (bool ok,) = t.submitter.call{value: t.reward}("");
        require(ok, "Refund failed");
        emit TaskExpired(_taskId);
    }

    /// @notice Refund submitter when an assigned task passes its deadline without completion.
    function refundStaleAssigned(uint256 _taskId) external nonReentrant {
        Task storage t = tasks[_taskId];
        require(t.status == TaskStatus.ASSIGNED, "Not assigned");
        require(block.timestamp > t.deadline, "Deadline not passed");
        t.status = TaskStatus.FAILED;
        circuitBreaker.reportFailure();
        (bool ok,) = t.submitter.call{value: t.reward}("");
        require(ok, "Refund failed");
        emit TaskFailed(_taskId, "Assigned task deadline exceeded");
    }
}
