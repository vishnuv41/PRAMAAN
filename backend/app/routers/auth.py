import hashlib
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.security import Principal, get_current_principal, Role
from app.database import get_db
from sqlalchemy.orm import Session
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication & Session"])


class LoginRequest(BaseModel):
    username: Optional[str] = Field(None, description="Username or institutional identifier")
    password: Optional[str] = Field(None, description="Password or passphrase")
    token: Optional[str] = Field(None, description="Security Bearer Token / API credential")
    requested_role: str = Field(..., description="Requested operational role context")
    subject: Optional[str] = Field(None, description="Optional subject identity override (for demo)")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    subject: str
    institution_id: Optional[str] = None
    verifier_org_id: Optional[str] = None
    purpose_scope: Optional[str] = None
    student_ref: Optional[str] = None
    apaar_id: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    is_demo: bool = True


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    raw_token = (payload.token or "").strip()
    u = (payload.username or "").strip().lower()
    norm_role = payload.requested_role.strip().lower()
    if norm_role in {"state_directorate", "state"}:
        norm_role = "state_officer"
    elif norm_role in {"aicte_admin", "aicte", "admin"}:
        norm_role = "administrator"
    elif norm_role in {"college", "institution"}:
        norm_role = "institution_officer"

    if not raw_token:
        # Resolve demo credential from username or requested role
        if "admin" in u or norm_role == "administrator":
            raw_token = "admin-token-2026"
        elif "student" in u or "aarav" in u or norm_role == "student":
            raw_token = "student-token-2026"
        elif "tn" in u or "tamil" in u or (norm_role == "state_officer" and "delhi" not in u):
            raw_token = "state-tn-token-2026"
        elif "delhi" in u or norm_role == "state_officer":
            raw_token = "state-delhi-token-2026"
        elif "dtu" in u:
            raw_token = "dtu-registrar-token-2026"
        elif "joseph" in u or "sjc" in u or norm_role == "institution_officer":
            raw_token = "st-joseph-token-2026"

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication token or credential is required.",
        )

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    claims = settings.API_TOKEN_PRINCIPALS.get(token_hash)

    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credential. Security token was not recognized or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    actual_role = claims.get("role")

    # Role validation
    # Allow prototype_admin to access administrator context, but strictly forbid cross-role impersonation
    is_role_match = (
        actual_role == norm_role
        or (actual_role in {"administrator", "prototype_admin"} and norm_role in {"administrator", "prototype_admin"})
    )

    if not is_role_match:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role mismatch: Authenticated credential grants role '{actual_role}', "
                f"which does not permit login under requested role '{payload.requested_role}'."
            ),
        )

    # Record login in audit log
    try:
        AuditService.log_event(
            db=db,
            entity_type="SESSION",
            entity_id=claims.get("subject", "session"),
            action="USER_LOGIN_AUTHENTICATED",
            performed_by=claims.get("subject", "authenticated-user"),
            details={"role": actual_role},
            commit=True,
        )
    except Exception:
        db.rollback()

    user_info = {
        "subject": claims.get("subject", "user"),
        "role": actual_role,
        "institution_id": claims.get("institution_id"),
        "student_ref": claims.get("student_ref"),
        "apaar_id": claims.get("apaar_id"),
    }

    return LoginResponse(
        access_token=raw_token,
        token_type="bearer",
        role=actual_role,
        subject=claims.get("subject", "user"),
        institution_id=claims.get("institution_id"),
        verifier_org_id=claims.get("verifier_org_id"),
        purpose_scope=claims.get("purpose_scope"),
        student_ref=claims.get("student_ref"),
        apaar_id=claims.get("apaar_id"),
        user=user_info,
        is_demo=settings.ENVIRONMENT != "production",
    )


@router.get("/me")
def get_current_user(principal: Principal = Depends(get_current_principal)) -> Dict[str, Any]:
    return {
        "subject": principal.subject,
        "role": principal.role,
        "institution_id": principal.institution_id,
        "verifier_org_id": principal.verifier_org_id,
        "purpose_scope": principal.purpose_scope,
        "student_ref": principal.student_ref,
        "apaar_id": principal.apaar_id,
        "authenticated": True,
    }


@router.post("/logout")
def logout(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    try:
        AuditService.log_event(
            db=db,
            entity_type="SESSION",
            entity_id=principal.subject,
            action="USER_LOGOUT",
            performed_by=principal.subject,
            details={"role": principal.role},
            commit=True,
        )
    except Exception:
        db.rollback()

    return {"message": "Session terminated successfully", "subject": principal.subject}
