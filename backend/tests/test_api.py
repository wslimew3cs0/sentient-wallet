from __future__ import annotations

import json
import math
from pathlib import Path

import pytest
from eth_account import Account
from eth_account.messages import encode_typed_data
from fastapi.testclient import TestClient

from app.attestation import (
    DEFAULT_LOCAL_RISK_SIGNER_LABEL,
    derive_local_development_key,
)
from app.main import create_app


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = REPO_ROOT / "assets" / "models"
FIXED_NOW = 1_900_000_000


@pytest.fixture()
def client() -> TestClient:
    api = create_app(model_dir=MODEL_DIR, environment="development", clock=lambda: FIXED_NOW)
    return TestClient(api)


@pytest.fixture(scope="module")
def vectors() -> list[dict]:
    artifact = json.loads((MODEL_DIR / "model-test-vectors.json").read_text(encoding="utf-8"))
    return artifact["vectors"]


def test_health_reports_exact_model_and_parity_validation(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "service": "sentient-risk-api",
        "status": "ok",
        "model_available": True,
        "model_version": "1.0.0",
        "model_parity_validated": True,
        "attestation_available": True,
        "error": None,
    }


def test_model_and_metrics_endpoints_are_typed_and_synthetic(client: TestClient) -> None:
    model_response = client.get("/risk/model")
    assert model_response.status_code == 200
    model = model_response.json()
    assert model["model_name"] == "Sentient IRS Logistic Regression"
    assert model["model_version"] == "1.0.0"
    assert model["model_type"] == "logistic_regression"
    assert model["data_origin"] == "SYNTHETIC"
    assert model["parity_vectors_validated"] is True
    assert len(model["input_features"]) == 19
    assert [band["level"] for band in model["risk_bands"]] == [
        "LOW",
        "MODERATE",
        "HIGH",
        "CRITICAL",
    ]

    metrics_response = client.get("/risk/metrics")
    assert metrics_response.status_code == 200
    metrics = metrics_response.json()
    assert metrics["selected_model"] == "logistic_regression"
    assert metrics["test_rows"] == 1500
    assert metrics["data_origin"] == "SYNTHETIC"
    assert metrics["confusion_matrix"]["matrix"] == [[827, 136], [252, 285]]
    assert "synthetic" in metrics["warning"].lower()


def test_published_vectors_match_api_inference(
    client: TestClient, vectors: list[dict]
) -> None:
    for vector in vectors:
        response = client.post("/risk/assess", json={"features": vector["features"]})
        assert response.status_code == 200, response.text
        result = response.json()
        expected = vector["expected"]
        assert result["risk_probability"] == pytest.approx(
            expected["risk_probability"], abs=1e-10
        )
        assert result["irs_score"] == expected["irs_score"]
        assert result["risk_level"] == expected["risk_level"]
        assert result["model_version"] == "1.0.0"


def test_missing_required_input_is_rejected(client: TestClient, vectors: list[dict]) -> None:
    incomplete = dict(vectors[0]["features"])
    incomplete.pop("wallet_balance")
    response = client.post("/risk/assess", json={"features": incomplete})
    assert response.status_code == 422
    assert any(error["loc"][-1] == "wallet_balance" for error in response.json()["detail"])


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("transaction_type", "PANIC"),
        ("transaction_amount", -1),
        ("destination_seen_before", 2),
        ("hour_of_day", 24),
        ("market_volatility", "high"),
    ],
)
def test_invalid_input_is_rejected(
    client: TestClient, vectors: list[dict], field: str, value: object
) -> None:
    invalid = dict(vectors[0]["features"])
    invalid[field] = value
    response = client.post("/risk/assess", json={"features": invalid})
    assert response.status_code == 422


def test_extreme_finite_input_stays_in_score_range(
    client: TestClient, vectors: list[dict]
) -> None:
    extreme = dict(vectors[0]["features"])
    extreme.update(
        {
            "transaction_amount": 1e308,
            "wallet_balance": 1.0,
            "amount_balance_ratio": 1e308,
            "transactions_1h": 10**12,
            "transactions_24h": 10**12,
            "approval_ratio": 1e308,
        }
    )
    response = client.post("/risk/assess", json={"features": extreme})
    assert response.status_code == 200, response.text
    result = response.json()
    assert 0 <= result["irs_score"] <= 100
    assert 0 <= result["risk_probability"] <= 1
    assert all(math.isfinite(driver["impact"]) for driver in result["explanation"])


