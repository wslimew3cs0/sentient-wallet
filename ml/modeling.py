"""Shared preprocessing, training, evaluation, and portable-inference helpers."""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

try:
    from .config import (
        CATEGORICAL_FEATURES,
        DEFAULT_FOREST_ESTIMATORS,
        DEFAULT_SEED,
        DEFAULT_TEST_SIZE,
        EVALUATION_THRESHOLD,
        INTERPRETABILITY_SCORES,
        LABEL_COLUMN,
        MODEL_FEATURES,
        NUMERIC_FEATURES,
        SELECTION_WEIGHTS,
        TRANSACTION_TYPES,
    )
    from .generate_synthetic_data import validate_dataset
except ImportError:  # Support direct script execution from ml/.
    from config import (  # type: ignore
        CATEGORICAL_FEATURES,
        DEFAULT_FOREST_ESTIMATORS,
        DEFAULT_SEED,
        DEFAULT_TEST_SIZE,
        EVALUATION_THRESHOLD,
        INTERPRETABILITY_SCORES,
        LABEL_COLUMN,
        MODEL_FEATURES,
        NUMERIC_FEATURES,
        SELECTION_WEIGHTS,
        TRANSACTION_TYPES,
    )
    from generate_synthetic_data import validate_dataset  # type: ignore


@dataclass(frozen=True)
class PortablePreprocessor:
    """Minimal preprocessing needed for identical Python/browser inference."""

    numeric_features: Tuple[str, ...]
    means: Mapping[str, float]
    scales: Mapping[str, float]
    categorical_features: Tuple[str, ...]
    categories: Mapping[str, Tuple[str, ...]]
    transformed_feature_order: Tuple[str, ...]
    transformed_feature_sources: Tuple[str, ...]

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        missing = set(MODEL_FEATURES).difference(frame.columns)
        if missing:
            raise ValueError(f"model input is missing features: {sorted(missing)}")

        numeric_blocks = []
        for feature in self.numeric_features:
            values = pd.to_numeric(frame[feature], errors="raise").to_numpy(dtype=float)
            numeric_blocks.append(
                ((values - self.means[feature]) / self.scales[feature]).reshape(-1, 1)
            )

        categorical_blocks = []
        for feature in self.categorical_features:
            values = frame[feature].astype(str).to_numpy()
            allowed = set(self.categories[feature])
            unknown = set(values).difference(allowed)
            if unknown:
                raise ValueError(
                    f"{feature} contains unsupported categories: {sorted(unknown)}"
                )
            for category in self.categories[feature]:
                categorical_blocks.append((values == category).astype(float).reshape(-1, 1))

        matrix = np.concatenate(numeric_blocks + categorical_blocks, axis=1)
        if not np.isfinite(matrix).all():
            raise ValueError("model input produced non-finite preprocessed values")
        return matrix

    def to_dict(self) -> Dict[str, Any]:
        return {
            "numeric": {
                "features": list(self.numeric_features),
                "means": {name: float(self.means[name]) for name in self.numeric_features},
                "scales": {name: float(self.scales[name]) for name in self.numeric_features},
                "method": "standard_score_using_training_split_population_statistics",
            },
            "categorical": {
                feature: {
                    "method": "one_hot",
                    "categories": list(self.categories[feature]),
                    "unknown_category_policy": "reject",
                }
                for feature in self.categorical_features
            },
            "categorical_feature_order": list(self.categorical_features),
            "transformed_feature_order": list(self.transformed_feature_order),
            "transformed_feature_sources": list(self.transformed_feature_sources),
        }


def fit_preprocessor(frame: pd.DataFrame) -> PortablePreprocessor:
    means: Dict[str, float] = {}
    scales: Dict[str, float] = {}
    for feature in NUMERIC_FEATURES:
        values = pd.to_numeric(frame[feature], errors="raise").to_numpy(dtype=float)
        mean = float(np.mean(values))
        scale = float(np.std(values, ddof=0))
        means[feature] = mean
        scales[feature] = scale if scale > 1e-12 else 1.0

    categories = {"transaction_type": tuple(TRANSACTION_TYPES)}
    transformed_names = list(NUMERIC_FEATURES)
    transformed_sources = list(NUMERIC_FEATURES)
    for feature in CATEGORICAL_FEATURES:
        for category in categories[feature]:
            transformed_names.append(f"{feature}={category}")
            transformed_sources.append(feature)

    return PortablePreprocessor(
        numeric_features=tuple(NUMERIC_FEATURES),
        means=means,
        scales=scales,
        categorical_features=tuple(CATEGORICAL_FEATURES),
        categories=categories,
        transformed_feature_order=tuple(transformed_names),
        transformed_feature_sources=tuple(transformed_sources),
    )


