// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Somnia Agents Platform Interface
/// @notice Shared types live in IAgentRequester.sol (canonical Request struct with perAgentBudget).
/// @dev Testnet platform: 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776

import "./IAgentRequester.sol";

interface IOracleResolver {
    function requestPriceForTask(uint256 taskId, string calldata coinId) external;
    function isResolved(uint256 taskId) external view returns (bool);
    function getPrice(uint256 taskId) external view returns (uint256);
    function getSomniaRequestId(uint256 taskId) external view returns (uint256);
}
