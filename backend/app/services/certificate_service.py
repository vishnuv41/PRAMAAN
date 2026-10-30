import hmac
import hashlib
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.certificate import Certificate
from app.config import settings

class CertificateService:
    """
    Cryptographic certificate issuance and verification prototype.
    Uses HMAC-SHA256 test-signing to demonstrate mathematical payload integrity,
    tamper rejection, and status revocation.
    Explicitly caveats that signature verification proves integrity relative to the test key,
    not official government authority.
    """

    SECRET_KEY = settings.SECRET_KEY.encode("utf-8")

    @classmethod
    def compute_signature(cls, payload: Dict[str, Any]) -> str:
        # Canonical JSON string representation for stable cryptographic hashing
        canonical_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        signature = hmac.new(cls.SECRET_KEY, canonical_str.encode("utf-8"), hashlib.sha256).hexdigest()
        return signature

    @classmethod
    def verify_certificate(
        cls,
        db: Session,
        certificate_id: str,
        tampered_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
        if not cert:
            return {
                "certificate_id": certificate_id,
                "verification_status": "NOT_FOUND",
                "is_authentic": False,
                "message": "Certificate record not found in institutional sentinel ledger."
            }

        # Use passed payload if simulating tampering, otherwise stored payload
        payload_to_verify = tampered_payload if tampered_payload is not None else cert.payload_json
        expected_sig = cls.compute_signature(payload_to_verify)

        # Constant-time comparison to prevent timing attacks
        signature_matches = hmac.compare_digest(cert.signature_hex, expected_sig)

        if not signature_matches:
            return {
                "certificate_id": cert.certificate_id,
                "student_ref": cert.student_ref,
                "apaar_id": cert.apaar_id,
                "student_name": cert.student_name,
                "institution_name": cert.institution_name,
                "programme_name": cert.programme_name,
                "verification_status": "TAMPER_DETECTED",
                "is_authentic": False,
                "signature_valid": False,
                "status": cert.status,
                "message": "CRYPTOGRAPHIC SIGNATURE MISMATCH: Payload has been modified or corrupted post-issuance.",
                "disclaimer": "DEMO PROTOTYPE ONLY — Proves payload integrity against Sentinel test root key; does not connect to DigiLocker."
            }

        if cert.status == "REVOKED":
            return {
                "certificate_id": cert.certificate_id,
                "student_ref": cert.student_ref,
                "apaar_id": cert.apaar_id,
                "student_name": cert.student_name,
                "institution_name": cert.institution_name,
                "programme_name": cert.programme_name,
                "verification_status": "REVOKED",
                "is_authentic": False,
                "signature_valid": True,
                "status": "REVOKED",
                "revocation_reason": cert.revocation_reason or "Institutional administrative revocation",
                "message": f"CERTIFICATE REVOKED: Record signature is mathematically valid, but status is revoked ({cert.revocation_reason}).",
                "disclaimer": "DEMO PROTOTYPE ONLY — Issuer revoked this credential."
            }

        return {
            "certificate_id": cert.certificate_id,
            "student_ref": cert.student_ref,
            "apaar_id": cert.apaar_id,
            "student_name": cert.student_name,
            "institution_id": cert.institution_id,
            "institution_name": cert.institution_name,
            "programme_id": cert.programme_id,
            "programme_name": cert.programme_name,
            "issue_date": cert.issue_date,
            "completion_date": cert.completion_date,
            "verification_status": "VALID",
            "is_authentic": True,
            "signature_valid": True,
            "status": cert.status,
            "algorithm": cert.signature_algorithm,
            "public_key_id": cert.public_key_id,
            "signature_hex": cert.signature_hex,
            "message": "VERIFIED: Cryptographic digital signature is valid and credential record is active.",
            "disclaimer": "DEMO — NOT AN OFFICIAL AICTE OR DIGILOCKER CERTIFICATE. Verification proves key integrity only."
        }