def load_dataset(path: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    validate_dataset(frame)
    return frame


def train_candidates(
    frame: pd.DataFrame,
    seed: int = DEFAULT_SEED,
    test_size: float = DEFAULT_TEST_SIZE,
    forest_estimators: int = DEFAULT_FOREST_ESTIMATORS,
) -> Dict[str, Any]:
    """Train both required candidates against an identical fixed split."""
    validate_dataset(frame)
    if forest_estimators < 10:
        raise ValueError("forest_estimators must be at least 10")

    indices = np.arange(len(frame))
    labels = frame[LABEL_COLUMN].to_numpy(dtype=int)
    train_indices, test_indices = train_test_split(
        indices,
        test_size=test_size,
        random_state=seed,
        stratify=labels,
    )

    train_frame = frame.iloc[train_indices].reset_index(drop=True)
    test_frame = frame.iloc[test_indices].reset_index(drop=True)
    y_train = train_frame[LABEL_COLUMN].to_numpy(dtype=int)
    y_test = test_frame[LABEL_COLUMN].to_numpy(dtype=int)

    preprocessor = fit_preprocessor(train_frame)
    x_train = preprocessor.transform(train_frame)
    x_test = preprocessor.transform(test_frame)

    logistic = LogisticRegression(
        C=1.0,
        class_weight=None,
        max_iter=2_000,
        random_state=seed,
        # liblinear is deterministic for this small binary problem and avoids
        # platform-specific BLAS reduction noise in coefficient fitting.
        solver="liblinear",
    )
    forest = RandomForestClassifier(
        n_estimators=forest_estimators,
        max_depth=10,
        min_samples_leaf=5,
        max_features="sqrt",
        class_weight=None,
        random_state=seed,
        n_jobs=1,
    )

    logistic.fit(x_train, y_train)
    forest.fit(x_train, y_train)

    return {
        "seed": int(seed),
        "test_size": float(test_size),
        "row_count": int(len(frame)),
        "train_row_count": int(len(train_frame)),
        "test_row_count": int(len(test_frame)),
        "train_indices": train_indices,
        "test_indices": test_indices,
        "train_transaction_ids": train_frame["transaction_id"].tolist(),
        "test_transaction_ids": test_frame["transaction_id"].tolist(),
        "preprocessor": preprocessor,
        "models": {
            "logistic_regression": logistic,
            "random_forest": forest,
        },
        "x_test": x_test,
        "y_test": y_test,
        "raw_test_frame": test_frame,
        "library_versions": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
        },
    }


def _safe_ratio(numerator: float, denominator: float) -> float:
    return float(numerator / denominator) if denominator else 0.0


def _expected_calibration_error(
    y_true: np.ndarray, probabilities: np.ndarray, bins: int = 10
) -> float:
    edges = np.linspace(0.0, 1.0, bins + 1)
    total = len(y_true)
    error = 0.0
    for index in range(bins):
        lower, upper = edges[index], edges[index + 1]
        if index == bins - 1:
            mask = (probabilities >= lower) & (probabilities <= upper)
        else:
            mask = (probabilities >= lower) & (probabilities < upper)
        count = int(mask.sum())
        if not count:
            continue
        confidence = float(np.mean(probabilities[mask]))
        observed = float(np.mean(y_true[mask]))
        error += (count / total) * abs(confidence - observed)
    return float(error)


