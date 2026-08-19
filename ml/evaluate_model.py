"""Evaluate IRS candidates and write reproducible metrics and chart artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, Mapping

import joblib

try:
    from .config import SYNTHETIC_WARNING
    from .modeling import evaluate_bundle, json_ready
except ImportError:  # Support direct script execution from ml/.
    from config import SYNTHETIC_WARNING  # type: ignore
    from modeling import evaluate_bundle, json_ready  # type: ignore


def _public_candidate_metrics(candidate: Mapping[str, Any]) -> Dict[str, Any]:
    public = dict(candidate)
    public.pop("test_probabilities", None)
    return public


def evaluate_and_write(bundle_path: Path, output_path: Path) -> Dict[str, Any]:
    bundle = joblib.load(bundle_path)
    evaluation = evaluate_bundle(bundle)
    dataset_metadata = bundle["dataset_metadata"]

    payload: Dict[str, Any] = {
        "artifact_type": "model_evaluation",
        "data_origin": "SYNTHETIC",
        "warning": SYNTHETIC_WARNING,
        "dataset": {
            "name": dataset_metadata["dataset_name"],
            "version": dataset_metadata["dataset_version"],
            "row_count": dataset_metadata["row_count"],
            "positive_label_rate": dataset_metadata["positive_label_rate"],
            "sha256": dataset_metadata["sha256"],
        },
        "evaluation_protocol": evaluation["evaluation_protocol"],
        "selected_model": evaluation["selected_model"],
        "selection_rationale": evaluation["selection_rationale"],
        "candidates": {
            name: _public_candidate_metrics(result)
            for name, result in evaluation["candidates"].items()
        },
    }

    stable_payload = json_ready(payload)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(stable_payload, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    return evaluation


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        type=Path,
        default=Path("ml/artifacts/training-bundle.joblib"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("assets/models/model-metrics.json"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    evaluation = evaluate_and_write(args.bundle, args.output)
    selected = evaluation["selected_model"]
    metrics = evaluation["candidates"][selected]
    print(
        f"Selected {selected}: ROC-AUC={metrics['roc_auc']:.4f}, "
        f"precision={metrics['precision']:.4f}, recall={metrics['recall']:.4f}, "
        f"F1={metrics['f1']:.4f}, Brier={metrics['brier_score']:.4f}."
    )


if __name__ == "__main__":
    main()
