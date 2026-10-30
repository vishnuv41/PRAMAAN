import sqlite3, json, os

db_path = os.path.join(os.path.dirname(__file__), "pramaan_india_demo.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
t2_timeline = [
    {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-20T09:30:00", "actor": "registrar-dtu", "comment": "Interstate credit transfer request initiated."},
    {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-20T10:00:00", "actor": "registrar-dtu", "comment": "Pending NOC clearance."}
]
cursor.execute("UPDATE student_transfers SET stage = 2, status = 'SOURCE_REVIEW', released_at = NULL, timeline_json = ? WHERE transfer_id = 'TRF-2026-002'", (json.dumps(t2_timeline),))
cursor.execute("UPDATE enrolments SET enrolment_status = 'Active', enrolment_end = NULL WHERE student_ref = 'STU-DEMO-006' AND institution_id = 'INST-DELHI-DTU'")
conn.commit()
print("Reset TRF-2026-002 to stage 2")
conn.close()
