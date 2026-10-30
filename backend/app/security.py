import hashlib
import re
from typing import Literal, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, ValidationError

from app.config import settings


Role = Literal[
    "administrator",
    "institution_officer",
    "reviewer",
    "read_only_auditor",
    "external_verifier",
    "prototype_admin",
    "state_officer",
    "student",
]


class Principal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str
    role: Role
    institution_id: Optional[str] = None
    verifier_org_id: Optional[str] = None
    purpose_scope: Optional[Literal["EMPLOYMENT_VERIFICATION"]] = None
    student_ref: Optional[str] = None
    apaar_id: Optional[str] = None


bearer_scheme = HTTPBearer(auto_error=False)
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _validate_token_registry() -> None:
    registry = settings.API_TOKEN_PRINCIPALS
    if not isinstance(registry, dict):
        raise RuntimeError("API_TOKEN_PRINCIPALS_JSON must be a JSON object keyed by SHA-256 token hashes.")
    if settings.AUTH_REQUIRED and not registry:
        raise RuntimeError("AUTH_REQUIRED is enabled but no API token principals are configured.")
    for token_hash, claims in registry.items():
        if not _SHA256_RE.fullmatch(token_hash):
            raise RuntimeError("API_TOKEN_PRINCIPALS_JSON keys must be lowercase SHA-256 hex digests.")
        try:
            principal = Principal.model_validate(claims)
        except ValidationError as exc:
            raise RuntimeError("API_TOKEN_PRINCIPALS_JSON contains invalid principal claims.") from exc
        if settings.AUTH_REQUIRED and principal.role == "prototype_admin":
            raise RuntimeError("prototype_admin principals are only available when AUTH_REQUIRED is false.")


def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Principal:
    if credentials is None:
        if settings.AUTH_REQUIRED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Bearer authentication is required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return Principal(subject="local-prototype", role="prototype_admin")

    token_hash = hashlib.sha256(credentials.credentials.encode("utf-8")).hexdigest()
    claims = settings.API_TOKEN_PRINCIPALS.get(token_hash)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer credential.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return Principal.model_validate(claims)
    except ValidationError as exc:
        raise HTTPException(status_code=503, detail="Configured bearer principal is invalid.") from exc


def require_roles(*allowed_roles: Role):
    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role != "prototype_admin" and principal.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="This role is not permitted to perform this action.")
        return principal

    return dependency


def authorize_api_request(
    request: Request,
    principal: Principal = Depends(get_current_principal),
) -> Principal:
    if principal.role in {"administrator", "prototype_admin"}:
        return principal

    path = request.url.path.removeprefix(settings.API_V1_PREFIX)
    method = request.method.upper()
    allowed = False

    if principal.role == "external_verifier":
        allowed = (
            (method == "POST" and path == "/verifier/verify-credential")
            or (method == "GET" and path == "/verifier/logs")
        )
    elif principal.role == "read_only_auditor":
        allowed = method in {"GET", "HEAD"}
    elif principal.role == "student":
        # Students can read their own profile, enrolments, certificates, consents, and transfers
        allowed = (
            method in {"GET", "HEAD"} and (
                path == "/students/me"
                or path.startswith(f"/students/{principal.student_ref}")
                or path == "/enrolments"
                or path.startswith("/enrolments/")
                or path == "/transfers"
                or path.startswith("/transfers/")
                or path == "/certificates"
                or path.startswith("/certificates/")
                or path == "/consent"
                or path.startswith("/consent/")
                or path == "/alerts"
            )
        ) or (
            method in {"POST", "PUT", "PATCH"}
            and path.startswith("/consent")
        )
    elif principal.role == "state_officer":
        allowed = method in {"GET", "HEAD"} and (
            path == "/students"
            or path.startswith("/students/")
            or path == "/enrolments"
            or path == "/intake-compliance"
            or path.startswith("/intake-compliance/")
            or path == "/institutions"
            or path == "/reports"
            or path.startswith("/reports/")
            or path == "/alerts"
            or path == "/dashboard/summary"
            or path == "/aicte/dashboard-summary"
            or path == "/transfers"
            or path.startswith("/transfers/")
        )
    elif principal.role == "reviewer":
        allowed = method in {"GET", "HEAD"}
        if method in {"POST", "PATCH"}:
            allowed = (
                any(path.endswith(suffix) for suffix in (
                    "/review", "/assignment", "/clarification", "/notes", "/reopen"
                ))
                or (path.startswith("/analytics/anomalies/") and path.endswith("/dismiss"))
            )
    elif principal.role == "institution_officer":
        allowed = (
            method in {"GET", "HEAD"}
            and (
                path == "/students"
                or path.startswith("/students/")
                or path == "/enrolments"
                or path == "/institution/dashboard-summary"
                or path == "/intake-compliance"
                or path.startswith("/intake-compliance/")
                or path == "/alerts"
                or path == "/certificates"
                or path.startswith("/certificates/")
                or path == "/transfers"
                or path.startswith("/transfers/")
            )
        ) or (
            method == "POST"
            and (
                path in {"/students", "/students/upload-csv", "/enrolments"}
                or path.startswith("/transfers")
            )
        )

    if not allowed:
        raise HTTPException(status_code=403, detail="This role is not permitted to access this API operation.")
    return principal


