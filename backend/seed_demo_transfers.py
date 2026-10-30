import os
import json
import sqlite3
from datetime import datetime

db_path = os.path.join(os.path.dirname(__file__), "pramaan_india_demo.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ensure table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS student_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id VARCHAR(64) UNIQUE NOT NULL,
    student_ref VARCHAR(64) NOT NULL,
    apaar_id VARCHAR(32) NOT NULL,
    student_name VARCHAR(128) NOT NULL,
    source_institution_id VARCHAR(64) NOT NULL,
    source_institution_name VARCHAR(128) NOT NULL,
    source_state VARCHAR(64) NOT NULL,
    destination_institution_id VARCHAR(64) NOT NULL,
    destination_institution_name VARCHAR(128) NOT NULL,
    destination_state VARCHAR(64) NOT NULL,
    programme_id VARCHAR(64) NOT NULL,
    programme_name VARCHAR(128) NOT NULL,
    academic_year VARCHAR(16) NOT NULL DEFAULT '2025-2026',
    status VARCHAR(32) NOT NULL DEFAULT 'TRANSFER_REQUESTED',
    stage INTEGER NOT NULL DEFAULT 1,
    reason VARCHAR(255),
    initiated_by VARCHAR(64) NOT NULL,
    created_at DATETIME,
    released_at DATETIME,
    admitted_at DATETIME,
    completed_at DATETIME,
    timeline_json TEXT
);
""")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_transfer_id ON student_transfers (transfer_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_student_ref ON student_transfers (student_ref);")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_apaar_id ON student_transfers (apaar_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_source_institution_id ON student_transfers (source_institution_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_destination_institution_id ON student_transfers (destination_institution_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_transfers_status ON student_transfers (status);")

# Check if records already exist
cursor.execute("SELECT count(*) FROM student_transfers")
count = cursor.fetchone()[0]

if count == 0:
    print("Seeding initial transfers into pramaan_india_demo.db...")

    # 1. Aarav Sharma (Completed transfer from DTU to NSUT)
    t1_timeline = [
        {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-06-01T10:00:00", "actor": "registrar-dtu", "comment": "Transfer requested to Netaji Subhas University of Technology due to family relocation."},
        {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-06-02T11:30:00", "actor": "registrar-dtu", "comment": "Academic transcripts and dues clearance verified."},
        {"stage": 3, "status": "SOURCE_RELEASED", "timestamp": "2026-06-05T14:15:00", "actor": "registrar-dtu", "comment": "No-Objection Certificate issued. Student released from Delhi Technological University."},
        {"stage": 4, "status": "DESTINATION_REVIEW", "timestamp": "2026-06-06T09:00:00", "actor": "SYSTEM", "comment": "Dossier received by Netaji Subhas University of Technology."},
        {"stage": 5, "status": "DESTINATION_ADMITTED", "timestamp": "2026-06-10T16:20:00", "actor": "registrar-nsut", "comment": "Admission fee accepted. Student enrolled in B.Tech CSE Semester 3."},
        {"stage": 6, "status": "COMPLETED", "timestamp": "2026-06-10T16:25:00", "actor": "SYSTEM", "comment": "Transfer lifecycle completed and verified in AICTE National Registry."}
    ]
    cursor.execute("""
    INSERT INTO student_transfers (
        transfer_id, student_ref, apaar_id, student_name,
        source_institution_id, source_institution_name, source_state,
        destination_institution_id, destination_institution_name, destination_state,
        programme_id, programme_name, academic_year,
        status, stage, reason, initiated_by,
        created_at, released_at, admitted_at, completed_at, timeline_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "TRF-2025-001", "STU-DEMO-001", "9876-5432-1001", "Aarav Sharma",
        "INST-DELHI-DTU", "Delhi Technological University (Demo)", "Delhi",
        "INST-DELHI-NSUT", "Netaji Subhas University of Technology (Demo)", "Delhi",
        "BTECH-CSE", "B.Tech Computer Science & Engineering", "2025-2026",
        "COMPLETED", 6, "Family relocation within National Capital Territory", "registrar-dtu",
        "2026-06-01 10:00:00", "2026-06-05 14:15:00", "2026-06-10 16:20:00", "2026-06-10 16:25:00",
        json.dumps(t1_timeline)
    ))

    # 2. Vikramaditya Rao (Source Review / Release pending by DTU Registrar)
    t2_timeline = [
        {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-20T09:30:00", "actor": "registrar-dtu", "comment": "Interstate credit transfer request initiated for specialized robotics specialization at COEP Pune."},
        {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-20T10:00:00", "actor": "registrar-dtu", "comment": "Pending final clearance from Head of Department, Computer Science."}
    ]
    cursor.execute("""
    INSERT INTO student_transfers (
        transfer_id, student_ref, apaar_id, student_name,
        source_institution_id, source_institution_name, source_state,
        destination_institution_id, destination_institution_name, destination_state,
        programme_id, programme_name, academic_year,
        status, stage, reason, initiated_by,
        created_at, released_at, admitted_at, completed_at, timeline_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "TRF-2026-002", "STU-DEMO-006", "9876-5432-1006", "Vikramaditya Rao",
        "INST-DELHI-DTU", "Delhi Technological University (Demo)", "Delhi",
        "INST-PUNE-COEP", "COEP Technological University (Demo)", "Maharashtra",
        "BTECH-CSE", "B.Tech Computer Science & Engineering", "2025-2026",
        "SOURCE_REVIEW", 2, "Interstate technical transfer for Advanced Robotics & AI track", "registrar-dtu",
        "2026-10-20 09:30:00", None, None, None,
        json.dumps(t2_timeline)
    ))

    # 3. Rohan Verma (Released by COEP Pune, Admission Pending by DTU Registrar)
    t3_timeline = [
        {"stage": 1, "status": "TRANSFER_REQUESTED", "timestamp": "2026-10-15T11:00:00", "actor": "registrar-coep", "comment": "Interstate transfer request from COEP Pune to DTU Delhi."},
        {"stage": 2, "status": "SOURCE_REVIEW", "timestamp": "2026-10-16T14:00:00", "actor": "registrar-coep", "comment": "Transcript verification and character certificate verified."},
        {"stage": 3, "status": "SOURCE_RELEASED", "timestamp": "2026-10-18T16:00:00", "actor": "registrar-coep", "comment": "Official NOC issued. Student released from COEP Pune."},
        {"stage": 4, "status": "DESTINATION_REVIEW", "timestamp": "2026-10-19T09:30:00", "actor": "SYSTEM", "comment": "Dossier routed to Delhi Technological University for admission confirmation."}
    ]
    cursor.execute("""
    INSERT INTO student_transfers (
        transfer_id, student_ref, apaar_id, student_name,
        source_institution_id, source_institution_name, source_state,
        destination_institution_id, destination_institution_name, destination_state,
        programme_id, programme_name, academic_year,
        status, stage, reason, initiated_by,
        created_at, released_at, admitted_at, completed_at, timeline_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "TRF-2026-003", "STU-DEMO-003", "9876-5432-1003", "Rohan Verma",
        "INST-PUNE-COEP", "COEP Technological University (Demo)", "Maharashtra",
        "INST-DELHI-DTU", "Delhi Technological University (Demo)", "Delhi",
        "BTECH-CSE", "B.Tech Computer Science & Engineering", "2025-2026",
        "DESTINATION_REVIEW", 4, "Interstate institutional transfer to Delhi NCT", "registrar-coep",
        "2026-10-15 11:00:00", "2026-10-18 16:00:00", None, None,
        json.dumps(t3_timeline)
    ))

    conn.commit()
    print("Successfully seeded 3 demo transfers.")
else:
    print(f"student_transfers table already has {count} records.")

conn.close()