def _threshold_frontier(
    y_true: np.ndarray, probabilities: np.ndarray
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for threshold in np.linspace(0.05, 0.95, 19):
        predictions = (probabilities >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
        rows.append(
            {
                "threshold": float(threshold),
                "high_risk_transactions_intercepted": int(tp),
                "benign_transactions_interrupted": int(fp),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "intervention_rate": _safe_ratio(tp + fp, len(y_true)),
                "risk_protection": _safe_ratio(tp, tp + fn),
                "user_friction": _safe_ratio(fp, fp + tn),
            }
        )
    return rows


def _score_distribution(
    y_true: np.ndarray, probabilities: np.ndarray
) -> Dict[str, Any]:
    edges = np.linspace(0.0, 1.0, 21)
    negative, _ = np.histogram(probabilities[y_true == 0], bins=edges)
    positive, _ = np.histogram(probabilities[y_true == 1], bins=edges)
    return {
        "bin_edges": edges.tolist(),
        "negative_label_counts": negative.astype(int).tolist(),
        "positive_label_counts": positive.astype(int).tolist(),
    }


def _feature_importance(
    model_name: str,
    model: Any,
    transformed_names: Sequence[str],
    transformed_sources: Sequence[str],
) -> Dict[str, Any]:
    if model_name == "logistic_regression":
        signed = np.asarray(model.coef_[0], dtype=float)
        raw_importance = np.abs(signed)
    else:
        raw_importance = np.asarray(model.feature_importances_, dtype=float)
        signed = raw_importance.copy()

    total = float(raw_importance.sum()) or 1.0
    transformed = []
    aggregate: Dict[str, float] = defaultdict(float)
    for name, source, importance, signed_value in zip(
        transformed_names,
        transformed_sources,
        raw_importance,
        signed,
    ):
        normalized = float(importance / total)
        aggregate[source] += normalized
        transformed.append(
            {
                "feature": name,
                "source_feature": source,
                "importance": normalized,
                "signed_coefficient": (
                    float(signed_value)
                    if model_name == "logistic_regression"
                    else None
                ),
            }
        )

    aggregated = [
        {"feature": name, "importance": value}
        for name, value in sorted(
            aggregate.items(), key=lambda item: (-item[1], item[0])
        )
    ]
    return {
        "method": (
            "absolute_standardized_coefficient"
            if model_name == "logistic_regression"
            else "mean_decrease_in_impurity"
        ),
        "transformed": sorted(
            transformed, key=lambda item: (-item["importance"], item["feature"])
        ),
        "aggregated_by_input_feature": aggregated,
    }


def evaluate_candidate(
    model_name: str,
    model: Any,
    x_test: np.ndarray,
    y_test: np.ndarray,
    preprocessor: PortablePreprocessor,
    threshold: float = EVALUATION_THRESHOLD,
) -> Dict[str, Any]:
    probabilities = predict_probabilities(model_name, model, x_test)
    predictions = (probabilities >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()
    false_positive_rate = _safe_ratio(fp, fp + tn)
    false_negative_rate = _safe_ratio(fn, fn + tp)

    fpr, tpr, _ = roc_curve(y_test, probabilities)
    observed, predicted = calibration_curve(
        y_test,
        probabilities,
        n_bins=10,
        strategy="quantile",
    )

    return {
        "evaluation_threshold": float(threshold),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "false_positive_rate": false_positive_rate,
        "false_negative_rate": false_negative_rate,
        "brier_score": float(brier_score_loss(y_test, probabilities)),
        "expected_calibration_error": _expected_calibration_error(
            y_test, probabilities
        ),
        "confusion_matrix": {
            "labels": [0, 1],
            "matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
        "roc_curve": {
            "false_positive_rate": fpr.tolist(),
            "true_positive_rate": tpr.tolist(),
        },
        "calibration_curve": {
            "mean_predicted_probability": predicted.tolist(),
            "observed_positive_rate": observed.tolist(),
            "strategy": "10_equal_count_bins",
        },
        "score_distribution": _score_distribution(y_test, probabilities),
        "threshold_frontier": _threshold_frontier(y_test, probabilities),
        "feature_importance": _feature_importance(
            model_name,
            model,
            preprocessor.transformed_feature_order,
            preprocessor.transformed_feature_sources,
        ),
        "test_probabilities": probabilities,
    }


def predict_probabilities(
    model_name: str, model: Any, matrix: np.ndarray
) -> np.ndarray:
    """Return probabilities without relying on platform-specific BLAS dot paths."""
    if model_name == "logistic_regression":
        coefficients = np.asarray(model.coef_[0], dtype=float)
        logits = np.sum(matrix * coefficients.reshape(1, -1), axis=1) + float(
            model.intercept_[0]
        )
        clipped = np.clip(logits, -35.0, 35.0)
        return np.asarray(1.0 / (1.0 + np.exp(-clipped)), dtype=float)
    return np.asarray(model.predict_proba(matrix)[:, 1], dtype=float)


def selection_score(model_name: str, metrics: Mapping[str, float]) -> float:
    calibration_quality = 1.0 - float(metrics["brier_score"])
    return float(
        SELECTION_WEIGHTS["roc_auc"] * float(metrics["roc_auc"])
        + SELECTION_WEIGHTS["recall"] * float(metrics["recall"])
        + SELECTION_WEIGHTS["precision"] * float(metrics["precision"])
        + SELECTION_WEIGHTS["f1"] * float(metrics["f1"])
        + SELECTION_WEIGHTS["calibration"] * calibration_quality
        + SELECTION_WEIGHTS["interpretability"]
        * INTERPRETABILITY_SCORES[model_name]
    )


def evaluate_bundle(bundle: Mapping[str, Any]) -> Dict[str, Any]:
    preprocessor = bundle["preprocessor"]
    candidate_results: Dict[str, Any] = {}
    selection_scores: Dict[str, float] = {}

    for model_name, model in bundle["models"].items():
        result = evaluate_candidate(
            model_name,
            model,
            bundle["x_test"],
            bundle["y_test"],
            preprocessor,
        )
        score = selection_score(model_name, result)
        result["selection_score"] = score
        candidate_results[model_name] = result
        selection_scores[model_name] = score

    selected_name = max(
        selection_scores,
        key=lambda name: (selection_scores[name], name == "logistic_regression"),
    )

    return {
        "evaluation_protocol": {
            "split": "fixed stratified holdout",
            "seed": int(bundle["seed"]),
            "test_fraction": float(bundle["test_size"]),
            "train_rows": int(bundle["train_row_count"]),
            "test_rows": int(bundle["test_row_count"]),
            "classification_threshold": EVALUATION_THRESHOLD,
            "selection_formula": {
                "weights": SELECTION_WEIGHTS,
                "calibration_term": "1 - Brier score",
                "interpretability_scores": INTERPRETABILITY_SCORES,
                "accuracy_used": False,
            },
        },
        "selected_model": selected_name,
        "selection_rationale": (
            "Selected by the published weighted score combining ROC-AUC, recall, "
            "precision, F1, Brier calibration quality, and interpretability. The "
            "formula intentionally excludes accuracy and gives missed-risk recall "
            "and probability calibration explicit weight."
        ),
        "candidates": candidate_results,
    }


def risk_level(probability: float, bands: Iterable[Mapping[str, Any]]) -> str:
    for band in bands:
        if (
            probability >= float(band["minimum"])
            and probability < float(band["maximum_exclusive"])
        ):
            return str(band["level"])
    raise ValueError(f"probability outside configured risk bands: {probability}")


def portable_probability(model_artifact: Mapping[str, Any], row: Mapping[str, Any]) -> float:
    """Mirror the intended browser calculation for parity/reproducibility tests."""
    preprocessing = model_artifact["preprocessing"]
    values: List[float] = []
    numeric = preprocessing["numeric"]
    for feature in numeric["features"]:
        raw = float(row[feature])
        values.append(
            (raw - float(numeric["means"][feature]))
            / float(numeric["scales"][feature])
        )

    for feature in preprocessing["categorical_feature_order"]:
        config = preprocessing["categorical"][feature]
        raw_category = str(row[feature])
        if raw_category not in config["categories"]:
            raise ValueError(f"unsupported category {raw_category!r} for {feature}")
        values.extend(
            1.0 if raw_category == category else 0.0
            for category in config["categories"]
        )

    coefficients = model_artifact["model"]["coefficients"]
    if len(values) != len(coefficients):
        raise ValueError("preprocessed feature count does not match coefficients")
    logit = float(model_artifact["model"]["intercept"]) + sum(
        value * float(coefficient)
        for value, coefficient in zip(values, coefficients)
    )
    clipped = min(35.0, max(-35.0, logit))
    return float(1.0 / (1.0 + math.exp(-clipped)))


def json_ready(value: Any, decimals: int = 10) -> Any:
    """Convert NumPy containers to stable, finite, rounded JSON primitives."""
    if isinstance(value, Mapping):
        return {str(key): json_ready(item, decimals) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_ready(item, decimals) for item in value]
    if isinstance(value, np.ndarray):
        return [json_ready(item, decimals) for item in value.tolist()]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        number = float(value)
        if not math.isfinite(number):
            raise ValueError(f"non-finite metric cannot be exported: {number}")
        return round(number, decimals)
    return value
