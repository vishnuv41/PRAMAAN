from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.models.enrolment import Enrolment
from app.schemas.enrolment import EnrolmentCreate, EnrolmentResponse
from app.services.integrity_engine import TemporalIntegrityEngine
from app.security import Principal, enforce_institution_scope, mask_identifier, get_current_principal

router = APIRouter(prefix="/enrolments", tags=["Enrolments"])

@router.get("", response_model=Dict[str, Any])
def list_enrolments(
    student_ref: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    programme_id: Optional[str] = Query(None),
    enrolment_status: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    institution_id = enforce_institution_scope(principal, institution_id)
    query = db.query(Enrolment)

    if student_ref:
        query = query.filter(Enrolment.student_ref == student_ref)
    if institution_id:
        query = query.filter(Enrolment.institution_id == institution_id)
    if programme_id:
        query = query.filter(Enrolment.programme_id == programme_id)
    if enrolment_status:
        query = query.filter(Enrolment.enrolment_status == enrolment_status)
    if academic_year:
        query = query.filter(Enrolment.academic_year == academic_year)

    total = query.count()
    items = query.order_by(Enrolment.enrolment_start.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [
            {
                "id": e.id,
                "student_ref": e.student_ref,
                "apaar_id": e.apaar_id if principal.role in {"administrator", "prototype_admin"} else mask_identifier(e.apaar_id),
                "institution_id": e.institution_id,
                "institution_name": e.institution_name,
                "programme_id": e.programme_id,
                "programme_name": e.programme_name,
                "academic_year": e.academic_year,
                "admission_cycle": e.admission_cycle,
                "enrolment_start": e.enrolment_start.isoformat(),
                "enrolment_end": e.enrolment_end.isoformat() if e.enrolment_end else None,
                "enrolment_status": e.enrolment_status,
                "seat_category": e.seat_category,
                "exception_ref": e.exception_ref,
                "source_submission_id": e.source_submission_id,
                "record_version": e.record_version,
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in items
        ],
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("", response_model=EnrolmentResponse, status_code=201)
def create_enrolment(
    payload: EnrolmentCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    if principal.role == "institution_officer" and payload.institution_id != principal.institution_id:
        raise HTTPException(status_code=403, detail="Institution operators can only create records for their assigned institution.")
    enrolment = Enrolment(
        student_ref=payload.student_ref,
        apaar_id=payload.apaar_id,
        institution_id=payload.institution_id,
        institution_name=payload.institution_name or payload.institution_id,
        programme_id=payload.programme_id,
        programme_name=payload.programme_name or payload.programme_id,
        academic_year=payload.academic_year,
        admission_cycle=payload.admission_cycle,
        enrolment_start=payload.enrolment_start,
        enrolment_end=payload.enrolment_end,
        enrolment_status=payload.enrolment_status,
        seat_category=payload.seat_category,
        exception_ref=payload.exception_ref,
        source_submission_id=payload.source_submission_id,
        record_version=payload.record_version
    )
    db.add(enrolment)
    db.commit()
    db.refresh(enrolment)

    # Re-evaluate student's integrity
    engine_svc = TemporalIntegrityEngine(db)
    engine_svc.evaluate_student(payload.student_ref)

    response = EnrolmentResponse.model_validate(enrolment)
    if principal.role not in {"administrator", "prototype_admin"}:
        response = response.model_copy(update={"apaar_id": mask_identifier(response.apaar_id)})
    return response
