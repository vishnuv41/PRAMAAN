import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'pramaan_india_demo.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT DISTINCT institution_id, institution_name FROM enrolments")
for row in cursor.fetchall():
    print(row)
