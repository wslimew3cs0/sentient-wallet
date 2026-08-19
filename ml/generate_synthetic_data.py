"""Generate a transparent, fixed-seed synthetic wallet transaction dataset."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd

try:
    from .config import (
        DATASET_NAME,
        DATASET_VERSION,
        DEFAULT_ROWS,
        DEFAULT_SEED,
        FEATURE_LABELS,
        GENERATOR_VERSION,
        LABEL_COLUMN,
        MODEL_FEATURES,
        SYNTHETIC_WARNING,
        TRANSACTION_TYPES,
    )
except ImportError:  # Support `python3 ml/generate_synthetic_data.py`.
    from config import (  # type: ignore
        DATASET_NAME,
        DATASET_VERSION,
        DEFAULT_ROWS,
        DEFAULT_SEED,
        FEATURE_LABELS,
        GENERATOR_VERSION,
        LABEL_COLUMN,
        MODEL_FEATURES,
        SYNTHETIC_WARNING,
        TRANSACTION_TYPES,
    )


def _sigmoid(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, -35.0, 35.0)
    return 1.0 / (1.0 + np.exp(-clipped))


def generate_dataset(rows: int = DEFAULT_ROWS, seed: int = DEFAULT_SEED) -> pd.DataFrame:
    """Return deterministic synthetic rows and an explicitly synthetic origin tag."""
    if rows < 500:
        raise ValueError("rows must be at least 500 so each risk class is represented")

    rng = np.random.default_rng(seed)
    transaction_type = rng.choice(
        TRANSACTION_TYPES,
        size=rows,
        p=np.array([0.36, 0.24, 0.25, 0.15]),
    )

    wallet_balance = np.round(
        np.clip(
            rng.lognormal(mean=np.log(12_000.0), sigma=0.90, size=rows),
            500.0,
            500_000.0,
        ),
        2,
    )

    high_amount_event = rng.random(rows) < 0.20
    routine_ratio = rng.beta(1.4, 6.0, size=rows) * 0.78 + 0.002
    concentrated_ratio = 0.35 + rng.beta(3.0, 1.8, size=rows) * 0.70
    sampled_amount_balance_ratio = np.clip(
        np.where(high_amount_event, concentrated_ratio, routine_ratio),
        0.002,
        1.05,
    )
    transaction_amount = np.round(wallet_balance * sampled_amount_balance_ratio, 2)
    # Publish the exact value a browser will derive from the two currency fields.
    amount_balance_ratio = transaction_amount / wallet_balance

    burst = (rng.random(rows) < 0.12) * rng.poisson(4.0, size=rows)
    transactions_1h = np.clip(rng.poisson(1.15, size=rows) + burst, 0, 20)
    daily_burst = (rng.random(rows) < 0.08) * rng.poisson(10.0, size=rows)
    transactions_24h = np.clip(
        transactions_1h + rng.poisson(3.8, size=rows) + daily_burst,
        0,
        80,
    )
    time_scale = 180.0 / (transactions_1h + 1.0)
    time_since_previous_transaction = np.clip(
        rng.gamma(shape=1.8, scale=time_scale, size=rows),
        0.25,
        10_080.0,
    )

    volatility_shock = np.where(
        rng.random(rows) < 0.10,
        rng.uniform(0.10, 0.28, size=rows),
        0.0,
    )
    market_volatility = np.clip(
        rng.beta(2.0, 8.0, size=rows) * 0.45 + volatility_shock,
        0.002,
        0.55,
    )
    asset_volatility = np.clip(
        market_volatility * rng.uniform(0.75, 1.70, size=rows)
        + rng.beta(1.8, 10.0, size=rows) * 0.24,
        0.003,
        0.85,
    )
    portfolio_drawdown = np.clip(
        rng.beta(1.5, 7.0, size=rows) * 0.68
        + (rng.random(rows) < 0.08) * rng.uniform(0.10, 0.28, size=rows),
        0.0,
        0.80,
    )

    destination_probability = np.where(
        transaction_type == "CONTRACT_CALL",
        0.55,
        np.where(transaction_type == "TRANSFER", 0.65, 0.80),
    )
    destination_seen_before = (
        rng.random(rows) < destination_probability
    ).astype(int)
    known_destination_age = rng.lognormal(mean=5.45, sigma=1.10, size=rows)
    new_destination_age = rng.exponential(scale=9.0, size=rows)
    destination_age_days = np.clip(
        np.where(
            destination_seen_before == 1,
            known_destination_age,
            new_destination_age,
        ),
        0.0,
        3_650.0,
    )

    contract_interaction = (
        (transaction_type == "CONTRACT_CALL")
        | (rng.random(rows) < 0.07)
    ).astype(int)
    approval_ratio = np.where(
        contract_interaction == 1,
        np.clip(rng.lognormal(mean=-0.35, sigma=0.75, size=rows), 0.01, 2.50),
        0.0,
    )
    estimated_slippage = np.clip(
        rng.beta(1.3, 12.0, size=rows) * 0.20 + asset_volatility * 0.055,
        0.0001,
        0.25,
    )

    hour_of_day = rng.integers(0, 24, size=rows)
    weekend = (rng.random(rows) < (2.0 / 7.0)).astype(int)
    recent_cancelled_transactions = np.clip(rng.poisson(0.28, size=rows), 0, 8)
    recent_high_risk_transactions = np.clip(rng.poisson(0.22, size=rows), 0, 8)

    # Transparent synthetic-label mechanism. This is deliberately based only on
    # observable transaction/context proxies, never mental-health or emotion data.
    rapid_repeat = np.exp(-time_since_previous_transaction / 45.0)
    young_destination = np.exp(-destination_age_days / 30.0)
    velocity_1h = np.minimum(transactions_1h, 10) / 10.0
    velocity_24h = np.minimum(transactions_24h, 40) / 40.0
    approval_exposure = np.minimum(approval_ratio, 2.0) / 2.0
    slippage_exposure = np.minimum(estimated_slippage, 0.20) / 0.20
    overnight = ((hour_of_day <= 5) | (hour_of_day >= 23)).astype(float)
    unseen_destination = 1.0 - destination_seen_before

    type_effect = np.select(
        [
            transaction_type == "BUY",
            transaction_type == "SELL",
            transaction_type == "CONTRACT_CALL",
        ],
        [0.24, 0.10, 0.28],
        default=0.0,
    )

    latent_risk = (
        -4.05
        + 3.25 * amount_balance_ratio
        + 1.45 * velocity_1h
        + 0.80 * velocity_24h
        + 0.88 * rapid_repeat
        + 2.15 * market_volatility
        + 1.75 * asset_volatility
        + 2.10 * portfolio_drawdown
        + 0.70 * unseen_destination
        + 0.38 * young_destination
        + 0.42 * contract_interaction
        + 0.66 * approval_exposure
        + 0.82 * slippage_exposure
        + 0.24 * overnight
        + 0.12 * weekend
        + 0.28 * np.minimum(recent_cancelled_transactions, 3)
        + 0.48 * np.minimum(recent_high_risk_transactions, 3)
        + type_effect
        + 1.05
        * (
            (amount_balance_ratio >= 0.65)
            & (market_volatility >= 0.18)
        ).astype(float)
        + 0.62 * (unseen_destination * contract_interaction)
        + rng.normal(loc=0.0, scale=0.62, size=rows)
    )
    risk_probability = _sigmoid(latent_risk)
    risk_label = (rng.random(rows) < risk_probability).astype(int)

    frame = pd.DataFrame(
        {
            "transaction_id": [f"SYN-{index:06d}" for index in range(1, rows + 1)],
            "data_origin": "SYNTHETIC",
            "generator_version": GENERATOR_VERSION,
            "transaction_type": transaction_type,
            "transaction_amount": transaction_amount,
            "wallet_balance": wallet_balance,
            "amount_balance_ratio": amount_balance_ratio,
            "transactions_1h": transactions_1h.astype(int),
            "transactions_24h": transactions_24h.astype(int),
            "time_since_previous_transaction": np.round(
                time_since_previous_transaction, 6
            ),
            "market_volatility": np.round(market_volatility, 8),
            "asset_volatility": np.round(asset_volatility, 8),
            "portfolio_drawdown": np.round(portfolio_drawdown, 8),
            "destination_seen_before": destination_seen_before.astype(int),
            "destination_age_days": np.round(destination_age_days, 6),
            "contract_interaction": contract_interaction.astype(int),
            "approval_ratio": np.round(approval_ratio, 8),
            "estimated_slippage": np.round(estimated_slippage, 8),
            "hour_of_day": hour_of_day.astype(int),
            "weekend": weekend.astype(int),
            "recent_cancelled_transactions": recent_cancelled_transactions.astype(int),
            "recent_high_risk_transactions": recent_high_risk_transactions.astype(int),
            LABEL_COLUMN: risk_label.astype(int),
        }
    )

    validate_dataset(frame)
    return frame


def validate_dataset(frame: pd.DataFrame) -> None:
    required = {
        "transaction_id",
        "data_origin",
        "generator_version",
        *MODEL_FEATURES,
        LABEL_COLUMN,
    }
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(f"synthetic dataset is missing columns: {sorted(missing)}")
    if frame.empty:
        raise ValueError("synthetic dataset is empty")
    if set(frame["data_origin"].unique()) != {"SYNTHETIC"}:
        raise ValueError("every row must be explicitly labelled SYNTHETIC")
    if not set(frame[LABEL_COLUMN].unique()).issubset({0, 1}):
        raise ValueError("risk_label must be binary")
    if frame[LABEL_COLUMN].nunique() != 2:
        raise ValueError("both risk classes must be represented")
    if not frame["transaction_type"].isin(TRANSACTION_TYPES).all():
        raise ValueError("transaction_type contains an unsupported value")
    if (frame["transaction_amount"] <= 0).any():
        raise ValueError("transaction_amount must be positive")
    if (frame["wallet_balance"] <= 0).any():
        raise ValueError("wallet_balance must be positive")


def csv_bytes(frame: pd.DataFrame) -> bytes:
    """Serialize with stable formatting for byte-level reproducibility checks."""
    return frame.to_csv(index=False, lineterminator="\n").encode("utf-8")


def dataset_sha256(frame: pd.DataFrame) -> str:
    return hashlib.sha256(csv_bytes(frame)).hexdigest()


def write_dataset(
    frame: pd.DataFrame,
    output_path: Path,
    metadata_path: Path,
    seed: int,
) -> Dict[str, Any]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    payload = csv_bytes(frame)
    output_path.write_bytes(payload)

    positive_count = int(frame[LABEL_COLUMN].sum())
    metadata: Dict[str, Any] = {
        "dataset_name": DATASET_NAME,
        "dataset_version": DATASET_VERSION,
        "data_origin": "SYNTHETIC",
        "warning": SYNTHETIC_WARNING,
        "generator_version": GENERATOR_VERSION,
        "seed": int(seed),
        "row_count": int(len(frame)),
        "positive_label_count": positive_count,
        "negative_label_count": int(len(frame) - positive_count),
        "positive_label_rate": round(positive_count / len(frame), 10),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "label_column": LABEL_COLUMN,
        "model_features": MODEL_FEATURES,
        "feature_labels": FEATURE_LABELS,
        "generation_summary": {
            "balances_and_amounts": "Seeded log-normal balances and a mixture of routine and concentrated amount ratios.",
            "velocity": "Seeded Poisson transaction counts with occasional burst regimes.",
            "market_context": "Seeded beta-distributed volatility and drawdown with occasional shocks.",
            "destination_and_contract": "Seeded prior-use, age, contract-interaction, approval, and slippage proxies.",
            "labels": "Bernoulli draws from a documented proxy-based latent-risk function plus seeded noise.",
        },
    }
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    return metadata


def generate_and_write(
    rows: int,
    seed: int,
    output_path: Path,
    metadata_path: Path,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    frame = generate_dataset(rows=rows, seed=seed)
    metadata = write_dataset(frame, output_path, metadata_path, seed)
    return frame, metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/data/synthetic_transactions.csv"),
    )
    parser.add_argument(
        "--metadata-output",
        type=Path,
        default=Path("ml/data/dataset-metadata.json"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame, metadata = generate_and_write(
        rows=args.rows,
        seed=args.seed,
        output_path=args.output,
        metadata_path=args.metadata_output,
    )
    print(
        f"Generated {len(frame)} explicitly synthetic rows at {args.output} "
        f"(positive rate={metadata['positive_label_rate']:.3f}, "
        f"sha256={metadata['sha256']})."
    )


if __name__ == "__main__":
    main()
