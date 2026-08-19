from __future__ import annotations

import os
import time
from collections.abc import Callable
from typing import Any

from eth_account import Account
from eth_account.messages import encode_typed_data
from eth_utils import keccak, to_checksum_address

from .schemas import AttestationContext


DEFAULT_LOCAL_RISK_SIGNER_LABEL = "sentient-wallet/local-dev-risk-signer/v1"
LOCAL_DEVELOPMENT_CHAIN_ID = 31337


def derive_local_development_key(
    label: str = DEFAULT_LOCAL_RISK_SIGNER_LABEL,
) -> bytes:
    """Derive a public, deterministic key for the disposable local demo only."""

    return keccak(text=label)


class AttestationUnavailableError(RuntimeError):
    """Raised when development attestation signing is disabled."""


class DevelopmentAttestationSigner:
    TYPES = {
        "EIP712Domain": [
            {"name": "name", "type": "string"},
            {"name": "version", "type": "string"},
            {"name": "chainId", "type": "uint256"},
            {"name": "verifyingContract", "type": "address"},
        ],
        "Attestation": [
            {"name": "account", "type": "address"},
            {"name": "target", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "dataHash", "type": "bytes32"},
            {"name": "riskScore", "type": "uint16"},
            {"name": "nonce", "type": "uint256"},
            {"name": "policyVersion", "type": "uint256"},
            {"name": "expiresAt", "type": "uint64"},
        ],
    }

    def __init__(
        self,
        environment: str = "development",
        private_key: str | bytes | None = None,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self.environment = environment
        self.clock = clock
        configured_key = private_key or os.getenv("SENTIENT_DEV_ATTESTATION_KEY")
        signer_label = os.getenv(
            "SENTIENT_DEV_SIGNER_LABEL", DEFAULT_LOCAL_RISK_SIGNER_LABEL
        )
        self.private_key = configured_key or (
            derive_local_development_key(signer_label)
            if environment == "development"
            else None
        )
        self.enabled = environment == "development" and self.private_key is not None
        self._account = Account.from_key(self.private_key) if self.enabled else None

    @property
    def address(self) -> str | None:
        return self._account.address if self._account else None

    @staticmethod
    def _hex(value: bytes) -> str:
        rendered = value.hex()
        return rendered if rendered.startswith("0x") else f"0x{rendered}"

    def sign(self, context: AttestationContext, risk_score: int) -> dict[str, Any]:
        if not self.enabled or self._account is None:
            raise AttestationUnavailableError(
                "EIP-712 attestation signing is available only in development mode"
            )
        if context.chain_id != LOCAL_DEVELOPMENT_CHAIN_ID:
            raise ValueError(
                "development attestations require local Hardhat chain ID 31337"
            )

        expires_at = (
            context.expires_at
            if context.expires_at is not None
            else int(self.clock()) + context.valid_for_seconds
        )
        if expires_at <= int(self.clock()):
            raise ValueError("expires_at must be in the future")

        data_bytes = bytes.fromhex(context.data[2:])
        domain = {
            "name": "SentientRiskPolicy",
            "version": "1",
            "chainId": context.chain_id,
            "verifyingContract": to_checksum_address(context.verifying_contract),
        }
        message = {
            "account": to_checksum_address(context.account),
            "target": to_checksum_address(context.target),
            "value": context.value,
            "dataHash": self._hex(keccak(data_bytes)),
            "riskScore": risk_score,
            "nonce": context.nonce,
            "policyVersion": context.policy_version,
            "expiresAt": expires_at,
        }
        typed_data = {
            "types": self.TYPES,
            "primaryType": "Attestation",
            "domain": domain,
            "message": message,
        }
        signable = encode_typed_data(full_message=typed_data)
        signed = Account.sign_message(signable, private_key=self.private_key)

        return {
            **typed_data,
            "digest": self._hex(signed.message_hash),
            "signature": self._hex(signed.signature),
            "signer": self._account.address,
            "developmentOnly": True,
        }
