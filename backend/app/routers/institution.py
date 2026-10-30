from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, Optional
from app.database import get_db
from app.models.enrolment import Enrolment
from app.models.student import Student
from app.models.alert import Alert
from app.models.intake import ApprovedIntake
from app.models.consent import StudentConsent
from app.security import Principal, enforce_institution_scope, get_institution_aliases, mask_identifier, get_current_principal

router = APIRouter(prefix="/institution", tags=["Institution Dashboard"])

@router.get("/dashboard-summary")
def get_institution_dashboard(
    institution_id: Optional[str] = Query(None, description="Current logged-in institution ID"),
    academic_year: Optional[str] = Query("2025-2026"),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    if principal.role == "institution_officer":
        institution_id = enforce_institution_scope(principal, institution_id)
    else:
        institution_id = institution_id or "INST-DELHI-DTU"
    aliases = get_institution_aliases(institution_id) or [institution_id]
    # 1. Total student count in this institution
    inst_enrolments = db.query(Enrolment).filter(Enrolment.institution_id.in_(aliases))
    if academic_year:
        inst_enrolments = inst_enrolments.filter(Enrolment.academic_year == academic_year)

    enrolment_records = inst_enrolments.all()
    total_enrolments = len(enrolment_records)
    active_students = sum(1 for e in enrolment_records if e.enrolment_status == "Active")
    completed_students = sum(1 for e in enrolment_records if e.enrolment_status == "Completed")
    withdrawn_students = sum(1 for e in enrolment_records if e.enrolment_status == "Withdrawn")

    # 2. Approved Intake utilization for this college
    rules = db.query(ApprovedIntake).filter(
        ApprovedIntake.institution_id.in_(aliases),
        ApprovedIntake.academic_year == academic_year
    ).all()

    intake_status = []
    total_sanctioned = 0
    total_new_admitted = 0
    for r in rules:
        admitted = db.query(func.count(Enrolment.id)).filter(
            Enrolment.institution_id.in_(aliases),
            Enrolment.programme_id == r.programme_id,
            Enrolment.academic_year == academic_year
        ).scalar() or 0
        total_sanctioned += r.approved_intake_seats
        total_new_admitted += admitted
        intake_status.append({
            "programme_id": r.programme_id,
            "programme_name": r.programme_name,
            "approved_seats": r.approved_intake_seats,
            "admitted_seats": admitted,
            "supernumerary_quota": r.supernumerary_quota,
            "nri_quota": r.nri_quota,
            "utilization_pct": round((admitted / r.approved_intake_seats * 100), 1) if r.approved_intake_seats else 0
        })

    # 3. Alerts involving this institution's students
    # Find student_refs belonging to this institution
    inst_student_refs = [e.student_ref for e in enrolment_records]
    inst_alerts = db.query(Alert).filter(Alert.student_ref.in_(inst_student_refs)).all() if inst_student_refs else []
    if principal.role == "institution_officer":
        visible_alerts = []
        for alert in inst_alerts:
            if not alert.supporting_record_ids:
                continue
            record_count = db.query(Enrolment.id).filter(
                Enrolment.id.in_(alert.supporting_record_ids),
                Enrolment.institution_id.in_(aliases),
            ).count()
            if record_count == len(set(alert.supporting_record_ids)):
                visible_alerts.append(alert)
        inst_alerts = visible_alerts

    open_alerts_count = sum(1 for a in inst_alerts if a.status != "RESOLVED")

    # 4. Consent coverage
    consented_count = db.query(StudentConsent).filter(
        StudentConsent.student_ref.in_(inst_student_refs),
        StudentConsent.consent_granted == True,
        StudentConsent.status == "ACTIVE"
    ).count() if inst_student_refs else 0

    return {
        "institution_id": institution_id,
        "institution_name": rules[0].institution_name if rules else "Delhi Technological University (Demo)",
        "academic_year": academic_year,
        "total_enrolments": total_enrolments,
        "active_students": active_students,
        "completed_students": completed_students,
        "withdrawn_students": withdrawn_students,
        "total_sanctioned_intake": total_sanctioned,
        "total_new_admitted": total_new_admitted,
        "overall_capacity_utilization": round((total_new_admitted / total_sanctioned * 100), 1) if total_sanctioned else 0,
        "open_integrity_signals": open_alerts_count,
        "consent_coverage_count": consented_count,
        "programmes": intake_status,
        "recent_alerts": [
            {
                "id": a.id,
                "student_ref": a.student_ref,
                "apaar_id": a.apaar_id if principal.role in {"administrator", "prototype_admin"} else mask_identifier(a.apaar_id),
                "title": a.title,
                "severity": a.severity,
                "status": a.status,
                "reviewer_decision": a.reviewer_decision
            }
            for a in inst_alerts[:5]
        ]
    }
