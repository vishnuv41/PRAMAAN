from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from app.database import get_db
from app.models.consent import StudentConsent
from app.models.student import Student
from app.services.audit_service import AuditService
from app.security import Principal, get_current_principal, mask_identifier

router = APIRouter(prefix="/consent", tags=["Consent Module"])

@router.get("/student/{student_ref}")
def get_student_consent(
    student_ref: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    consents = db.query(StudentConsent).filter(StudentConsent.student_ref == student_ref).all()
    student = db.query(Student).filter(Student.student_ref == student_ref).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    return {
        "student_ref": student.student_ref,
        "apaar_id": student.apaar_id if principal.role in {"administrator", "prototype_admin"} else mask_identifier(student.apaar_id),
        "full_name": student.full_name,
        "consents": [
            {
                "id": c.id,
                "purpose": c.purpose,
                "consent_granted": c.consent_granted,
                "status": c.status,
                "data_scope": c.data_scope,
                "granted_at": c.granted_at.isoformat() if c.granted_at else None,
                "withdrawn_at": c.withdrawn_at.isoformat() if c.withdrawn_at else None
            }
            for c in consents
        ]
    }

@router.patch("/{consent_id}/toggle")
def toggle_consent_status(
    consent_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    consent = db.query(StudentConsent).filter(StudentConsent.id == consent_id).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found.")

    granted = payload.get("consent_granted", not consent.consent_granted)
    consent.consent_granted = granted
    consent.status = "ACTIVE" if granted else "WITHDRAWN"
    if not granted:
        consent.withdrawn_at = datetime.utcnow()
    else:
        consent.withdrawn_at = None

    db.commit()
    db.refresh(consent)

    AuditService.log_event(
        db=db,
        entity_type="CONSENT",
        entity_id=str(consent.id),
        action="CONSENT_TOGGLE",
        performed_by="Student Web Consent Portal",
        details={
            "student_ref": consent.student_ref,
            "purpose": consent.purpose,
            "new_status": consent.status,
            "granted": consent.consent_granted
        }
    )

    return {
        "success": True,
        "consent_id": consent.id,
        "status": consent.status,
        "consent_granted": consent.consent_granted,
        "message": "Consent status updated. External verification sharing updated accordingly."
    }

@router.post("", status_code=201)
def create_consent_record(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    s_ref = payload.get("student_ref")
    student = db.query(Student).filter(Student.student_ref == s_ref).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    consent = StudentConsent(
        student_ref=s_ref,
        apaar_id=student.apaar_id,
        purpose=payload.get("purpose", "EMPLOYMENT_VERIFICATION"),
        consent_granted=payload.get("consent_granted", True),
        status="ACTIVE" if payload.get("consent_granted", True) else "WITHDRAWN",
        data_scope=payload.get("data_scope", "NAME_PROGRAMME_COMPLETION_ONLY")
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return {"success": True, "id": consent.id, "message": "Consent record registered."}
