import sys
import os
import csv
import uuid

sys.path.insert(0, os.path.abspath(r"anayava\backend"))

from app.database import SessionLocal
from app.models.student import Student
from app.models.enrolment import Enrolment
from app.models.import_job import ImportJob
from app.services.csv_import_service import StudentCsvImportService

db = SessionLocal()
csv_path = r"c:\Users\VISHNU\OneDrive\Desktop\PRAMAAN DEMO DATA.csv"

with open(csv_path, "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    records = list(reader)

print(f"Read {len(records)} records from CSV.")

job = ImportJob(
    id=str(uuid.uuid4()),
    institution_id="INST-CHENNAI-SJC",
    submitted_by="st_joseph_demo",
    original_filename="PRAMAAN DEMO DATA.csv",
    status="PROCESSING",
    validation_summary={},
)
db.add(job)
db.commit()

service = StudentCsvImportService(db)
result = service.process(job, records)

print("Import Job Result:")
print("Status:", job.status)
print("Total rows:", result["total_rows"])
print("Accepted count:", result["accepted_count"])
print("Rejected count:", result["rejected_count"])
print("Review count:", result["review_count"])

# Verify counts in database
sjc_students = db.query(Student).filter(Student.primary_institution_id == "INST-CHENNAI-SJC").count()
sjc_enrolments = db.query(Enrolment).filter(Enrolment.institution_id == "INST-CHENNAI-SJC").count()

print(f"Total SJC Students in DB: {sjc_students}")
print(f"Total SJC Enrolments in DB: {sjc_enrolments}")

db.close()
