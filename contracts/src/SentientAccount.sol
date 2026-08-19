// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SentientRiskPolicy} from "./SentientRiskPolicy.sol";

/// @title SentientAccount
/// @notice Minimal local-development smart account that queues owner-authorized
/// calls according to a signed Sentient risk assessment.
contract SentientAccount {
    struct QueuedTransaction {
        address target;
        uint256 value;
        bytes data;
        uint64 queuedAt;
        uint64 executeAfter;
        uint16 riskScore;
        SentientRiskPolicy.RiskTier riskTier;
        bool canceled;
        bool executed;
        bytes32 attestationDigest;
    }

    error Unauthorized(address caller);
    error ZeroAddress();
    error UnknownTransaction(bytes32 requestId);
    error QueuedTransactionCanceled(bytes32 requestId);
    error QueuedTransactionAlreadyExecuted(bytes32 requestId);
    error ExecutionTooEarly(bytes32 requestId, uint64 executeAfter, uint256 currentTime);
    error ExternalCallFailed(bytes returnData);
    error ReentrantCall();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TransactionQueued(
        bytes32 indexed requestId,
        address indexed target,
        uint256 value,
        uint16 riskScore,
        SentientRiskPolicy.RiskTier riskTier,
        uint64 executeAfter,
        bytes32 indexed attestationDigest
    );
    event TransactionCanceled(bytes32 indexed requestId);
    event TransactionExecuted(bytes32 indexed requestId, address indexed target, uint256 value, bytes returnData);

    address public owner;
    SentientRiskPolicy public immutable riskPolicy;
    uint256 public queuedCount;

    mapping(bytes32 requestId => QueuedTransaction transactionData) private _transactions;
    bool private _executing;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    modifier nonReentrant() {
        if (_executing) {
            revert ReentrantCall();
        }
        _executing = true;
        _;
        _executing = false;
    }

    constructor(address owner_, SentientRiskPolicy riskPolicy_) {
        if (owner_ == address(0) || address(riskPolicy_) == address(0)) {
            revert ZeroAddress();
        }

        owner = owner_;
        riskPolicy = riskPolicy_;
        emit OwnershipTransferred(address(0), owner_);
    }

    receive() external payable {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /// @notice Consumes one signed risk attestation and queues its exact call.
    /// Low-risk calls have a zero cooldown but still pass through the queue so
    /// every authorized action has a consistent audit trail and cancel state.
    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        SentientRiskPolicy.Attestation calldata attestation,
        bytes calldata signature
    ) external onlyOwner returns (bytes32 requestId) {
        if (target == address(0)) {
            revert ZeroAddress();
        }

        (
            SentientRiskPolicy.RiskTier riskTier,
            uint64 cooldown,
            bytes32 attestationDigest
        ) = riskPolicy.verifyAndConsume(attestation, signature, target, value, keccak256(data));

        requestId = keccak256(abi.encodePacked(address(this), attestationDigest));
        uint64 queuedAt = uint64(block.timestamp);
        uint64 executeAfter = queuedAt + cooldown;

        QueuedTransaction storage transactionData = _transactions[requestId];
        transactionData.target = target;
        transactionData.value = value;
        transactionData.data = data;
        transactionData.queuedAt = queuedAt;
        transactionData.executeAfter = executeAfter;
        transactionData.riskScore = attestation.riskScore;
        transactionData.riskTier = riskTier;
        transactionData.attestationDigest = attestationDigest;

        queuedCount += 1;

        _emitTransactionQueued(requestId);
    }

    function cancelTransaction(bytes32 requestId) external onlyOwner {
        QueuedTransaction storage transactionData = _getTransaction(requestId);
        if (transactionData.executed) {
            revert QueuedTransactionAlreadyExecuted(requestId);
        }
        if (transactionData.canceled) {
            revert QueuedTransactionCanceled(requestId);
        }

        transactionData.canceled = true;
        emit TransactionCanceled(requestId);
    }

    function executeTransaction(bytes32 requestId) external onlyOwner nonReentrant returns (bytes memory returnData) {
        QueuedTransaction storage transactionData = _getTransaction(requestId);
        if (transactionData.canceled) {
            revert QueuedTransactionCanceled(requestId);
        }
        if (transactionData.executed) {
            revert QueuedTransactionAlreadyExecuted(requestId);
        }
        if (block.timestamp < transactionData.executeAfter) {
            revert ExecutionTooEarly(requestId, transactionData.executeAfter, block.timestamp);
        }

        transactionData.executed = true;
        (bool success, bytes memory result) = transactionData.target.call{value: transactionData.value}(
            transactionData.data
        );
        if (!success) {
            revert ExternalCallFailed(result);
        }

        emit TransactionExecuted(requestId, transactionData.target, transactionData.value, result);
        return result;
    }

    function getTransaction(bytes32 requestId) external view returns (QueuedTransaction memory) {
        QueuedTransaction storage transactionData = _getTransaction(requestId);
        return transactionData;
    }

    function _getTransaction(bytes32 requestId) private view returns (QueuedTransaction storage transactionData) {
        transactionData = _transactions[requestId];
        if (transactionData.target == address(0)) {
            revert UnknownTransaction(requestId);
        }
    }

    function _emitTransactionQueued(bytes32 requestId) private {
        QueuedTransaction storage transactionData = _transactions[requestId];
        emit TransactionQueued(
            requestId,
            transactionData.target,
            transactionData.value,
            transactionData.riskScore,
            transactionData.riskTier,
            transactionData.executeAfter,
            transactionData.attestationDigest
        );
    }
}
