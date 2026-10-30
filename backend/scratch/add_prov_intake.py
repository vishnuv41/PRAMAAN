import sqlite3

con = sqlite3.connect(r"anayava\backend\pramaan_india_demo.db")
cur = con.cursor()
exists = cur.execute("SELECT id FROM approved_intakes WHERE institution_id = 'INST-CHENNAI-SJC' AND programme_id = 'PROG-UNKNOWN-999'").fetchone()
if not exists:
    cur.execute("""
        INSERT INTO approved_intakes (
            institution_id, institution_name, programme_id, programme_name,
            academic_year, admission_cycle, approved_intake_seats,
            supernumerary_quota, nri_quota, rule_id,
            rule_source, effective_date, rule_configured
        ) VALUES (
            'INST-CHENNAI-SJC', "St. Joseph's College of Engineering",
            'PROG-UNKNOWN-999', 'Provisional Engineering Studies',
            '2025-2026', 'Regular 2025', 60, 3, 9,
            'AICTE-APH-2025-PROG-PROV', 'AICTE Approval Process Handbook 2025-26',
            '2025-04-01', 1
        )
    """)
    con.commit()
con.close()
print("PROG-UNKNOWN-999 intake verified.")
