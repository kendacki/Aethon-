// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationEngine {
    function initializeAgent(address _agent) external;
    function applyBonus(address _agent, uint256 _points) external returns (uint256);
    function applyPenalty(address _agent, uint256 _points) external returns (uint256);
    function getScore(address _agent) external view returns (uint256);
}
