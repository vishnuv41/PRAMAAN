import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        entity_type: str,
        entity_id: str,
        action: str,
        performed_by: str,
        details: Optional[Dict[str, Any]] = None,
        commit: bool = True
    ) -> Optional[AuditLog]:
        try:
            audit_entry = AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                performed_by=performed_by,
                details=details or {}
            )
            db.add(audit_entry)
            if commit:
                try:
                    db.commit()
                    db.refresh(audit_entry)
                except Exception as db_exc:
                    try:
                        db.rollback()
                    except Exception:
                        pass
                    logger.warning("AuditLog commit skipped: %s", db_exc)
            else:
                db.flush()
            return audit_entry
        except Exception as exc:
            try:
                db.rollback()
            except Exception:
                pass
            logger.warning("AuditLog creation skipped: %s", exc)
            return None
