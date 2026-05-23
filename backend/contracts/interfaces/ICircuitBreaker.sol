// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitBreaker {
    function reportFailure() external;
    function reportSuccess() external;
    function isPaused() external view returns (bool);
}
