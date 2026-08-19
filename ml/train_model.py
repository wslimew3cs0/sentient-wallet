"""Train deterministic Logistic Regression and Random Forest IRS candidates."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Dict

import joblib

try:
    from .config import DEFAULT_FOREST_ESTIMATORS, DEFAULT_SEED, DEFAULT_TEST_SIZE
    from .modeling import load_dataset, train_candidates
except ImportError:  # Support direct script execution from ml/.
    from config import (  # type: ignore
        DEFAULT_FOREST_ESTIMATORS,
        DEFAULT_SEED,
        DEFAULT_TEST_SIZE,
    )
    from modeling import load_dataset, train_candidates  # type: ignore


def train_and_save(
    dataset_path: Path,
    dataset_metadata_path: Path,
    output_path: Path,
    seed: int = DEFAULT_SEED,
    test_size: float = DEFAULT_TEST_SIZE,
    forest_estimators: int = DEFAULT_FOREST_ESTIMATORS,
) -> Dict[str, Any]:
    frame = load_dataset(str(dataset_path))
    dataset_metadata = json.loads(dataset_metadata_path.read_text(encoding="utf-8"))
    actual_fingerprint = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    if actual_fingerprint != dataset_metadata.get("sha256"):
        raise ValueError(
            "dataset fingerprint does not match dataset metadata; regenerate both "
            "with ml.generate_synthetic_data"
        )
    bundle = train_candidates(
        frame,
        seed=seed,
        test_size=test_size,
        forest_estimators=forest_estimators,
    )
    bundle["dataset_metadata"] = dataset_metadata
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, output_path, compress=3)
    return bundle


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset", type=Path, default=Path("ml/data/synthetic_transactions.csv")
    )
    parser.add_argument(
        "--dataset-metadata",
        type=Path,
        default=Path("ml/data/dataset-metadata.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/artifacts/training-bundle.joblib"),
    )
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--test-size", type=float, default=DEFAULT_TEST_SIZE)
    parser.add_argument(
        "--forest-estimators", type=int, default=DEFAULT_FOREST_ESTIMATORS
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    bundle = train_and_save(
        dataset_path=args.dataset,
        dataset_metadata_path=args.dataset_metadata,
        output_path=args.output,
        seed=args.seed,
        test_size=args.test_size,
        forest_estimators=args.forest_estimators,
    )
    print(
        f"Trained Logistic Regression and Random Forest on "
        f"{bundle['train_row_count']} rows; held out {bundle['test_row_count']} rows."
    )


if __name__ == "__main__":
    main()