def test_explanation_format_is_deterministic_and_non_diagnostic(
    client: TestClient, vectors: list[dict]
) -> None:
    first = client.post("/risk/assess", json={"features": vectors[1]["features"]}).json()
    second = client.post("/risk/assess", json={"features": vectors[1]["features"]}).json()
    assert first["explanation"] == second["explanation"]
    assert 1 <= len(first["explanation"]) <= 6
    for driver in first["explanation"]:
        assert set(driver) == {"feature", "label", "impact", "direction"}
        assert driver["direction"] in {"INCREASES_RISK", "DECREASES_RISK", "NEUTRAL"}
    combined_text = f"{first['summary']} {first['warning']}".lower()
    assert "synthetic" in combined_text
    assert "emotion detected" not in combined_text
    assert "diagnosis" not in first["summary"].lower()


def test_model_unavailable_degrades_health_and_blocks_assessment(
    tmp_path: Path, vectors: list[dict]
) -> None:
    unavailable_client = TestClient(
        create_app(model_dir=tmp_path, environment="development", clock=lambda: FIXED_NOW)
    )
    health = unavailable_client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "degraded"
    assert health.json()["model_available"] is False

    response = unavailable_client.post("/risk/assess", json={"features": vectors[0]["features"]})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_UNAVAILABLE"


def test_development_attestation_matches_contract_eip712_shape(
    client: TestClient, vectors: list[dict]
) -> None:
    context = {
        "account": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        "target": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "value": 123456789,
        "data": "0x1234",
        "nonce": 0,
        "policy_version": 1,
        "chain_id": 31337,
        "verifying_contract": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "expires_at": FIXED_NOW + 300,
    }
    response = client.post(
        "/risk/assess",
        json={"features": vectors[2]["features"], "attestation": context},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    attestation = result["attestation"]

    assert attestation["primaryType"] == "Attestation"
    assert attestation["developmentOnly"] is True
    assert attestation["domain"] == {
        "name": "SentientRiskPolicy",
        "version": "1",
        "chainId": 31337,
        "verifyingContract": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    }
    assert [field["name"] for field in attestation["types"]["Attestation"]] == [
        "account",
        "target",
        "value",
        "dataHash",
        "riskScore",
        "nonce",
        "policyVersion",
        "expiresAt",
    ]
    assert attestation["message"]["riskScore"] == result["irs_score"]
    assert attestation["message"]["nonce"] == 0
    assert attestation["message"]["policyVersion"] == 1
    assert attestation["message"]["expiresAt"] == FIXED_NOW + 300
    assert len(attestation["digest"]) == 66
    assert len(attestation["signature"]) == 132

    signable = encode_typed_data(
        full_message={
            "types": attestation["types"],
            "primaryType": attestation["primaryType"],
            "domain": attestation["domain"],
            "message": attestation["message"],
        }
    )
    recovered = Account.recover_message(signable, signature=attestation["signature"])
    expected_signer = Account.from_key(
        derive_local_development_key(DEFAULT_LOCAL_RISK_SIGNER_LABEL)
    ).address
    assert recovered == expected_signer
    assert attestation["signer"] == expected_signer


def test_attestation_input_validation_and_production_disablement(
    client: TestClient, vectors: list[dict]
) -> None:
    invalid_context = {
        "account": "not-an-address",
        "target": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "nonce": 0,
        "policy_version": 1,
        "verifying_contract": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    }
    response = client.post(
        "/risk/assess",
        json={"features": vectors[0]["features"], "attestation": invalid_context},
    )
    assert response.status_code == 422

    production_client = TestClient(
        create_app(model_dir=MODEL_DIR, environment="production", clock=lambda: FIXED_NOW)
    )
    valid_context = {
        **invalid_context,
        "account": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    }
    disabled = production_client.post(
        "/risk/assess",
        json={"features": vectors[0]["features"], "attestation": valid_context},
    )
    assert disabled.status_code == 503

    non_local_context = {**valid_context, "chain_id": 1}
    non_local = client.post(
        "/risk/assess",
        json={"features": vectors[0]["features"], "attestation": non_local_context},
    )
    assert non_local.status_code == 422
    assert "31337" in non_local.json()["detail"]
