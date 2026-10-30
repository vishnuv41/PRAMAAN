import os
import sqlite3
import json

db_path = os.path.join(os.path.dirname(__file__), "pramaan_india_demo.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Reset TRF-2026-002 (Vikramaditya Rao) to Stage 2 (SOURCE_REVIEW)
t2_timeline = [
    {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-20T09:30:00", "actor": "registrar-dtu", "comment": "Interstate credit transfer request initiated for advanced robotics at COEP Pune."},
    {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-20T10:00:00", "actor": "registrar-dtu", "comment": "Awaiting final No-Objection clearance from Head of Department, Computer Science."}
]
cursor.execute("UPDATE student_transfers SET stage = 2, status = 'SOURCE_REVIEW', released_at = NULL, admitted_at = NULL, completed_at = NULL, timeline_json = ? WHERE transfer_id = 'TRF-2026-002'", (json.dumps(t2_timeline),))
cursor.execute("UPDATE enrolments SET enrolment_status = 'Active', enrolment_end = NULL WHERE student_ref = 'STU-DEMO-006' AND institution_id = 'INST-DELHI-DTU'")

# 2. Reset TRF-2026-003 (Rohan Verma) to Stage 4 (DESTINATION_REVIEW)
t3_timeline = [
    {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-15T11:00:00", "actor": "registrar-coep", "comment": "Interstate transfer request from COEP Pune to DTU Delhi."},
    {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-16T14:00:00", "actor": "registrar-coep", "comment": "Transcript verification and character certificate verified."},
    {"stage": 3, "status": "SOURCE_RELEASED", "timestamp": "2026-10-18T16:00:00", "actor": "registrar-coep", "comment": "Official NOC issued. Student released from COEP Pune."},
    {"stage": 4, "status": "DESTINATION_REVIEW", "timestamp": "2026-10-19T09:30:00", "actor": "SYSTEM", "comment": "Dossier routed to Delhi Technological University for admission confirmation."}
]
cursor.execute("UPDATE student_transfers SET stage = 4, status = 'DESTINATION_REVIEW', admitted_at = NULL, completed_at = NULL, timeline_json = ? WHERE transfer_id = 'TRF-2026-003'", (json.dumps(t3_timeline),))

conn.commit()
conn.close()
print("Demo database initial transfer states successfully prepared for user interaction.")
