// SPDX-License-Identifier: MIT
// AETHON Fleet Vault — Kit-compatible interface for agent fund segregation + daily limits.
// Deployed by AETHON deployer; complements (does not replace) wallet STT + on-chain stake.
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Subset of Somnia Agent Kit AgentVault API used by AETHON workers.
contract AethonFleetVault is Ownable, ReentrancyGuard {
    struct Vault {
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 dayStart;
        uint256 nativeBalance;
        bool active;
    }

    mapping(address => Vault) internal vaults;

    event VaultCreated(address indexed agent, uint256 dailyLimit);
    event NativeDeposit(address indexed agent, address indexed depositor, uint256 amount);
    event NativeWithdraw(address indexed agent, address indexed recipient, uint256 amount);

    constructor() Ownable() {}

    function createVault(address agent, uint256 dailyLimit) external onlyOwner {
        require(agent != address(0), "Zero agent");
        require(!vaults[agent].active, "Vault exists");
        vaults[agent] = Vault({
            dailyLimit: dailyLimit,
            spentToday: 0,
            dayStart: block.timestamp,
            nativeBalance: 0,
            active: true
        });
        emit VaultCreated(agent, dailyLimit);
    }

    function depositNative(address agent) external payable nonReentrant {
        Vault storage v = vaults[agent];
        require(v.active, "Vault does not exist");
        v.nativeBalance += msg.value;
        emit NativeDeposit(agent, msg.sender, msg.value);
    }

    function withdrawNative(address agent, address recipient, uint256 amount) external nonReentrant {
        Vault storage v = vaults[agent];
        require(v.active, "Vault does not exist");
        require(msg.sender == agent || msg.sender == owner(), "Not authorized");
        _rollDay(v);
        require(v.spentToday + amount <= v.dailyLimit, "Daily limit exceeded");
        require(v.nativeBalance >= amount, "Insufficient vault balance");
        v.nativeBalance -= amount;
        v.spentToday += amount;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");
        emit NativeWithdraw(agent, recipient, amount);
    }

    function getNativeBalance(address agent) external view returns (uint256) {
        return vaults[agent].nativeBalance;
    }

    function isVaultActive(address agent) external view returns (bool) {
        return vaults[agent].active;
    }

    function getDailyLimitInfo(address agent)
        external
        view
        returns (uint256 limit, uint256 spent, uint256 remaining, uint256 resetTime)
    {
        Vault storage v = vaults[agent];
        limit = v.dailyLimit;
        spent = v.spentToday;
        remaining = v.dailyLimit > v.spentToday ? v.dailyLimit - v.spentToday : 0;
        resetTime = v.dayStart + 1 days;
    }

    function _rollDay(Vault storage v) internal {
        if (block.timestamp >= v.dayStart + 1 days) {
            v.spentToday = 0;
            v.dayStart = block.timestamp;
        }
    }

    receive() external payable {}
}
