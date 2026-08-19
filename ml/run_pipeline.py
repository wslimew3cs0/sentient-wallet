"""Run synthetic generation, candidate training, evaluation, and JSON export."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict

try:
    from .config import DEFAULT_FOREST_ESTIMATORS, DEFAULT_ROWS, DEFAULT_SEED
    from .evaluate_model import evaluate_and_write
    from .export_model import export_artifacts
    from .generate_synthetic_data import generate_and_write
    from .train_model import train_and_save
except ImportError:  # Support direct script execution from ml/.
    from config import (  # type: ignore
        DEFAULT_FOREST_ESTIMATORS,
        DEFAULT_ROWS,
        DEFAULT_SEED,
    )
    from evaluate_model import evaluate_and_write  # type: ignore
    from export_model import export_artifacts  # type: ignore
    from generate_synthetic_data import generate_and_write  # type: ignore
    from train_model import train_and_save  # type: ignore


def run_pipeline(
    rows: int,
    seed: int,
    forest_estimators: int,
    data_dir: Path,
    work_dir: Path,
    output_dir: Path,
) -> Dict[str, Any]:
    dataset_path = data_dir / "synthetic_transactions.csv"
    dataset_metadata_path = data_dir / "dataset-metadata.json"
    bundle_path = work_dir / "training-bundle.joblib"
    metrics_path = output_dir / "model-metrics.json"

    _, dataset_metadata = generate_and_write(
        rows=rows,
        seed=seed,
        output_path=dataset_path,
        metadata_path=dataset_metadata_path,
    )
    train_and_save(
        dataset_path=dataset_path,
        dataset_metadata_path=dataset_metadata_path,
        output_path=bundle_path,
        seed=seed,
        forest_estimators=forest_estimators,
    )
    evaluation = evaluate_and_write(bundle_path, metrics_path)
    artifact, metadata, vectors = export_artifacts(
        bundle_path,
        metrics_path,
        output_dir,
    )
    return {
        "dataset": dataset_metadata,
        "evaluation": evaluation,
        "artifact": artifact,
        "metadata": metadata,
        "vectors": vectors,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--forest-estimators", type=int, default=DEFAULT_FOREST_ESTIMATORS
    )
    parser.add_argument("--data-dir", type=Path, default=Path("ml/data"))
    parser.add_argument("--work-dir", type=Path, default=Path("ml/artifacts"))
    parser.add_argument("--output-dir", type=Path, default=Path("assets/models"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = run_pipeline(
        rows=args.rows,
        seed=args.seed,
        forest_estimators=args.forest_estimators,
        data_dir=args.data_dir,
        work_dir=args.work_dir,
        output_dir=args.output_dir,
    )
    selected = result["evaluation"]["selected_model"]
    metrics = result["evaluation"]["candidates"][selected]
    print(
        f"Pipeline complete: selected {selected}; "
        f"ROC-AUC={metrics['roc_auc']:.4f}, precision={metrics['precision']:.4f}, "
        f"recall={metrics['recall']:.4f}, F1={metrics['f1']:.4f}, "
        f"FPR={metrics['false_positive_rate']:.4f}, "
        f"FNR={metrics['false_negative_rate']:.4f}, "
        f"Brier={metrics['brier_score']:.4f}."
    )


if __name__ == "__main__":
    main()
