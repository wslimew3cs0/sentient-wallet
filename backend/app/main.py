from __future__ import annotations

import os
import time
from collections.abc import Callable
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .attestation import AttestationUnavailableError, DevelopmentAttestationSigner
from .model_service import ModelUnavailableError, RiskModelService
from .schemas import (
    HealthResponse,
    ModelInfoResponse,
    ModelMetricsResponse,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
)


DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[2] / "assets" / "models"
DEFAULT_LOCAL_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:8788",
    "http://localhost:8788",
]


def create_app(
    model_dir: Path | None = None,
    environment: str | None = None,
    attestation_key: str | None = None,
    clock: Callable[[], float] = time.time,
) -> FastAPI:
    active_environment = environment or os.getenv("SENTIENT_ENV", "development")
    configured_model_dir = model_dir or Path(os.getenv("SENTIENT_MODEL_DIR", DEFAULT_MODEL_DIR))
    model_service = RiskModelService(configured_model_dir)
    attestation_signer = DevelopmentAttestationSigner(
        environment=active_environment,
        private_key=attestation_key,
        clock=clock,
    )

    api = FastAPI(
        title="Sentient Wallet Risk API",
        version="0.1.0",
        description="Local deterministic IRS inference using synthetic-data model artifacts.",
    )
    origins = [
        item.strip()
        for item in os.getenv("SENTIENT_CORS_ORIGINS", ",".join(DEFAULT_LOCAL_ORIGINS)).split(",")
        if item.strip()
    ]
    api.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    api.state.model_service = model_service
    api.state.attestation_signer = attestation_signer

    def require_model() -> RiskModelService:
        if not model_service.available:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "MODEL_UNAVAILABLE",
                    "message": model_service.load_error or "Risk model is unavailable",
                },
            )
        return model_service

    @api.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            service="sentient-risk-api",
            status="ok" if model_service.available else "degraded",
            model_available=model_service.available,
            model_version=model_service.model_version,
            model_parity_validated=model_service.parity_validated,
            attestation_available=attestation_signer.enabled,
            error=model_service.load_error,
        )

    @api.get("/risk/model", response_model=ModelInfoResponse)
    def risk_model() -> ModelInfoResponse:
        service = require_model()
        try:
            return ModelInfoResponse.model_validate(service.model_info())
        except ModelUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @api.get("/risk/metrics", response_model=ModelMetricsResponse)
    def risk_metrics() -> ModelMetricsResponse:
        service = require_model()
        try:
            return ModelMetricsResponse.model_validate(service.metrics_info())
        except ModelUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @api.post("/risk/assess", response_model=RiskAssessmentResponse)
    def assess_risk(payload: RiskAssessmentRequest) -> RiskAssessmentResponse:
        service = require_model()
        try:
            assessment = service.assess(payload.features)
        except ModelUnavailableError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        signed_attestation = None
        if payload.attestation is not None:
            try:
                signed_attestation = attestation_signer.sign(payload.attestation, assessment.score)
            except AttestationUnavailableError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc

        assert service.model is not None
        return RiskAssessmentResponse(
            model_name=service.model["model_name"],
            model_version=service.model["model_version"],
            model_status=service.model["model_status"],
            data_origin=service.model["data_origin"],
            risk_probability=assessment.probability,
            irs_score=assessment.score,
            risk_level=assessment.risk_level,
            recommended_policy=assessment.recommended_policy,
            explanation=assessment.explanation,
            summary=assessment.summary,
            warning=service.model["warning"],
            attestation=signed_attestation,
        )

    return api


app = create_app()
