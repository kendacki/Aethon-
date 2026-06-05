// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Accepts arbitrary calldata for vault execution tests.
contract MockCallTarget {
    event Called(bytes data);

    fallback(bytes calldata data) external returns (bytes memory) {
        emit Called(data);
        return data;
    }
}
