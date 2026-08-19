"""Shared, versioned configuration for the IRS model pipeline."""

from __future__ import annotations

DEFAULT_SEED = 20260819
DEFAULT_ROWS = 6_000
DEFAULT_TEST_SIZE = 0.25
DEFAULT_FOREST_ESTIMATORS = 300

DATASET_NAME = "Sentient Wallet Synthetic Behavioral Transactions"
DATASET_VERSION = "synthetic-transactions-v1.0.0"
GENERATOR_VERSION = "1.0.0"
MODEL_NAME = "Sentient IRS Logistic Regression"
MODEL_VERSION = "1.0.0"

TRANSACTION_TYPES = ["BUY", "SELL", "TRANSFER", "CONTRACT_CALL"]

NUMERIC_FEATURES = [
    "transaction_amount",
    "wallet_balance",
    "amount_balance_ratio",
    "transactions_1h",
    "transactions_24h",
    "time_since_previous_transaction",
    "market_volatility",
    "asset_volatility",
    "portfolio_drawdown",
    "destination_seen_before",
    "destination_age_days",
    "contract_interaction",
    "approval_ratio",
    "estimated_slippage",
    "hour_of_day",
    "weekend",
    "recent_cancelled_transactions",
    "recent_high_risk_transactions",
]

CATEGORICAL_FEATURES = ["transaction_type"]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
LABEL_COLUMN = "risk_label"

FEATURE_LABELS = {
    "transaction_type": "Transaction type",
    "transaction_amount": "Transaction amount",
    "wallet_balance": "Available wallet balance",
    "amount_balance_ratio": "Transaction relative to wallet balance",
    "transactions_1h": "Transactions initiated within one hour",
    "transactions_24h": "Transactions initiated within 24 hours",
    "time_since_previous_transaction": "Time since the previous transaction",
    "market_volatility": "Market volatility",
    "asset_volatility": "Asset volatility",
    "portfolio_drawdown": "Recent portfolio drawdown",
    "destination_seen_before": "Destination previously used",
    "destination_age_days": "Destination age",
    "contract_interaction": "Smart-contract interaction",
    "approval_ratio": "Approval relative to transaction value",
    "estimated_slippage": "Estimated slippage",
    "hour_of_day": "Hour of day",
    "weekend": "Weekend transaction",
    "recent_cancelled_transactions": "Recently cancelled transactions",
    "recent_high_risk_transactions": "Recent high-risk transactions",
}

FEATURE_UNITS = {
    "transaction_amount": "USDT",
    "wallet_balance": "USDT",
    "amount_balance_ratio": "ratio",
    "transactions_1h": "count",
    "transactions_24h": "count",
    "time_since_previous_transaction": "minutes",
    "market_volatility": "ratio",
    "asset_volatility": "ratio",
    "portfolio_drawdown": "ratio",
    "destination_age_days": "days",
    "approval_ratio": "ratio",
    "estimated_slippage": "ratio",
    "hour_of_day": "hour_utc",
    "recent_cancelled_transactions": "count",
    "recent_high_risk_transactions": "count",
}

RISK_BANDS = [
    {"minimum": 0.0, "maximum_exclusive": 0.35, "level": "LOW", "recommended_policy": "ALLOW"},
    {
        "minimum": 0.35,
        "maximum_exclusive": 0.60,
        "level": "MODERATE",
        "recommended_policy": "ADDITIONAL_CONFIRMATION",
    },
    {"minimum": 0.60, "maximum_exclusive": 0.80, "level": "HIGH", "recommended_policy": "COOLDOWN"},
    {"minimum": 0.80, "maximum_exclusive": 1.01, "level": "CRITICAL", "recommended_policy": "COOLDOWN"},
]

EVALUATION_THRESHOLD = 0.50
DEFAULT_POLICY_THRESHOLD = 0.80

# Accuracy is intentionally absent. The weights reflect the documented product
# trade-off: missed risky transactions matter, but calibration and an auditable
# browser implementation are also material requirements.
SELECTION_WEIGHTS = {
    "roc_auc": 0.28,
    "recall": 0.18,
    "precision": 0.10,
    "f1": 0.12,
    "calibration": 0.20,
    "interpretability": 0.12,
}

INTERPRETABILITY_SCORES = {
    "logistic_regression": 1.0,
    "random_forest": 0.35,
}

SYNTHETIC_WARNING = (
    "SYNTHETIC DATA ONLY. Labels are generated from documented behavioral-risk "
    "proxy rules plus seeded noise; they are not observations of emotion, intent, "
    "creditworthiness, or real financial harm."
)
