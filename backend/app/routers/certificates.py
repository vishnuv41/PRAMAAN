from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.database import get_db
from app.models.certificate import Certificate
from app.services.certificate_service import CertificateService
from app.services.audit_service import AuditService
from app.security import Principal, get_current_principal, enforce_institution_scope, mask_identifier

router = APIRouter(prefix="/certificates", tags=["Certificate Verification"])

@router.get("")
def list_certificates(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    query = db.query(Certificate)
    if principal.role == "institution_officer":
        query = query.filter(Certificate.institution_id == principal.institution_id)
    certs = query.all()
    return {
        "items": [
            {
                "certificate_id": c.certificate_id,
                "student_ref": c.student_ref,
                "apaar_id": c.apaar_id if principal.role in {"administrator", "prototype_admin"} else mask_identifier(c.apaar_id),
                "student_name": c.student_name,
                "institution_name": c.institution_name,
                "programme_name": c.programme_name,
                "issue_date": c.issue_date,
                "status": c.status,
                "signature_algorithm": c.signature_algorithm
            }
            for c in certs
        ]
    }

@router.get("/{certificate_id}")
def get_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    if principal.role == "institution_officer" and cert.institution_id != principal.institution_id:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    payload = dict(cert.payload_json)
    signature_hex = cert.signature_hex
    apaar_id = cert.apaar_id
    if principal.role not in {"administrator", "prototype_admin"}:
        apaar_id = mask_identifier(apaar_id)
        if "apaar_id" in payload:
            payload["apaar_id"] = mask_identifier(str(payload["apaar_id"]))
        signature_hex = None

    return {
        "certificate_id": cert.certificate_id,
        "student_ref": cert.student_ref,
        "apaar_id": apaar_id,
        "student_name": cert.student_name,
        "institution_id": cert.institution_id,
        "institution_name": cert.institution_name,
        "programme_id": cert.programme_id,
        "programme_name": cert.programme_name,
        "completion_date": cert.completion_date,
        "issue_date": cert.issue_date,
        "status": cert.status,
        "revocation_reason": cert.revocation_reason,
        "signature_algorithm": cert.signature_algorithm,
        "signature_hex": signature_hex,
        "public_key_id": cert.public_key_id,
        "payload": payload,
        "watermark": "DEMO — NOT AN OFFICIAL CERTIFICATE"
    }

@router.get("/{certificate_id}/verify")
def verify_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    certificate = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
    if certificate and principal.role == "institution_officer" and certificate.institution_id != principal.institution_id:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    result = CertificateService.verify_certificate(db, certificate_id)
    AuditService.log_event(
        db=db,
        entity_type="CERTIFICATE",
        entity_id=certificate_id,
        action="VERIFICATION_CHECK",
        performed_by="Public Verification Portal (Demo)",
        details={"status": result.get("verification_status"), "is_authentic": result.get("is_authentic")}
    )
    if principal.role not in {"administrator", "prototype_admin"}:
        result["apaar_id"] = mask_identifier(result.get("apaar_id"))
        result["signature_hex"] = None
    return result

@router.post("/{certificate_id}/simulate-tamper")
def simulate_tampered_verification(
    certificate_id: str,
    tampered_field: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Demonstrates tamper rejection by altering payload attributes (e.g. changing student name or completion date).
    """
    cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    # Create modified clone of payload
    tampered_payload = dict(cert.payload_json)
    tampered_payload.update(tampered_field)

    result = CertificateService.verify_certificate(db, certificate_id, tampered_payload=tampered_payload)
    return {
        "original_payload": cert.payload_json,
        "tampered_payload": tampered_payload,
        "verification_result": result
    }