INSTITUTION_ALIASES: dict[str, str] = {
    "INST-DEMO-01": "INST-CHENNAI-SJC",
    "INST-CHENNAI-SJC": "INST-CHENNAI-SJC",
    "INST-DELHI-DTU": "INST-DELHI-DTU",
}

def canonical_institution_id(inst_id: Optional[str]) -> Optional[str]:
    if not inst_id:
        return inst_id
    clean = str(inst_id).strip()
    return INSTITUTION_ALIASES.get(clean, clean)

def get_institution_aliases(inst_id: Optional[str]) -> list[str]:
    if not inst_id:
        return []
    canon = canonical_institution_id(inst_id)
    aliases = [k for k, v in INSTITUTION_ALIASES.items() if v == canon]
    if canon and canon not in aliases:
        aliases.append(canon)
    return aliases

def enforce_institution_scope(principal: Principal, requested_institution_id: Optional[str]) -> Optional[str]:
    if principal.role == "institution_officer":
        if not principal.institution_id:
            raise HTTPException(status_code=403, detail="No institution is assigned to this principal.")
        canon_principal = canonical_institution_id(principal.institution_id)
        if requested_institution_id:
            canon_requested = canonical_institution_id(requested_institution_id)
            if canon_requested != canon_principal:
                raise HTTPException(status_code=403, detail="Cross-institution access is not permitted.")
        return canon_principal
    return requested_institution_id


def mask_identifier(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    visible = value[-4:]
    return f"{'*' * max(4, len(value) - len(visible))}{visible}"


def mask_sensitive_payload(value):
    if isinstance(value, dict):
        masked = {}
        for key, item in value.items():
            normalized_key = str(key).lower()
            if normalized_key in {"apaar_id", "query_apaar_id", "passport_ref"}:
                masked[key] = mask_identifier(str(item)) if item is not None else None
            elif normalized_key in {"identity_evidence", "matched_identity"}:
                masked[key] = "[redacted]"
            elif normalized_key in {"signature_hex", "private_key", "access_token", "refresh_token"}:
                masked[key] = None
            else:
                masked[key] = mask_sensitive_payload(item)
        return masked
    if isinstance(value, list):
        return [mask_sensitive_payload(item) for item in value]
    return value


def require_student_institution(db, student_ref: str, institution_id: Optional[str]) -> None:
    if not institution_id:
        return
    from app.models.enrolment import Enrolment
    from app.models.student import Student

    student = db.query(Student).filter(Student.student_ref == student_ref).first()
    has_primary_scope = bool(student and student.primary_institution_id == institution_id)
    has_enrolment_scope = db.query(Enrolment.id).filter(
        Enrolment.student_ref == student_ref,
        Enrolment.institution_id == institution_id,
    ).first() is not None
    if not has_primary_scope and not has_enrolment_scope:
        raise HTTPException(status_code=404, detail="Student not found in this institution.")


_validate_token_registry()
