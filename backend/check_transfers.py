import sqlite3, os

db_path = os.path.join(os.path.dirname(__file__), 'pramaan_india_demo.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='student_transfers'")
print("student_transfers table exists:", cursor.fetchone())
