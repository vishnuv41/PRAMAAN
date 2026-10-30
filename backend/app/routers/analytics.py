from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.models.enrolment import Enrolment
from app.services.anomaly_service import HistoricalAnomalyService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/analytics", tags=["Historical Analytics & Anomaly Detection"])

@router.get("/enrolment-trends")
def get_enrolment_trends(db: Session = Depends(get_db)):
    trends = db.query(
        Enrolment.academic_year,
        func.count(Enrolment.id).label("total"),
        func.sum(case((Enrolment.enrolment_status == "Active", 1), else_=0)).label("active"),
        func.sum(case((Enrolment.enrolment_status == "Completed", 1), else_=0)).label("completed"),
        func.sum(case((Enrolment.enrolment_status == "Withdrawn", 1), else_=0)).label("withdrawn")
    ).group_by(Enrolment.academic_year).order_by(Enrolment.academic_year.asc()).all()

    return {
        "trends": [
            {
                "academic_year": r[0],
                "total": r[1],
                "active": r[2] or 0,
                "completed": r[3] or 0,
                "withdrawn": r[4] or 0
            }
            for r in trends
        ]
    }

@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    svc = HistoricalAnomalyService(db)
    anomalies = svc.get_all_anomalies()
    return {"total_anomalies": len(anomalies), "items": anomalies}

@router.patch("/anomalies/{anomaly_id}/dismiss")
def dismiss_anomaly(
    anomaly_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    svc = HistoricalAnomalyService(db)
    reason = payload.get("reason", "Legitimate planned expansion documented by institution.")
    dismissed_by = payload.get("dismissed_by", "Demo Officer (AICTE-RO-102)")
    try:
        res = svc.dismiss_anomaly(anomaly_id, reason, dismissed_by)
        AuditService.log_event(
            db=db,
            entity_type="ANOMALY",
            entity_id=str(anomaly_id),
            action="DISMISS_ANOMALY",
            performed_by=dismissed_by,
            details={"reason": reason}
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/historical/{institution_id}/{programme_id}")
def get_historical_trends_for_programme(
    institution_id: str,
    programme_id: str,
    db: Session = Depends(get_db)
):
    svc = HistoricalAnomalyService(db)
    return svc.get_historical_trends(institution_id, programme_id)

@router.get("/benchmark-evaluation")
def get_benchmark_evaluation(db: Session = Depends(get_db)):
    svc = HistoricalAnomalyService(db)
    return svc.compute_synthetic_benchmark_metrics()
