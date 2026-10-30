import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transfer import StudentTransfer
from app.models.student import Student
from app.models.enrolment import Enrolment
from app.services.audit_service import AuditService
from app.services.integrity_engine import TemporalIntegrityEngine
from app.security import (
    Principal,
    get_current_principal,
    mask_identifier,
)

router = APIRouter(prefix="/transfers", tags=["Academic Transfers"])

INSTITUTION_METADATA = {
    "INST-DELHI-DTU": {"name": "Delhi Technological University (Demo)", "state": "Delhi"},
    "INST-DELHI-IIITD": {"name": "Indraprastha Institute of IT Delhi (Demo)", "state": "Delhi"},
    "INST-DELHI-NSUT": {"name": "Netaji Subhas University of Technology (Demo)", "state": "Delhi"},
    "INST-MUMBAI-IITB": {"name": "IIT Bombay External Extension (Demo)", "state": "Maharashtra"},
    "INST-PUNE-COEP": {"name": "COEP Technological University (Demo)", "state": "Maharashtra"},
    "INST-TRICHY-NITT": {"name": "National Institute of Technology Trichy (Demo)", "state": "Tamil Nadu"},
}


class InitiateTransferRequest(BaseModel):
    student_ref: str = Field(..., description="Student reference ID")
    destination_institution_id: str = Field(..., description="Destination institution ID")
    programme_id: Optional[str] = Field(None, description="Destination programme ID")
    programme_name: Optional[str] = Field(None, description="Destination programme name")
    reason: Optional[str] = Field("Academic transfer requested", description="Transfer reason")


class TransferActionRequest(BaseModel):
    comment: Optional[str] = Field(None, description="Action or review comment")


def _serialize_transfer(t: StudentTransfer, principal: Principal) -> Dict[str, Any]:
    apaar = t.apaar_id if principal.role in {"administrator", "prototype_admin"} else mask_identifier(t.apaar_id)
    return {
        "id": t.id,
        "transfer_id": t.transfer_id,
        "student_ref": t.student_ref,
        "apaar_id": apaar,
        "student_name": t.student_name,
        "source_institution_id": t.source_institution_id,
        "source_institution_name": t.source_institution_name,
        "source_state": t.source_state,
        "destination_institution_id": t.destination_institution_id,
        "destination_institution_name": t.destination_institution_name,
        "destination_state": t.destination_state,
        "is_interstate": t.source_state.lower() != t.destination_state.lower(),
        "programme_id": t.programme_id,
        "programme_name": t.programme_name,
        "academic_year": t.academic_year,
        "status": t.status,
        "stage": t.stage,
        "reason": t.reason,
        "initiated_by": t.initiated_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "released_at": t.released_at.isoformat() if t.released_at else None,
        "admitted_at": t.admitted_at.isoformat() if t.admitted_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "timeline": t.get_timeline(),
    }


