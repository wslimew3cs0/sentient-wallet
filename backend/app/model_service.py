from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .schemas import RiskFeatures


class ModelUnavailableError(RuntimeError):
    """Raised when the exported browser model cannot be loaded safely."""


@dataclass(frozen=True)
class ModelAssessment:
    probability: float
    score: int
    risk_level: str
    recommended_policy: str
    explanation: list[dict[str, Any]]
    summary: str


class RiskModelService:
    """Loads and evaluates the exact browser-exported logistic model."""

    _MAX_ABS_STANDARDIZED_VALUE = 1_000_000.0

    def __init__(self, model_dir: Path) -> None:
        self.model_dir = Path(model_dir)
        self.model: dict[str, Any] | None = None
        self.metadata: dict[str, Any] | None = None
        self.metrics: dict[str, Any] | None = None
        self.test_vectors: dict[str, Any] | None = None
        self.available = False
        self.parity_validated = False
        self.load_error: str | None = None
        self.integrity_warnings: list[str] = []
        self.artifact_sha256 = ""
        self.metadata_sha256_match = False
        self._load()

    @property
    def model_version(self) -> str | None:
        return self.model.get("model_version") if self.model else None

    @property
    def model_name(self) -> str | None:
        return self.model.get("model_name") if self.model else None

    def _load_json(self, filename: str) -> dict[str, Any]:
        path = self.model_dir / filename
        return json.loads(path.read_text(encoding="utf-8"))

    def _load(self) -> None:
        try:
            self.model = self._load_json("irs-model.json")
            self.metadata = self._load_json("model-metadata.json")
            self.metrics = self._load_json("model-metrics.json")
            self.test_vectors = self._load_json("model-test-vectors.json")
            self._validate_structure()
            self._check_integrity()
            self._validate_parity_vectors()
            self.available = True
        except Exception as exc:  # startup must degrade cleanly for local demo recovery
            self.available = False
            self.parity_validated = False
            self.load_error = f"{type(exc).__name__}: {exc}"

    def _require_loaded(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        if not self.available or self.model is None or self.metadata is None or self.metrics is None:
            raise ModelUnavailableError(self.load_error or "Risk model is unavailable")
        return self.model, self.metadata, self.metrics

    def _validate_structure(self) -> None:
        assert self.model is not None
        assert self.metadata is not None
        assert self.test_vectors is not None

        if self.model.get("artifact_type") != "sentient_irs_browser_model":
            raise ValueError("Unexpected risk-model artifact type")
        if self.model.get("model", {}).get("type") != "logistic_regression":
            raise ValueError("Only the selected logistic-regression export is supported")

        versions = {
            self.model.get("model_version"),
            self.metadata.get("model_version"),
            self.test_vectors.get("model_version"),
        }
        if len(versions) != 1 or None in versions:
            raise ValueError(f"Model artifact versions do not match: {sorted(str(item) for item in versions)}")

        model_data = self.model["model"]
        order = model_data["coefficient_feature_order"]
        coefficients = model_data["coefficients"]
        transformed_order = self.model["preprocessing"]["transformed_feature_order"]
        if order != transformed_order or len(order) != len(coefficients):
            raise ValueError("Coefficient and transformed-feature order do not match")

        numeric = self.model["preprocessing"]["numeric"]
        for feature in numeric["features"]:
            if feature not in numeric["means"] or feature not in numeric["scales"]:
                raise ValueError(f"Missing scaler value for {feature}")
            if float(numeric["scales"][feature]) == 0:
                raise ValueError(f"Zero scaler value for {feature}")

    def _check_integrity(self) -> None:
        assert self.metadata is not None
        model_path = self.model_dir / "irs-model.json"
        self.artifact_sha256 = hashlib.sha256(model_path.read_bytes()).hexdigest()
        expected = self.metadata.get("artifacts", {}).get("irs-model.json")
        self.metadata_sha256_match = bool(expected and expected == self.artifact_sha256)
        if not self.metadata_sha256_match:
            self.integrity_warnings.append(
                "The model-metadata checksum does not match the current irs-model.json export. "
                "Runtime structure and published parity vectors were validated instead."
            )

    def _validate_parity_vectors(self) -> None:
        assert self.test_vectors is not None
        tolerance = float(self.test_vectors.get("tolerance", 1e-10))
        for vector in self.test_vectors.get("vectors", []):
            assessment = self._assess_mapping(vector["features"], explanation_limit=0)
            expected = vector["expected"]
            difference = abs(assessment.probability - float(expected["risk_probability"]))
            if difference > tolerance:
                raise ValueError(
                    f"Parity vector {vector.get('name', '<unnamed>')} differs by {difference}, "
                    f"above tolerance {tolerance}"
                )
            if assessment.score != int(expected["irs_score"]):
                raise ValueError(f"Parity score mismatch for {vector.get('name', '<unnamed>')}")
            if assessment.risk_level != expected["risk_level"]:
                raise ValueError(f"Parity risk-level mismatch for {vector.get('name', '<unnamed>')}")
        self.parity_validated = True

    @staticmethod
    def _sigmoid(logit: float) -> float:
        if logit >= 0:
            if logit > 709:
                return 1.0
            return 1.0 / (1.0 + math.exp(-logit))
        if logit < -745:
            return 0.0
        exp_value = math.exp(logit)
        return exp_value / (1.0 + exp_value)

    def assess(self, features: RiskFeatures) -> ModelAssessment:
        self._require_loaded()
        return self._assess_mapping(features.model_dump(), explanation_limit=6)

    def _assess_mapping(self, features: dict[str, Any], explanation_limit: int) -> ModelAssessment:
        if self.model is None:
            raise ModelUnavailableError(self.load_error or "Risk model is unavailable")

        model_data = self.model["model"]
        preprocessing = self.model["preprocessing"]
        numeric = preprocessing["numeric"]
        category_config = preprocessing["categorical"]["transaction_type"]
        order = model_data["coefficient_feature_order"]
        coefficients = model_data["coefficients"]
        sources = preprocessing["transformed_feature_sources"]

        transformed: dict[str, float] = {}
        for feature in numeric["features"]:
            value = float(features[feature])
            standardized = (value - float(numeric["means"][feature])) / float(
                numeric["scales"][feature]
            )
            transformed[feature] = max(
                -self._MAX_ABS_STANDARDIZED_VALUE,
                min(self._MAX_ABS_STANDARDIZED_VALUE, standardized),
            )

        category_value = features["transaction_type"]
        if category_value not in category_config["categories"]:
            raise ValueError(f"Unsupported transaction_type: {category_value}")
        for category in category_config["categories"]:
            transformed[f"transaction_type={category}"] = 1.0 if category_value == category else 0.0

        logit = float(model_data["intercept"])
        contributions: dict[str, float] = {}
        for feature, source, coefficient in zip(order, sources, coefficients, strict=True):
            contribution = float(coefficient) * transformed[feature]
            logit += contribution
            contributions[source] = contributions.get(source, 0.0) + contribution

        probability = self._sigmoid(logit)
        score = min(100, max(0, math.floor(probability * 100 + 0.5)))
        risk_level, recommended_policy = self._risk_band(probability)

        labels = self.model["explainability"]["input_feature_labels"]
        ordered_contributions = sorted(contributions.items(), key=lambda item: abs(item[1]), reverse=True)
        explanation = []
        for feature, impact in ordered_contributions[:explanation_limit]:
            if impact > 0:
                direction = "INCREASES_RISK"
            elif impact < 0:
                direction = "DECREASES_RISK"
            else:
                direction = "NEUTRAL"
            explanation.append(
                {
                    "feature": feature,
                    "label": labels.get(feature, feature.replace("_", " ").title()),
                    "impact": round(impact, 6),
                    "direction": direction,
                }
            )

        summary = (
            f"{risk_level.title()} synthetic behavioral-risk proxy score ({score}/100); "
            f"recommended demo policy: {recommended_policy.replace('_', ' ').lower()}."
        )
        return ModelAssessment(
            probability=probability,
            score=score,
            risk_level=risk_level,
            recommended_policy=recommended_policy,
            explanation=explanation,
            summary=summary,
        )

    def _risk_band(self, probability: float) -> tuple[str, str]:
        assert self.model is not None
        for band in self.model["output"]["risk_bands"]:
            if float(band["minimum"]) <= probability < float(band["maximum_exclusive"]):
                return str(band["level"]), str(band["recommended_policy"])
        raise ValueError(f"No risk band covers probability {probability}")

    def model_info(self) -> dict[str, Any]:
        model, _, _ = self._require_loaded()
        return {
            "model_name": model["model_name"],
            "model_version": model["model_version"],
            "model_type": model["model"]["type"],
            "model_status": model["model_status"],
            "schema_version": model["schema_version"],
            "data_origin": model["data_origin"],
            "input_features": [item["name"] for item in model["input_schema"]],
            "risk_bands": model["output"]["risk_bands"],
            "artifact_sha256": self.artifact_sha256,
            "metadata_sha256_match": self.metadata_sha256_match,
            "parity_vectors_validated": self.parity_validated,
            "integrity_warnings": self.integrity_warnings,
            "warning": model["warning"],
        }

    def metrics_info(self) -> dict[str, Any]:
        model, metadata, metrics = self._require_loaded()
        selected_name = metrics["selected_model"]
        selected = metrics["candidates"][selected_name]
        return {
            "model_name": model["model_name"],
            "model_version": model["model_version"],
            "selected_model": selected_name,
            "data_origin": model["data_origin"],
            "test_rows": metadata["training"]["split"]["test_rows"],
            "evaluation_threshold": selected["evaluation_threshold"],
            "roc_auc": selected["roc_auc"],
            "precision": selected["precision"],
            "recall": selected["recall"],
            "f1": selected["f1"],
            "brier_score": selected["brier_score"],
            "expected_calibration_error": selected["expected_calibration_error"],
            "false_positive_rate": selected["false_positive_rate"],
            "false_negative_rate": selected["false_negative_rate"],
            "confusion_matrix": selected["confusion_matrix"],
            "limitations": metadata["limitations"],
            "warning": metadata["warning"],
        }
