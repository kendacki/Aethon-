// SPDX-License-Identifier: MIT
// File: ReputationEngine.sol  (AETHON v3.0 — Somnia Agentic L1)
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ReputationEngine is AccessControl {
    bytes32 public constant CALLER_ROLE = keccak256("CALLER_ROLE");

    mapping(address => uint256) public scores;
    mapping(address => bool) public initialized;

    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant BASE_SCORE = 100;

    event ScoreUpdated(address indexed agent, uint256 oldScore, uint256 newScore, string reason);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function initializeAgent(address _agent) external onlyRole(CALLER_ROLE) {
        require(!initialized[_agent], "Already initialized");
        scores[_agent] = BASE_SCORE;
        initialized[_agent] = true;
        emit ScoreUpdated(_agent, 0, BASE_SCORE, "INIT");
    }

    function applyBonus(address _agent, uint256 _points) external onlyRole(CALLER_ROLE) returns (uint256) {
        uint256 old = scores[_agent];
        uint256 gain = old > 500 ? (_points * 500) / old : _points;
        scores[_agent] = _min(old + gain, MAX_SCORE);
        emit ScoreUpdated(_agent, old, scores[_agent], "BONUS");
        return scores[_agent];
    }

    function applyPenalty(address _agent, uint256 _points) external onlyRole(CALLER_ROLE) returns (uint256) {
        uint256 old = scores[_agent];
        scores[_agent] = old > _points ? old - _points : 0;
        emit ScoreUpdated(_agent, old, scores[_agent], "PENALTY");
        return scores[_agent];
    }

    function getScore(address _agent) external view returns (uint256) {
        return scores[_agent];
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
