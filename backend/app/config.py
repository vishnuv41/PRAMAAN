import os
import json
from pydantic import BaseModel

_DEMO_SECRET_KEY = "demo-institution-secret-key-sentinel-2026"
_environment_value = os.getenv("ENVIRONMENT", "development").lower()
_environment = "production" if _environment_value in {"prod", "production"} else _environment_value
_secret_key = os.getenv("SECRET_KEY", _DEMO_SECRET_KEY)
_api_token_principals = json.loads(os.getenv("API_TOKEN_PRINCIPALS_JSON", "{}"))

import hashlib

_DEMO_TOKENS = {
    "admin-token-2026": {
        "subject": "admin-national-sentinel",
        "role": "administrator",
    },
    "reviewer-token-2026": {
        "subject": "Demo Officer (AICTE-RO-102)",
        "role": "reviewer",
    },
    "dtu-registrar-token-2026": {
        "subject": "registrar-dtu",
        "role": "institution_officer",
        "institution_id": "INST-DELHI-DTU",
    },
    "tcs-verifier-token-2026": {
        "subject": "bgv-officer-tcs",
        "role": "external_verifier",
        "verifier_org_id": "ORG-TCS-BGV",
        "purpose_scope": "EMPLOYMENT_VERIFICATION",
    },
    "auditor-token-2026": {
        "subject": "cag-audit-officer",
        "role": "read_only_auditor",
    },
    "state-delhi-token-2026": {
        "subject": "state-director-delhi",
        "role": "state_officer",
        "institution_id": "STATE-DELHI",
    },
    "state-tn-token-2026": {
        "subject": "tn-state-officer",
        "role": "state_officer",
        "institution_id": "STATE-TAMILNADU",
    },
    "st-joseph-token-2026": {
        "subject": "registrar-st-joseph",
        "role": "institution_officer",
        "institution_id": "INST-CHENNAI-SJC",
    },
    "student-token-2026": {
        "subject": "aarav-sharma",
        "role": "student",
        "student_ref": "STU-DEMO-001",
        "apaar_id": "9876-5432-1001",
    },
}

if not _api_token_principals and _environment != "production" and os.getenv("AUTH_REQUIRED", "false").lower() not in {"1", "true", "yes"} and os.getenv("API_TOKEN_PRINCIPALS_JSON") is None:
    for raw_token, claims in _DEMO_TOKENS.items():
        th = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        _api_token_principals[th] = claims


if _environment == "production" and (
    _secret_key == _DEMO_SECRET_KEY or len(_secret_key) < 32
):
    raise RuntimeError("Production requires a non-default SECRET_KEY of at least 32 characters.")
if _environment == "production":
    raise RuntimeError(
        "Production mode remains disabled for this prototype pending complete security and deployment review."
    )

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEMO_DB = os.path.join(_BACKEND_DIR, "pramaan_india_demo.db")
_PROT_DB = os.path.join(_BACKEND_DIR, "apaar_sentinel.db")
_RESOLVED_DB = _DEMO_DB if os.path.exists(_DEMO_DB) else _PROT_DB
_DEFAULT_DB_URL = f"sqlite:///{_RESOLVED_DB.replace(os.sep, '/')}"

class Settings(BaseModel):
    APP_NAME: str = "PRAMAAN"
    APP_VERSION: str = "1.0.0-hackathon-preview"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_DB_URL)
    SECRET_KEY: str = _secret_key
    ENVIRONMENT: str = _environment
    AUTH_REQUIRED: bool = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
    API_TOKEN_PRINCIPALS: dict[str, dict[str, str]] = _api_token_principals
    DEMO_REVIEWER: str = os.getenv("DEMO_REVIEWER", "Demo Officer (AICTE-RO-102)")
    ALLOW_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "ALLOW_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

settings = Settings()
