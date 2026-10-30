import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'pramaan_india_demo.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- CERTIFICATES ---")
cursor.execute("SELECT * FROM certificates WHERE student_ref = 'STU-DEMO-001'")
print(cursor.fetchall())

print("--- CONSENTS ---")
cursor.execute("SELECT * FROM student_consents WHERE student_ref = 'STU-DEMO-001'")
print(cursor.fetchall())

print("--- ALERTS ---")
cursor.execute("SELECT alert_id, alert_type, severity, status FROM alerts WHERE student_ref = 'STU-DEMO-001'")
print(cursor.fetchall())
