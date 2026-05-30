// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAgentRequester.sol";

/// @dev Testnet mock — simulates Somnia platform createRequest + callback for Hardhat tests
contract MockSomniaPlatform is IAgentRequester {
    uint256 public nextRequestId = 1;
    uint256 public depositOverride;

    struct StoredRequest {
        address callbackAddress;
        bytes4 callbackSelector;
        bytes payload;
        bool finalized;
    }

    mapping(uint256 => StoredRequest) public requests;

    function setDepositOverride(uint256 amount) external {
        depositOverride = amount;
    }

    function getRequestDeposit() external view returns (uint256) {
        return depositOverride > 0 ? depositOverride : 12e16;
    }

    function createRequest(
        uint256,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId) {
        uint256 deposit = depositOverride > 0 ? depositOverride : 12e16;
        require(msg.value >= deposit, "Insufficient deposit");
        requestId = nextRequestId++;
        requests[requestId] = StoredRequest({
            callbackAddress: callbackAddress,
            callbackSelector: callbackSelector,
            payload: payload,
            finalized: false
        });
        emit RequestCreated(requestId, 13174292974160097713, 0.03 ether, payload, new address[](0));
    }

    function getRequest(uint256) external pure returns (Request memory) {
        revert("Not implemented in mock");
    }

    /// @notice Test helper — deliver a successful price response to the callback contract
    function finalizeWithPrice(uint256 requestId, uint256 price) external {
        StoredRequest storage req = requests[requestId];
        require(!req.finalized, "Already finalized");

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(this),
            result: abi.encode(price),
            status: ResponseStatus.Success,
            receipt: 1,
            timestamp: block.timestamp,
            executionCost: 0.01 ether
        });

        Request memory details;
        (bool ok,) = req.callbackAddress.call(
            abi.encodeWithSelector(req.callbackSelector, requestId, responses, ResponseStatus.Success, details)
        );
        require(ok, "Callback failed");
        req.finalized = true;
        emit RequestFinalized(requestId, ResponseStatus.Success);
    }
}
