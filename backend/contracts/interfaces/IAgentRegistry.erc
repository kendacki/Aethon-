// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    enum AgentType { ARBITRAGE, ORACLE, YIELD_OPT, GOVERNANCE, RISK_MGMT }

    function isAgentActive(address _agent) external view returns (bool);
    function getAgentStake(address _agent) external view returns (uint256);
}
