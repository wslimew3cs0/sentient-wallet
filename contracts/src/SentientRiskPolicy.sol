// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal ECDSA recovery for development attestations. It rejects
/// malleable signatures and only accepts canonical 65-byte signatures.
library SentientECDSA {
    error InvalidSignature();
    error InvalidSignatureLength(uint256 length);
    error InvalidSignatureS(bytes32 s);
    error InvalidSignatureV(uint8 v);

    uint256 private constant _SECP256K1N_HALF =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    function recover(bytes32 digest, bytes calldata signature) internal pure returns (address signer) {
        if (signature.length != 65) {
            revert InvalidSignatureLength(signature.length);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly ("memory-safe") {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }

        if (uint256(s) > _SECP256K1N_HALF) {
            revert InvalidSignatureS(s);
        }
        if (v != 27 && v != 28) {
            revert InvalidSignatureV(v);
        }

        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) {
            revert InvalidSignature();
        }
    }
}

/// @title SentientRiskPolicy
/// @notice Development policy that verifies EIP-712 risk attestations and
/// assigns transaction cooldowns. The trusted signer is deliberately local-
/// only for the prototype; production deployments require hardened key
/// management and independent contract review.
contract SentientRiskPolicy {
    enum RiskTier {
        Low,
        Moderate,
        High,
        Critical
    }

    struct Attestation {
        address account;
        address target;
        uint256 value;
        bytes32 dataHash;
        uint16 riskScore;
        uint256 nonce;
        uint256 policyVersion;
        uint64 expiresAt;
    }

    error Unauthorized(address caller);
    error ZeroAddress();
    error InvalidThresholds(uint16 moderate, uint16 high, uint16 critical);
    error InvalidCooldowns(uint64 moderate, uint64 high, uint64 critical);
    error RiskScoreOutOfRange(uint16 riskScore);
    error AttestationAccountMismatch(address expected, address supplied);
    error TransactionDetailsMismatch();
    error AttestationExpired(uint64 expiresAt, uint256 currentTime);
    error PolicyVersionMismatch(uint256 expected, uint256 supplied);
    error NonceMismatch(address account, uint256 expected, uint256 supplied);
    error AttestationAlreadyUsed(bytes32 digest);
    error InvalidSigner(address recovered, address expected);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TrustedSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event ThresholdsUpdated(uint16 moderate, uint16 high, uint16 critical);
    event CooldownsUpdated(uint64 moderate, uint64 high, uint64 critical);
    event PolicyVersionUpdated(uint256 indexed previousVersion, uint256 indexed newVersion);
    event AttestationConsumed(
        address indexed account,
        bytes32 indexed digest,
        uint256 indexed nonce,
        uint16 riskScore,
        RiskTier riskTier,
        uint64 cooldown
    );

    string public constant NAME = "SentientRiskPolicy";
    string public constant VERSION = "1";
    uint16 public constant MAX_RISK_SCORE = 100;

    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(address account,address target,uint256 value,bytes32 dataHash,uint16 riskScore,uint256 nonce,uint256 policyVersion,uint64 expiresAt)"
    );

    address public owner;
    address public trustedSigner;

    uint16 public moderateThreshold;
    uint16 public highThreshold;
    uint16 public criticalThreshold;

    uint64 public moderateCooldown;
    uint64 public highCooldown;
    uint64 public criticalCooldown;

    uint256 public policyVersion = 1;

    mapping(address account => uint256 nonce) public nextNonce;
    mapping(bytes32 digest => bool consumed) public consumedAttestations;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    constructor(
        address trustedSigner_,
        uint16 moderateThreshold_,
        uint16 highThreshold_,
        uint16 criticalThreshold_,
        uint64 moderateCooldown_,
        uint64 highCooldown_,
        uint64 criticalCooldown_
    ) {
        if (trustedSigner_ == address(0)) {
            revert ZeroAddress();
        }

        _validateThresholds(moderateThreshold_, highThreshold_, criticalThreshold_);
        _validateCooldowns(moderateCooldown_, highCooldown_, criticalCooldown_);

        owner = msg.sender;
        trustedSigner = trustedSigner_;
        moderateThreshold = moderateThreshold_;
        highThreshold = highThreshold_;
        criticalThreshold = criticalThreshold_;
        moderateCooldown = moderateCooldown_;
        highCooldown = highCooldown_;
        criticalCooldown = criticalCooldown_;

        emit OwnershipTransferred(address(0), msg.sender);
        emit TrustedSignerUpdated(address(0), trustedSigner_);
        emit ThresholdsUpdated(moderateThreshold_, highThreshold_, criticalThreshold_);
        emit CooldownsUpdated(moderateCooldown_, highCooldown_, criticalCooldown_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function updateTrustedSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) {
            revert ZeroAddress();
        }

        address previousSigner = trustedSigner;
        trustedSigner = newSigner;
        emit TrustedSignerUpdated(previousSigner, newSigner);
        _advancePolicyVersion();
    }

    function updateThresholds(uint16 moderate, uint16 high, uint16 critical) external onlyOwner {
        _validateThresholds(moderate, high, critical);

        moderateThreshold = moderate;
        highThreshold = high;
        criticalThreshold = critical;
        emit ThresholdsUpdated(moderate, high, critical);
        _advancePolicyVersion();
    }

    function updateCooldowns(uint64 moderate, uint64 high, uint64 critical) external onlyOwner {
        _validateCooldowns(moderate, high, critical);

        moderateCooldown = moderate;
        highCooldown = high;
        criticalCooldown = critical;
        emit CooldownsUpdated(moderate, high, critical);
        _advancePolicyVersion();
    }

    function riskTierFor(uint16 riskScore) public view returns (RiskTier) {
        if (riskScore > MAX_RISK_SCORE) {
            revert RiskScoreOutOfRange(riskScore);
        }
        if (riskScore >= criticalThreshold) {
            return RiskTier.Critical;
        }
        if (riskScore >= highThreshold) {
            return RiskTier.High;
        }
        if (riskScore >= moderateThreshold) {
            return RiskTier.Moderate;
        }
        return RiskTier.Low;
    }

    function cooldownFor(RiskTier riskTier) public view returns (uint64) {
        if (riskTier == RiskTier.Critical) {
            return criticalCooldown;
        }
        if (riskTier == RiskTier.High) {
            return highCooldown;
        }
        if (riskTier == RiskTier.Moderate) {
            return moderateCooldown;
        }
        return 0;
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    function hashAttestation(Attestation calldata attestation) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                attestation.account,
                attestation.target,
                attestation.value,
                attestation.dataHash,
                attestation.riskScore,
                attestation.nonce,
                attestation.policyVersion,
                attestation.expiresAt
            )
        );
    }

    function digestFor(Attestation calldata attestation) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), hashAttestation(attestation)));
    }

    /// @notice Verifies and consumes a signed assessment for the calling account.
    /// @dev `msg.sender` must be the account bound into the attestation. The
    /// caller also supplies the transaction details so the account cannot reuse
    /// a signature for a different call.
    function verifyAndConsume(
        Attestation calldata attestation,
        bytes calldata signature,
        address target,
        uint256 value,
        bytes32 dataHash
    ) external returns (RiskTier riskTier, uint64 cooldown, bytes32 digest) {
        if (attestation.account != msg.sender) {
            revert AttestationAccountMismatch(msg.sender, attestation.account);
        }
        if (
            attestation.target != target ||
            attestation.value != value ||
            attestation.dataHash != dataHash
        ) {
            revert TransactionDetailsMismatch();
        }
        if (block.timestamp > attestation.expiresAt) {
            revert AttestationExpired(attestation.expiresAt, block.timestamp);
        }
        if (attestation.policyVersion != policyVersion) {
            revert PolicyVersionMismatch(policyVersion, attestation.policyVersion);
        }
        if (attestation.riskScore > MAX_RISK_SCORE) {
            revert RiskScoreOutOfRange(attestation.riskScore);
        }

        digest = digestFor(attestation);
        if (consumedAttestations[digest]) {
            revert AttestationAlreadyUsed(digest);
        }

        address recoveredSigner = SentientECDSA.recover(digest, signature);
        if (recoveredSigner != trustedSigner) {
            revert InvalidSigner(recoveredSigner, trustedSigner);
        }

        uint256 expectedNonce = nextNonce[msg.sender];
        if (attestation.nonce != expectedNonce) {
            revert NonceMismatch(msg.sender, expectedNonce, attestation.nonce);
        }

        consumedAttestations[digest] = true;
        nextNonce[msg.sender] = expectedNonce + 1;

        riskTier = riskTierFor(attestation.riskScore);
        cooldown = cooldownFor(riskTier);

        emit AttestationConsumed(
            msg.sender,
            digest,
            expectedNonce,
            attestation.riskScore,
            riskTier,
            cooldown
        );
    }

    function _advancePolicyVersion() private {
        uint256 previousVersion = policyVersion;
        policyVersion = previousVersion + 1;
        emit PolicyVersionUpdated(previousVersion, policyVersion);
    }

    function _validateThresholds(uint16 moderate, uint16 high, uint16 critical) private pure {
        if (
            moderate == 0 ||
            moderate >= high ||
            high >= critical ||
            critical > MAX_RISK_SCORE
        ) {
            revert InvalidThresholds(moderate, high, critical);
        }
    }

    function _validateCooldowns(uint64 moderate, uint64 high, uint64 critical) private pure {
        if (moderate == 0 || moderate > high || high > critical) {
            revert InvalidCooldowns(moderate, high, critical);
        }
    }
}