@router.get("", response_model=Dict[str, Any])
def list_transfers(
    student_ref: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    institution_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    query = db.query(StudentTransfer)

    # Role-based scoping
    if principal.role == "student":
        if not principal.student_ref:
            raise HTTPException(status_code=403, detail="Student principal missing student reference claim.")
        query = query.filter(StudentTransfer.student_ref == principal.student_ref)
    elif principal.role == "institution_officer":
        inst = principal.institution_id
        if not inst:
            raise HTTPException(status_code=403, detail="No institution assigned to principal.")
        query = query.filter(
            (StudentTransfer.source_institution_id == inst) |
            (StudentTransfer.destination_institution_id == inst)
        )
    elif principal.role == "state_officer":
        # Scoped to designated state from principal or query
        target_state = "Delhi"
        if principal.institution_id:
            if "TAMIL" in principal.institution_id.upper() or "TN" in principal.institution_id.upper():
                target_state = "Tamil Nadu"
            elif "MAHA" in principal.institution_id.upper() or "MH" in principal.institution_id.upper():
                target_state = "Maharashtra"
        elif principal.subject and ("tn" in principal.subject.lower() or "tamil" in principal.subject.lower()):
            target_state = "Tamil Nadu"
        
        if state:
            target_state = state

        query = query.filter(
            (StudentTransfer.source_state.ilike(f"%{target_state}%")) |
            (StudentTransfer.destination_state.ilike(f"%{target_state}%"))
        )

    # Additional user query filters
    if student_ref and principal.role != "student":
        query = query.filter(StudentTransfer.student_ref == student_ref)
    if status_filter:
        query = query.filter(StudentTransfer.status == status_filter)
    if institution_id and principal.role in {"administrator", "prototype_admin"}:
        query = query.filter(
            (StudentTransfer.source_institution_id == institution_id) |
            (StudentTransfer.destination_institution_id == institution_id)
        )
    if state and principal.role in {"administrator", "prototype_admin"}:
        query = query.filter(
            (StudentTransfer.source_state.ilike(f"%{state}%")) |
            (StudentTransfer.destination_state.ilike(f"%{state}%"))
        )

    total = query.count()
    items = query.order_by(StudentTransfer.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "items": [_serialize_transfer(t, principal) for t in items],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if limit else 1,
    }


@router.get("/{transfer_id}")
def get_transfer_detail(
    transfer_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    transfer = db.query(StudentTransfer).filter(StudentTransfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found.")

    # Scoping check
    if principal.role == "student" and transfer.student_ref != principal.student_ref:
        raise HTTPException(status_code=403, detail="Access denied: Students can only view their own transfers.")
    if principal.role == "institution_officer":
        if principal.institution_id not in {transfer.source_institution_id, transfer.destination_institution_id}:
            raise HTTPException(status_code=403, detail="Access denied: Institution is not party to this transfer.")
    if principal.role == "state_officer":
        if "Delhi" not in {transfer.source_state, transfer.destination_state}:
            raise HTTPException(status_code=403, detail="Access denied: Transfer is outside state jurisdiction.")

    return _serialize_transfer(transfer, principal)


@router.post("/initiate", status_code=status.HTTP_201_CREATED)
def initiate_transfer(
    payload: InitiateTransferRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    if principal.role not in {"institution_officer", "administrator", "prototype_admin"}:
        raise HTTPException(status_code=403, detail="Only institution registrars or administrators can initiate transfers.")

    # Find student
    student = db.query(Student).filter(Student.student_ref == payload.student_ref).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{payload.student_ref}' not found.")

    # Find active source enrolment
    source_enrolment = db.query(Enrolment).filter(
        Enrolment.student_ref == payload.student_ref,
        Enrolment.enrolment_status == "Active"
    ).order_by(Enrolment.enrolment_start.desc()).first()

    if not source_enrolment:
        # Fall back to latest enrolment
        source_enrolment = db.query(Enrolment).filter(
            Enrolment.student_ref == payload.student_ref
        ).order_by(Enrolment.enrolment_start.desc()).first()

    if not source_enrolment:
        raise HTTPException(status_code=400, detail="Student has no enrolment record to transfer from.")

    source_inst_id = source_enrolment.institution_id
    if principal.role == "institution_officer" and principal.institution_id != source_inst_id:
        raise HTTPException(status_code=403, detail=f"Cannot initiate transfer for student enrolled at '{source_inst_id}'.")

    dest_meta = INSTITUTION_METADATA.get(payload.destination_institution_id, {
        "name": payload.destination_institution_id,
        "state": "National"
    })
    source_meta = INSTITUTION_METADATA.get(source_inst_id, {
        "name": source_enrolment.institution_name,
        "state": "Delhi"
    })

    if payload.destination_institution_id == source_inst_id:
        raise HTTPException(status_code=400, detail="Destination institution cannot be the same as source institution.")

    transfer_id = f"TRF-{datetime.utcnow().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.utcnow()

    initial_timeline = [
        {
            "stage": 1,
            "status": "TRANSFER_REQUESTED",
            "timestamp": now.isoformat(),
            "actor": principal.subject,
            "comment": payload.reason or "Transfer request initiated",
        },
        {
            "stage": 2,
            "status": "SOURCE_REVIEW",
            "timestamp": now.isoformat(),
            "actor": principal.subject,
            "comment": "Transferred to Source Institution Registrar for No-Objection verification",
        }
    ]

    transfer = StudentTransfer(
        transfer_id=transfer_id,
        student_ref=student.student_ref,
        apaar_id=student.apaar_id,
        student_name=student.full_name,
        source_institution_id=source_inst_id,
        source_institution_name=source_meta["name"],
        source_state=source_meta["state"],
        destination_institution_id=payload.destination_institution_id,
        destination_institution_name=dest_meta["name"],
        destination_state=dest_meta["state"],
        programme_id=payload.programme_id or source_enrolment.programme_id,
        programme_name=payload.programme_name or source_enrolment.programme_name,
        academic_year=source_enrolment.academic_year or "2025-2026",
        status="SOURCE_REVIEW",
        stage=2,
        reason=payload.reason,
        initiated_by=principal.subject,
        created_at=now,
    )
    transfer.set_timeline(initial_timeline)

    db.add(transfer)
    AuditService.log_event(
        db=db,
        entity_type="TRANSFER",
        entity_id=transfer_id,
        action="TRANSFER_INITIATED",
        performed_by=principal.subject,
        details={"source": source_inst_id, "destination": payload.destination_institution_id, "student_ref": student.student_ref},
        commit=False
    )
    db.commit()
    db.refresh(transfer)

    return _serialize_transfer(transfer, principal)


@router.post("/{transfer_id}/release")
def release_transfer(
    transfer_id: str,
    payload: TransferActionRequest = TransferActionRequest(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    transfer = db.query(StudentTransfer).filter(StudentTransfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found.")

    if principal.role == "institution_officer" and principal.institution_id != transfer.source_institution_id:
        raise HTTPException(status_code=403, detail="Only the source institution can release this transfer.")

    if transfer.stage >= 3:
        raise HTTPException(status_code=400, detail=f"Transfer is already at stage {transfer.stage} ({transfer.status}).")

    now = datetime.utcnow()
    transfer.stage = 3
    transfer.status = "SOURCE_RELEASED"
    transfer.released_at = now

    # Update source enrolment: mark as Withdrawn and set end date
    source_enrolment = db.query(Enrolment).filter(
        Enrolment.student_ref == transfer.student_ref,
        Enrolment.institution_id == transfer.source_institution_id,
        Enrolment.enrolment_status == "Active"
    ).first()

    if source_enrolment:
        source_enrolment.enrolment_status = "Withdrawn"
        source_enrolment.enrolment_end = date.today()
        source_enrolment.record_version = (source_enrolment.record_version or 1) + 1

    timeline = transfer.get_timeline()
    timeline.append({
        "stage": 3,
        "status": "SOURCE_RELEASED",
        "timestamp": now.isoformat(),
        "actor": principal.subject,
        "comment": payload.comment or "Student officially released with No-Objection Certificate (NOC)",
    })
    timeline.append({
        "stage": 4,
        "status": "DESTINATION_REVIEW",
        "timestamp": now.isoformat(),
        "actor": "SYSTEM",
        "comment": "Transfer dossier routed to Destination Institution for admission acceptance",
    })
    transfer.stage = 4
    transfer.status = "DESTINATION_REVIEW"
    transfer.set_timeline(timeline)

    # Re-evaluate integrity
    try:
        TemporalIntegrityEngine(db).evaluate_student(transfer.student_ref)
    except Exception:
        pass

    AuditService.log_event(
        db=db,
        entity_type="TRANSFER",
        entity_id=transfer_id,
        action="TRANSFER_SOURCE_RELEASED",
        performed_by=principal.subject,
        details={"source": transfer.source_institution_id, "student_ref": transfer.student_ref},
        commit=False
    )
    db.commit()
    db.refresh(transfer)

    return _serialize_transfer(transfer, principal)


@router.post("/{transfer_id}/admit")
def admit_transfer(
    transfer_id: str,
    payload: TransferActionRequest = TransferActionRequest(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    transfer = db.query(StudentTransfer).filter(StudentTransfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found.")

    if principal.role == "institution_officer" and principal.institution_id != transfer.destination_institution_id:
        raise HTTPException(status_code=403, detail="Only the destination institution can admit this transfer.")

    if transfer.stage not in {3, 4, 5}:
        raise HTTPException(status_code=400, detail=f"Transfer cannot be admitted from stage {transfer.stage} ({transfer.status}).")

    now = datetime.utcnow()
    transfer.admitted_at = now
    transfer.completed_at = now
    transfer.stage = 6
    transfer.status = "COMPLETED"

    # Create or activate destination enrolment
    dest_enrolment = db.query(Enrolment).filter(
        Enrolment.student_ref == transfer.student_ref,
        Enrolment.institution_id == transfer.destination_institution_id,
        Enrolment.programme_id == transfer.programme_id
    ).first()

    if not dest_enrolment:
        dest_enrolment = Enrolment(
            student_ref=transfer.student_ref,
            apaar_id=transfer.apaar_id,
            institution_id=transfer.destination_institution_id,
            institution_name=transfer.destination_institution_name,
            programme_id=transfer.programme_id,
            programme_name=transfer.programme_name,
            academic_year=transfer.academic_year or "2025-2026",
            admission_cycle="Transfer/Lateral 2026",
            enrolment_start=date.today(),
            enrolment_end=None,
            enrolment_status="Active",
            seat_category="General",
            exception_ref=None,
            source_submission_id=f"SUB-TRF-{transfer.transfer_id}",
            record_version=1,
            created_at=now,
        )
        db.add(dest_enrolment)
    else:
        dest_enrolment.enrolment_status = "Active"
        dest_enrolment.enrolment_start = date.today()
        dest_enrolment.enrolment_end = None
        dest_enrolment.record_version = (dest_enrolment.record_version or 1) + 1

    # Update student primary institution
    student = db.query(Student).filter(Student.student_ref == transfer.student_ref).first()
    if student:
        student.primary_institution_id = transfer.destination_institution_id

    timeline = transfer.get_timeline()
    timeline.append({
        "stage": 5,
        "status": "DESTINATION_ADMITTED",
        "timestamp": now.isoformat(),
        "actor": principal.subject,
        "comment": payload.comment or "Student admitted and enrolment verified at destination institution",
    })
    timeline.append({
        "stage": 6,
        "status": "COMPLETED",
        "timestamp": now.isoformat(),
        "actor": "SYSTEM",
        "comment": "Transfer lifecycle completed successfully across AICTE National registry",
    })
    transfer.set_timeline(timeline)

    # Re-evaluate integrity
    try:
        TemporalIntegrityEngine(db).evaluate_student(transfer.student_ref)
    except Exception:
        pass

    AuditService.log_event(
        db=db,
        entity_type="TRANSFER",
        entity_id=transfer_id,
        action="TRANSFER_ADMITTED_COMPLETED",
        performed_by=principal.subject,
        details={"destination": transfer.destination_institution_id, "student_ref": transfer.student_ref},
        commit=False
    )
    db.commit()
    db.refresh(transfer)

    return _serialize_transfer(transfer, principal)


@router.post("/{transfer_id}/cancel")
def cancel_transfer(
    transfer_id: str,
    payload: TransferActionRequest = TransferActionRequest(),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    transfer = db.query(StudentTransfer).filter(StudentTransfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found.")

    if principal.role == "institution_officer":
        if principal.institution_id not in {transfer.source_institution_id, transfer.destination_institution_id}:
            raise HTTPException(status_code=403, detail="Only parties to the transfer can cancel it.")

    if transfer.stage == 6:
        raise HTTPException(status_code=400, detail="Completed transfers cannot be cancelled.")

    now = datetime.utcnow()
    transfer.status = "CANCELLED"
    timeline = transfer.get_timeline()
    timeline.append({
        "stage": transfer.stage,
        "status": "CANCELLED",
        "timestamp": now.isoformat(),
        "actor": principal.subject,
        "comment": payload.comment or "Transfer cancelled",
    })
    transfer.set_timeline(timeline)

    AuditService.log_event(
        db=db,
        entity_type="TRANSFER",
        entity_id=transfer_id,
        action="TRANSFER_CANCELLED",
        performed_by=principal.subject,
        details={"transfer_id": transfer_id},
        commit=False
    )
    db.commit()
    db.refresh(transfer)

    return _serialize_transfer(transfer, principal)
