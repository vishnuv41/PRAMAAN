import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'pramaan_india_demo.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT student_ref, full_name, primary_institution_id FROM students WHERE student_ref IN ('STU-DEMO-004', 'STU-DEMO-006')")
for r in cursor.fetchall():
    print(r)
cursor.execute("SELECT student_ref, institution_id, enrolment_status, programme_name FROM enrolments WHERE student_ref IN ('STU-DEMO-004', 'STU-DEMO-006')")
for r in cursor.fetchall():
    print(r)
