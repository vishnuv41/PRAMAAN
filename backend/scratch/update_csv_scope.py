import os

path = os.path.join(r"anayava\backend\app\services\csv_import_service.py")
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            remediations = []
            if not str(row.get("student_ref", "")).strip() and str(row.get("apaar_id", "")).strip():
                row["student_ref"] = "PRM-DEMO-" + str(row["apaar_id"]).strip()[-4:]
                remediations.append("Derived student_ref from APAAR ID")
            if not str(row.get("apaar_id", "")).strip() and str(row.get("student_ref", "")).strip():
                digits = str(row["student_ref"]).strip().split("-")[-1]
                row["apaar_id"] = "10000000" + digits.zfill(4)
                remediations.append("Derived APAAR ID from student reference")
            if str(row.get("enrolment_start", "")).strip() == "31/31/2025":
                row["enrolment_start"] = "2025-08-01"
                remediations.append("Remediated invalid enrolment start date to 2025-08-01")
            if not str(row.get("admission_cycle", "")).strip():
                row["admission_cycle"] = "2025"
                remediations.append("Set default admission cycle to 2025")
            if str(row.get("enrolment_status", "")).strip().upper() == "UNKNOWN_STATUS":
                row["enrolment_status"] = "Active"
                remediations.append("Normalized status to Active")"""

replacement = """            remediations = []
            is_demo_sjc = str(row.get("institution_id", "")).strip() in {"INST-DEMO-01", "INST-CHENNAI-SJC"}
            if is_demo_sjc:
                if not str(row.get("student_ref", "")).strip() and str(row.get("apaar_id", "")).strip():
                    row["student_ref"] = "PRM-DEMO-" + str(row["apaar_id"]).strip()[-4:]
                    remediations.append("Derived student_ref from APAAR ID")
                if not str(row.get("apaar_id", "")).strip() and str(row.get("student_ref", "")).strip():
                    digits = str(row["student_ref"]).strip().split("-")[-1]
                    row["apaar_id"] = "10000000" + digits.zfill(4)
                    remediations.append("Derived APAAR ID from student reference")
                if str(row.get("enrolment_start", "")).strip() == "31/31/2025":
                    row["enrolment_start"] = "2025-08-01"
                    remediations.append("Remediated invalid enrolment start date to 2025-08-01")
                if not str(row.get("admission_cycle", "")).strip():
                    row["admission_cycle"] = "2025"
                    remediations.append("Set default admission cycle to 2025")
                if str(row.get("enrolment_status", "")).strip().upper() == "UNKNOWN_STATUS":
                    row["enrolment_status"] = "Active"
                    remediations.append("Normalized status to Active")"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
