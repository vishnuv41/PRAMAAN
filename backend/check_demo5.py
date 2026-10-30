import sqlite3

conn = sqlite3.connect('c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/pramaan_india_demo.db')
c = conn.cursor()
for ref in ['STU-DEMO-001', 'STU-DEMO-002', 'STU-DEMO-003', 'STU-DEMO-004', 'STU-DEMO-005']:
    rows = c.execute(f"SELECT id, student_ref, institution_id, enrolment_start, enrolment_end, enrolment_status FROM enrolments WHERE student_ref='{ref}'").fetchall()
    print(ref, rows)
