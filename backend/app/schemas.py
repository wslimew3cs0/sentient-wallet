from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


FiniteFloat = Annotated[float, Field(strict=True, allow_inf_nan=False)]
NonNegativeFloat = Annotated[FiniteFloat, Field(ge=0)]
PositiveFloat = Annotated[FiniteFloat, Field(gt=0)]
NonNegativeInt = Annotated[int, Field(strict=True, ge=0)]
PositiveInt = Annotated[int, Field(strict=True, gt=0)]
EthereumAddress = Annotated[str, StringConstraints(pattern=r"^0x[a-fA-F0-9]{40}$")]
HexData = Annotated[str, StringConstraints(pattern=r"^0x(?:[a-fA-F0-9]{2})*$")]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class RiskFeatures(StrictSchema):
    transaction_type: Literal["BUY", "SELL", "TRANSFER", "CONTRACT_CALL"]
    transaction_amount: PositiveFloat
    wallet_balance: PositiveFloat
    amount_balance_ratio: NonNegativeFloat
    transactions_1h: NonNegativeInt
    transactions_24h: NonNegativeInt
    time_since_previous_transaction: NonNegativeFloat
    market_volatility: NonNegativeFloat
    asset_volatility: NonNegativeFloat
    portfolio_drawdown: NonNegativeFloat
    destination_seen_before: Literal[0, 1]
    destination_age_days: NonNegativeFloat
    contract_interaction: Literal[0, 1]
    approval_ratio: NonNegativeFloat
    estimated_slippage: NonNegativeFloat
    hour_of_day: Annotated[int, Field(strict=True, ge=0, le=23)]
    weekend: Literal[0, 1]
    recent_cancelled_transactions: NonNegativeInt
    recent_high_risk_transactions: NonNegativeInt


class AttestationContext(StrictSchema):
    account: EthereumAddress
    target: EthereumAddress
    value: NonNegativeInt = 0
    data: HexData = "0x"
    nonce: NonNegativeInt
    policy_version: PositiveInt
    chain_id: PositiveInt = 31337
    verifying_contract: EthereumAddress
    expires_at: NonNegativeInt | None = None
    valid_for_seconds: Annotated[int, Field(strict=True, ge=1, le=3600)] = 300


class RiskAssessmentRequest(StrictSchema):
    features: RiskFeatures
    attestation: AttestationContext | None = None


class RiskDriver(StrictSchema):
    feature: str
    label: str
    impact: float
    direction: Literal["INCREASES_RISK", "DECREASES_RISK", "NEUTRAL"]


class EIP712Field(StrictSchema):
    name: str
    type: str


class EIP712Domain(StrictSchema):
    name: str
    version: str
    chainId: int
    verifyingContract: EthereumAddress


class AttestationMessage(StrictSchema):
    account: EthereumAddress
    target: EthereumAddress
    value: int
    dataHash: Annotated[str, StringConstraints(pattern=r"^0x[a-fA-F0-9]{64}$")]
    riskScore: Annotated[int, Field(ge=0, le=100)]
    nonce: int
    policyVersion: int
    expiresAt: int


class SignedAttestation(StrictSchema):
    domain: EIP712Domain
    types: dict[str, list[EIP712Field]]
    primaryType: Literal["Attestation"]
    message: AttestationMessage
    digest: Annotated[str, StringConstraints(pattern=r"^0x[a-fA-F0-9]{64}$")]
    signature: Annotated[str, StringConstraints(pattern=r"^0x[a-fA-F0-9]{130}$")]
    signer: EthereumAddress
    developmentOnly: Literal[True]


class RiskAssessmentResponse(StrictSchema):
    model_name: str
    model_version: str
    model_status: str
    data_origin: Literal["SYNTHETIC"]
    risk_probability: Annotated[float, Field(ge=0, le=1)]
    irs_score: Annotated[int, Field(ge=0, le=100)]
    risk_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    recommended_policy: Literal["ALLOW", "ADDITIONAL_CONFIRMATION", "COOLDOWN"]
    explanation: list[RiskDriver]
    summary: str
    warning: str
    attestation: SignedAttestation | None = None


class HealthResponse(StrictSchema):
    service: Literal["sentient-risk-api"]
    status: Literal["ok", "degraded"]
    model_available: bool
    model_version: str | None
    model_parity_validated: bool
    attestation_available: bool
    error: str | None = None


class RiskBand(StrictSchema):
    level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    minimum: float
    maximum_exclusive: float
    recommended_policy: Literal["ALLOW", "ADDITIONAL_CONFIRMATION", "COOLDOWN"]


class ModelInfoResponse(StrictSchema):
    model_name: str
    model_version: str
    model_type: str
    model_status: str
    schema_version: str
    data_origin: Literal["SYNTHETIC"]
    input_features: list[str]
    risk_bands: list[RiskBand]
    artifact_sha256: str
    metadata_sha256_match: bool
    parity_vectors_validated: bool
    integrity_warnings: list[str]
    warning: str


class ConfusionMatrix(StrictSchema):
    labels: list[int]
    matrix: list[list[int]]
    true_negative: int
    false_positive: int
    false_negative: int
    true_positive: int


class ModelMetricsResponse(StrictSchema):
    model_name: str
    model_version: str
    selected_model: str
    data_origin: Literal["SYNTHETIC"]
    test_rows: int
    evaluation_threshold: float
    roc_auc: float
    precision: float
    recall: float
    f1: float
    brier_score: float
    expected_calibration_error: float
    false_positive_rate: float
    false_negative_rate: float
    confusion_matrix: ConfusionMatrix
    limitations: list[str]
    warning: str
