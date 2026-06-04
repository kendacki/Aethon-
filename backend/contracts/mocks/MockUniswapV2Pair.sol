// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Lightweight reserve pair for AETHON arbitrage skill integration tests on Somnia.
contract MockUniswapV2Pair {
    uint112 public reserve0;
    uint112 public reserve1;
    uint32 public blockTimestampLast;

    constructor(uint112 _r0, uint112 _r1) {
        reserve0 = _r0;
        reserve1 = _r1;
        blockTimestampLast = uint32(block.timestamp);
    }

    function getReserves() external view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function setReserves(uint112 _r0, uint112 _r1) external {
        reserve0 = _r0;
        reserve1 = _r1;
        blockTimestampLast = uint32(block.timestamp);
    }
}
