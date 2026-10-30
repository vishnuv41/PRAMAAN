from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
import json
from app.database import Base


class StudentTransfer(Base):
    __tablename__ = "student_transfers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transfer_id = Column(String(64), unique=True, nullable=False, index=True)
    student_ref = Column(String(64), nullable=False, index=True)
    apaar_id = Column(String(32), nullable=False, index=True)
    student_name = Column(String(128), nullable=False)
    source_institution_id = Column(String(64), nullable=False, index=True)
    source_institution_name = Column(String(128), nullable=False)
    source_state = Column(String(64), nullable=False)
    destination_institution_id = Column(String(64), nullable=False, index=True)
    destination_institution_name = Column(String(128), nullable=False)
    destination_state = Column(String(64), nullable=False)
    programme_id = Column(String(64), nullable=False)
    programme_name = Column(String(128), nullable=False)
    academic_year = Column(String(16), nullable=False, default="2025-2026")
    status = Column(String(32), nullable=False, default="TRANSFER_REQUESTED", index=True)
    stage = Column(Integer, nullable=False, default=1)
    reason = Column(String(255), nullable=True)
    initiated_by = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)
    admitted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    timeline_json = Column(Text, nullable=True)

    def get_timeline(self):
        try:
            return json.loads(self.timeline_json or "[]")
        except Exception:
            return []

    def set_timeline(self, events):
        self.timeline_json = json.dumps(events)
