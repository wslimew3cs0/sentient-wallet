"""Export the selected IRS model as deterministic browser-readable JSON."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Mapping, Tuple

import joblib
import numpy as np

try:
    from .config import (
        DATASET_VERSION,
        DEFAULT_POLICY_THRESHOLD,
        EVALUATION_THRESHOLD,
        FEATURE_LABELS,
        FEATURE_UNITS,
        MODEL_FEATURES,
        MODEL_NAME,
        MODEL_VERSION,
        RISK_BANDS,
        SYNTHETIC_WARNING,
        TRANSACTION_TYPES,
    )
    from .modeling import (
        json_ready,
        portable_probability,
        predict_probabilities,
        risk_level,
    )
except ImportError:  # Support direct script execution from ml/.
    from config import (  # type: ignore
        DATASET_VERSION,
        DEFAULT_POLICY_THRESHOLD,
        EVALUATION_THRESHOLD,
        FEATURE_LABELS,
        FEATURE_UNITS,
        MODEL_FEATURES,
        MODEL_NAME,
        MODEL_VERSION,
        RISK_BANDS,
        SYNTHETIC_WARNING,
        TRANSACTION_TYPES,
    )
    from modeling import (  # type: ignore
        json_ready,
        portable_probability,
        predict_probabilities,
        risk_level,
    )


def _write_json(path: Path, payload: Mapping[str, Any]) -> bytes:
    encoded = (
        json.dumps(
            json_ready(payload, decimals=12),
            indent=2,
            sort_keys=True,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    return encoded


def _verify_exported_hashes(output_dir: Path, metadata: Mapping[str, Any]) -> None:
    for filename, expected in metadata["artifacts"].items():
        actual = hashlib.sha256((output_dir / filename).read_bytes()).hexdigest()
        if actual != expected:
            raise RuntimeError(
                f"exported artifact checksum mismatch for {filename}: "
                f"expected {expected}, found {actual}"
            )


def _input_schema() -> List[Dict[str, Any]]:
    definitions: Dict[str, Dict[str, Any]] = {
        "transaction_type": {
            "type": "string",
            "enum": TRANSACTION_TYPES,
        },
        "transaction_amount": {"type": "number", "exclusive_minimum": 0.0},
        "wallet_balance": {"type": "number", "exclusive_minimum": 0.0},
        "amount_balance_ratio": {
            "type": "number",
            "minimum": 0.0,
            "derived": "transaction_amount / wallet_balance",
        },
        "transactions_1h": {"type": "integer", "minimum": 0},
        "transactions_24h": {"type": "integer", "minimum": 0},
        "time_since_previous_transaction": {
            "type": "number",
            "minimum": 0.0,
        },
        "market_volatility": {"type": "number", "minimum": 0.0},
        "asset_volatility": {"type": "number", "minimum": 0.0},
        "portfolio_drawdown": {"type": "number", "minimum": 0.0},
        "destination_seen_before": {"type": "integer", "enum": [0, 1]},
        "destination_age_days": {"type": "number", "minimum": 0.0},
        "contract_interaction": {"type": "integer", "enum": [0, 1]},
        "approval_ratio": {"type": "number", "minimum": 0.0},
        "estimated_slippage": {"type": "number", "minimum": 0.0},
        "hour_of_day": {"type": "integer", "minimum": 0, "maximum": 23},
        "weekend": {"type": "integer", "enum": [0, 1]},
        "recent_cancelled_transactions": {"type": "integer", "minimum": 0},
        "recent_high_risk_transactions": {"type": "integer", "minimum": 0},
    }
    return [
        {
            "name": feature,
            "required": True,
            "label": FEATURE_LABELS[feature],
            "unit": FEATURE_UNITS.get(feature),
            **definitions[feature],
        }
        for feature in MODEL_FEATURES
    ]


def _test_vectors(
    artifact: Mapping[str, Any],
    bundle: Mapping[str, Any],
) -> List[Dict[str, Any]]:
    model = bundle["models"]["logistic_regression"]
    probabilities = predict_probabilities(
        "logistic_regression", model, bundle["x_test"]
    )
    ordered = np.argsort(probabilities)
    indexes = [
        int(ordered[0]),
        int(ordered[len(ordered) // 2]),
        int(ordered[-1]),
    ]
    names = ["low_risk_fixture", "typical_fixture", "high_risk_fixture"]
    vectors: List[Dict[str, Any]] = []
    for name, index in zip(names, indexes):
        source = bundle["raw_test_frame"].iloc[index]
        raw_features = {
            feature: (
                str(source[feature])
                if feature == "transaction_type"
                else float(source[feature])
            )
            for feature in MODEL_FEATURES
        }
        for feature in (
            "transactions_1h",
            "transactions_24h",
            "destination_seen_before",
            "contract_interaction",
            "hour_of_day",
            "weekend",
            "recent_cancelled_transactions",
            "recent_high_risk_transactions",
        ):
            raw_features[feature] = int(source[feature])

        sklearn_probability = float(probabilities[index])
        browser_probability = portable_probability(artifact, raw_features)
        if abs(sklearn_probability - browser_probability) > 1e-10:
            raise RuntimeError(
                "portable JSON inference does not match scikit-learn inference"
            )
        vectors.append(
            {
                "name": name,
                "data_origin": "SYNTHETIC",
                "source_transaction_id": str(source["transaction_id"]),
                "features": raw_features,
                "expected": {
                    "risk_probability": browser_probability,
                    "irs_score": int(np.floor(browser_probability * 100.0 + 0.5)),
                    "risk_level": risk_level(browser_probability, RISK_BANDS),
                },
            }
        )
    return vectors


def export_artifacts(
    bundle_path: Path,
    metrics_path: Path,
    output_dir: Path,
) -> Tuple[Dict[str, Any], Dict[str, Any], List[Dict[str, Any]]]:
    bundle = joblib.load(bundle_path)
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    selected_name = metrics["selected_model"]
    if selected_name != "logistic_regression":
        raise RuntimeError(
            "The published selection formula selected a non-linear model. "
            "Do not silently export different coefficients; revise the documented "
            "selection/portability decision or add a portable tree exporter."
        )

    model = bundle["models"][selected_name]
    preprocessor = bundle["preprocessor"]
    dataset_metadata = bundle["dataset_metadata"]

    artifact: Dict[str, Any] = {
        "artifact_type": "sentient_irs_browser_model",
        "schema_version": "1.0.0",
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "model_status": "EXPERIMENTAL",
        "data_origin": "SYNTHETIC",
        "warning": SYNTHETIC_WARNING,
        "input_schema": _input_schema(),
        "preprocessing": preprocessor.to_dict(),
        "model": {
            "type": "logistic_regression",
            "link": "sigmoid",
            "intercept": float(model.intercept_[0]),
            "coefficients": model.coef_[0].astype(float).tolist(),
            "coefficient_feature_order": list(
                preprocessor.transformed_feature_order
            ),
        },
        "output": {
            "risk_probability": "sigmoid(intercept + sum(coefficient_i * transformed_feature_i))",
            "irs_score": "round(risk_probability * 100)",
            "risk_bands": RISK_BANDS,
            "evaluation_threshold": EVALUATION_THRESHOLD,
            "default_policy_threshold": DEFAULT_POLICY_THRESHOLD,
        },
        "explainability": {
            "method": "per-feature standardized log-odds contribution",
            "contribution_formula": "coefficient_i * transformed_feature_i",
            "input_feature_labels": FEATURE_LABELS,
            "aggregate_one_hot_features_by_source": True,
        },
    }

    vectors = _test_vectors(artifact, bundle)
    model_bytes = _write_json(output_dir / "irs-model.json", artifact)
    vector_bytes = _write_json(
        output_dir / "model-test-vectors.json",
        {
            "artifact_type": "browser_model_parity_vectors",
            "model_version": MODEL_VERSION,
            "data_origin": "SYNTHETIC",
            "tolerance": 1e-10,
            "vectors": vectors,
        },
    )
    metrics_bytes = metrics_path.read_bytes()

    selected_metrics = metrics["candidates"][selected_name]
    metadata: Dict[str, Any] = {
        "artifact_type": "model_metadata",
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "model_type": "logistic_regression",
        "purpose": "Estimate a synthetic behavioral transaction-risk probability for proportionate demo-wallet friction.",
        "data_origin": "SYNTHETIC",
        "warning": SYNTHETIC_WARNING,
        "dataset": {
            "name": dataset_metadata["dataset_name"],
            "version": DATASET_VERSION,
            "row_count": dataset_metadata["row_count"],
            "positive_label_rate": dataset_metadata["positive_label_rate"],
            "seed": dataset_metadata["seed"],
            "sha256": dataset_metadata["sha256"],
        },
        "training": {
            "split": metrics["evaluation_protocol"],
            "library_versions": bundle["library_versions"],
            "selected_by": metrics["selection_rationale"],
        },
        "selected_test_metrics": {
            key: selected_metrics[key]
            for key in (
                "roc_auc",
                "precision",
                "recall",
                "f1",
                "false_positive_rate",
                "false_negative_rate",
                "brier_score",
                "expected_calibration_error",
                "confusion_matrix",
            )
        },
        "artifacts": {
            "irs-model.json": hashlib.sha256(model_bytes).hexdigest(),
            "model-metrics.json": hashlib.sha256(metrics_bytes).hexdigest(),
            "model-test-vectors.json": hashlib.sha256(vector_bytes).hexdigest(),
        },
        "limitations": [
            "All training and evaluation rows are synthetic and generated from explicit proxy rules.",
            "Metrics measure recovery of synthetic labels, not real-world loss prevention or user intent.",
            "The model must not be used for psychological diagnosis, credit scoring, or autonomous financial advice.",
            "Distribution shift, adversarial inputs, and real deployment calibration have not been established.",
        ],
    }
    _write_json(output_dir / "model-metadata.json", metadata)
    _verify_exported_hashes(output_dir, metadata)
    return artifact, metadata, vectors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        type=Path,
        default=Path("ml/artifacts/training-bundle.joblib"),
    )
    parser.add_argument(
        "--metrics",
        type=Path,
        default=Path("assets/models/model-metrics.json"),
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path("assets/models")
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    artifact, metadata, vectors = export_artifacts(
        args.bundle,
        args.metrics,
        args.output_dir,
    )
    print(
        f"Exported {artifact['model_name']} v{artifact['model_version']} with "
        f"{len(artifact['model']['coefficients'])} coefficients and "
        f"{len(vectors)} browser parity vectors to {args.output_dir}."
    )
    print(
        f"Dataset fingerprint: {metadata['dataset']['sha256']} "
        f"({metadata['dataset']['row_count']} explicitly synthetic rows)."
    )


if __name__ == "__main__":
    main()
