// SPDX-License-Identifier: MIT
// Relays Somnia platform agent calls for off-chain AETHON workers.
pragma solidity ^0.8.24;

import "./interfaces/IAgentRequester.sol";

/// @notice Callback consumer used by AETHON agents to invoke Somnia base agents (JSON API, LLM, etc.).
contract SomniaAgentConsumer is IAgentRequesterHandler {
    IAgentRequester public immutable platform;

    mapping(uint256 => bytes) public results;
    mapping(uint256 => ResponseStatus) public statuses;
    mapping(uint256 => bool) public pending;

    event SomniaRequestCreated(uint256 indexed requestId, uint256 indexed agentId, address indexed caller);
    event SomniaResponseStored(uint256 indexed requestId, ResponseStatus status);

    constructor(address platform_) {
        require(platform_ != address(0), "Invalid platform");
        platform = IAgentRequester(platform_);
    }

    /// @dev Caller must attach sufficient STT/SOMI (floor + per-agent reward × subcommittee size).
    function invokeAgent(uint256 agentId, bytes calldata payload) external payable returns (uint256 requestId) {
        uint256 floor = platform.getRequestDeposit();
        require(msg.value >= floor, "Underfunded");

        requestId = platform.createRequest{value: msg.value}(
            agentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        pending[requestId] = true;
        emit SomniaRequestCreated(requestId, agentId, msg.sender);
    }

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(platform), "Only platform");
        require(pending[requestId], "Unknown request");
        delete pending[requestId];

        statuses[requestId] = status;
        if (status == ResponseStatus.Success && responses.length > 0) {
            results[requestId] = responses[0].result;
        }
        emit SomniaResponseStored(requestId, status);
    }

    receive() external payable {}
}
