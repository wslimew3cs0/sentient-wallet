"""Reproducibility and portable-inference tests for the IRS pipeline."""

from __future__ import annotations

import hashlib
import json
import math
import tempfile
import unittest
from pathlib import Path
from typing import Any, Dict

from ml.config import (
    DEFAULT_ROWS,
    DEFAULT_SEED,
    LABEL_COLUMN,
    MODEL_FEATURES,
)
from ml.generate_synthetic_data import dataset_sha256, generate_dataset
from ml.modeling import portable_probability
from ml.run_pipeline import run_pipeline


class PipelineReproducibilityTests(unittest.TestCase):
    temp_directory: Any
    root: Path
    first: Dict[str, Any]

    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_directory = tempfile.TemporaryDirectory(
            prefix="sentient-wallet-ml-tests-"
        )
        cls.root = Path(cls.temp_directory.name)
        cls.first = run_pipeline(
            rows=1_600,
            seed=DEFAULT_SEED,
            forest_estimators=60,
            data_dir=cls.root / "first" / "data",
            work_dir=cls.root / "first" / "work",
            output_dir=cls.root / "first" / "models",
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_directory.cleanup()

    def test_default_dataset_has_a_versioned_stable_fingerprint(self) -> None:
        first = generate_dataset(rows=DEFAULT_ROWS, seed=DEFAULT_SEED)
        second = generate_dataset(rows=DEFAULT_ROWS, seed=DEFAULT_SEED)
        expected = "568525bb14d58c6e246c307ce88c973b5a7305e396d921c8014098bb55488aea"
        self.assertEqual(dataset_sha256(first), expected)
        self.assertEqual(dataset_sha256(second), expected)
        self.assertTrue(first.equals(second))

    def test_dataset_is_explicitly_synthetic_and_uses_only_supported_fields(self) -> None:
        frame = generate_dataset(rows=800, seed=DEFAULT_SEED)
        self.assertEqual(set(frame["data_origin"].unique()), {"SYNTHETIC"})
        self.assertEqual(set(frame[LABEL_COLUMN].unique()), {0, 1})
        self.assertTrue(set(MODEL_FEATURES).issubset(frame.columns))
        unsupported = {
            "actual_emotional_state",
            "mental_health_condition",
            "personality_disorder",
            "psychological_diagnosis",
        }
        self.assertTrue(unsupported.isdisjoint(frame.columns))

    def test_full_pipeline_json_outputs_are_byte_reproducible(self) -> None:
        second = run_pipeline(
            rows=1_600,
            seed=DEFAULT_SEED,
            forest_estimators=60,
            data_dir=self.root / "second" / "data",
            work_dir=self.root / "second" / "work",
            output_dir=self.root / "second" / "models",
        )
        self.assertEqual(
            self.first["evaluation"]["selected_model"],
            "logistic_regression",
        )
        self.assertEqual(
            second["evaluation"]["selected_model"],
            "logistic_regression",
        )

        for filename in (
            "irs-model.json",
            "model-metadata.json",
            "model-metrics.json",
            "model-test-vectors.json",
        ):
            first_bytes = (self.root / "first" / "models" / filename).read_bytes()
            second_bytes = (self.root / "second" / "models" / filename).read_bytes()
            self.assertEqual(first_bytes, second_bytes, filename)

        metrics = json.loads(
            (self.root / "first" / "models" / "model-metrics.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(set(metrics["candidates"]), {"logistic_regression", "random_forest"})
        for candidate in metrics["candidates"].values():
            for key in (
                "roc_auc",
                "precision",
                "recall",
                "f1",
                "false_positive_rate",
                "false_negative_rate",
                "brier_score",
                "expected_calibration_error",
            ):
                self.assertTrue(math.isfinite(candidate[key]), key)
            self.assertEqual(len(candidate["threshold_frontier"]), 19)

        metadata = json.loads(
            (self.root / "first" / "models" / "model-metadata.json").read_text(
                encoding="utf-8"
            )
        )
        for filename, expected in metadata["artifacts"].items():
            actual = hashlib.sha256(
                (self.root / "first" / "models" / filename).read_bytes()
            ).hexdigest()
            self.assertEqual(actual, expected, filename)

    def test_browser_formula_matches_exported_parity_vectors(self) -> None:
        model_path = self.root / "first" / "models" / "irs-model.json"
        vector_path = (
            self.root / "first" / "models" / "model-test-vectors.json"
        )
        artifact = json.loads(model_path.read_text(encoding="utf-8"))
        vectors = json.loads(vector_path.read_text(encoding="utf-8"))["vectors"]
        self.assertEqual(len(vectors), 3)
        for vector in vectors:
            features = dict(vector["features"])
            features["amount_balance_ratio"] = (
                features["transaction_amount"] / features["wallet_balance"]
            )
            actual = portable_probability(artifact, features)
            expected = vector["expected"]["risk_probability"]
            self.assertAlmostEqual(actual, expected, places=10)


if __name__ == "__main__":
    unittest.main()
