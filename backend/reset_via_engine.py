import os
import json
from app.database import engine
from sqlalchemy import text

t2_timeline = [
    {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-20T09:30:00", "actor": "registrar-dtu", "comment": "Interstate credit transfer request initiated."},
    {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-20T10:00:00", "actor": "registrar-dtu", "comment": "Pending NOC clearance."}
]

with engine.begin() as conn:
    conn.execute(text("UPDATE student_transfers SET stage = 2, status = 'SOURCE_REVIEW', released_at = NULL, timeline_json = :tl WHERE transfer_id = 'TRF-2026-002'"), {"tl": json.dumps(t2_timeline)})
    conn.execute(text("UPDATE enrolments SET enrolment_status = 'Active', enrolment_end = NULL WHERE student_ref = 'STU-DEMO-006' AND institution_id = 'INST-DELHI-DTU'"))

with engine.connect() as conn:
    res = conn.execute(text("SELECT transfer_id, stage, status FROM student_transfers WHERE transfer_id = 'TRF-2026-002'"))
    print("Updated record:", res.fetchone())
