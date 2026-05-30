// SPDX-License-Identifier: MIT
// File: OracleResolver.sol — Somnia JSON API Request agent bridge for ORACLE tasks
pragma solidity ^0.8.24;

import "./interfaces/IAgentRequester.sol";

/// @title OracleResolver
/// @notice Routes ORACLE task price fetches through Somnia's JSON API Request agent (on-chain receipt path)
contract OracleResolver {
    IAgentRequester public immutable platform;

    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;

    address public taskMarket;
    address public owner;

    mapping(uint256 => uint256) public taskToRequest;
    mapping(uint256 => uint256) public requestToTask;
    mapping(uint256 => uint256) public taskPrices;
    mapping(uint256 => uint256) public taskResolvedAt;
    mapping(uint256 => bool) public pendingRequests;

    event OracleRequested(uint256 indexed taskId, uint256 indexed somniaRequestId, string coinId);
    event OracleResolved(uint256 indexed taskId, uint256 indexed somniaRequestId, uint256 price);
    event OracleFailed(uint256 indexed taskId, uint256 indexed somniaRequestId, ResponseStatus status);

    modifier onlyTaskMarket() {
        require(msg.sender == taskMarket, "Only TaskMarket");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address platformAddr, address taskMarketAddr) {
        platform = IAgentRequester(platformAddr);
        taskMarket = taskMarketAddr;
        owner = msg.sender;
    }

    function setTaskMarket(address taskMarketAddr) external onlyOwner {
        taskMarket = taskMarketAddr;
    }

    function fund() external payable {}

    /// @notice Called by TaskMarket when an ORACLE coalition is assigned
    function requestPriceForTask(uint256 taskId, string calldata coinId) external onlyTaskMarket {
        require(taskToRequest[taskId] == 0 || taskResolvedAt[taskId] > 0, "Oracle request pending");

        string memory url = string.concat(
            "https://api.coingecko.com/api/v3/simple/price?ids=",
            coinId,
            "&vs_currencies=usd"
        );
        string memory selector = string.concat(coinId, ".usd");

        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector,
            url,
            selector,
            uint8(8)
        );

        uint256 deposit = platform.getRequestDeposit();
        require(address(this).balance >= deposit, "Oracle fund empty");

        uint256 requestId = platform.createRequest{value: deposit}(
            JSON_API_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );

        taskToRequest[taskId] = requestId;
        requestToTask[requestId] = taskId;
        pendingRequests[requestId] = true;
        delete taskPrices[taskId];
        delete taskResolvedAt[taskId];

        emit OracleRequested(taskId, requestId, coinId);
    }

    /// @notice Somnia platform callback when validators reach consensus
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(platform), "Only platform");
        require(pendingRequests[requestId], "Unknown request");
        delete pendingRequests[requestId];

        uint256 taskId = requestToTask[requestId];
        require(taskId != 0, "Unmapped request");

        if (status == ResponseStatus.Success && responses.length > 0) {
            uint256 price = abi.decode(responses[0].result, (uint256));
            taskPrices[taskId] = price;
            taskResolvedAt[taskId] = block.timestamp;
            emit OracleResolved(taskId, requestId, price);
        } else {
            emit OracleFailed(taskId, requestId, status);
        }
    }

    function isResolved(uint256 taskId) external view returns (bool) {
        return taskResolvedAt[taskId] > 0;
    }

    function getPrice(uint256 taskId) external view returns (uint256) {
        return taskPrices[taskId];
    }

    function getSomniaRequestId(uint256 taskId) external view returns (uint256) {
        return taskToRequest[taskId];
    }

    receive() external payable {}
}
