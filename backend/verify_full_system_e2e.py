import os
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime

BASE = "http://127.0.0.1:8000/api/v1"

def api_call(path, method="GET", data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(res_body)
        except Exception:
            parsed = res_body
        return e.code, parsed

results = []

def record_test(name, status, details):
    results.append({"test": name, "status": "PASS" if status else "FAIL", "details": details})
    print(f"[{'PASS' if status else 'FAIL'}] {name}: {details}")

print("==================================================")
print("PRAMAAN SENTINEL END-TO-END VERIFICATION TEST SUITE")
print("==================================================")

# 1. Safety Checks: apaar_sentinel.db untouched
backend_dir = os.path.dirname(os.path.abspath(__file__))
prot_db = os.path.join(backend_dir, "apaar_sentinel.db")
demo_db = os.path.join(backend_dir, "pramaan_india_demo.db")

prot_size = os.path.getsize(prot_db)
record_test("Safety Check - Protected Database Untouched", prot_size == 319488, f"apaar_sentinel.db size = {prot_size} bytes (baseline 319488)")

# 2. Safety Check - No Caste or Religion data in schema or records
conn = sqlite3.connect(demo_db)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(students)")
student_cols = [c[1].lower() for c in cursor.fetchall()]
has_forbidden = any("caste" in c or "religion" in c for c in student_cols)
record_test("Safety Check - Zero Caste/Religion Schema", not has_forbidden, f"Columns: {student_cols}")

# 3. Student Portal Authentication
status, res = api_call("/auth/login", method="POST", data={
    "token": "student-token-2026",
    "requested_role": "student"
})
record_test("Student Portal - Authenticate Aarav Sharma", status == 200 and res.get("role") == "student", f"Subject: {res.get('subject')}, Student Ref: {res.get('student_ref')}")
student_token = res.get("access_token")

# 4. Student Self-Service Profile & Privacy Isolation
status, me = api_call("/students/me", token=student_token)
record_test("Student Portal - Retrieve Self Profile (/students/me)", status == 200 and me["student"]["student_ref"] == "STU-DEMO-001", f"Name: {me['student']['full_name']}, Masked APAAR: {me['student']['apaar_id']}")

# 5. Student Security Isolation Check (Attempt to read STU-DEMO-002)
status, forbidden = api_call("/students/STU-DEMO-002", token=student_token)
record_test("Security Isolation - Student Blocked From Other Student Records", status == 403, f"Status code: {status} Forbidden")

# 6. Student Consent Directives (DPDP Act)
status, consent_data = api_call("/consent/student/STU-DEMO-001", token=student_token)
consents = consent_data.get("consents", [])
record_test("Student Portal - DPDP Consent Ledger Inspection", status == 200 and len(consents) > 0, f"Found {len(consents)} consent directive(s)")

# 7. Student Consent Toggle Real-Time Persistence
if consents:
    cid = consents[0]["id"]
    curr_grant = consents[0]["consent_granted"]
    status, toggle_res = api_call(f"/consent/{cid}/toggle", method="PATCH", data={"consent_granted": not curr_grant}, token=student_token)
    record_test("Student Portal - Interactive DPDP Consent Toggle", status == 200 and toggle_res.get("success") == True, f"Consent ID {cid} new status: {toggle_res.get('status')}")
    # Toggle back to original
    api_call(f"/consent/{cid}/toggle", method="PATCH", data={"consent_granted": curr_grant}, token=student_token)

# 8. Student Transfer Ledger Scoping
status, student_transfers = api_call("/transfers", token=student_token)
all_own = all(t["student_ref"] == "STU-DEMO-001" for t in student_transfers.get("items", []))
record_test("Student Portal - Transfers Scoped Strictly to Authenticated Student", status == 200 and all_own, f"{student_transfers.get('total')} transfer(s) returned")

# 9. College Portal Authentication (DTU Registrar)
status, res = api_call("/auth/login", method="POST", data={
    "token": "dtu-registrar-token-2026",
    "requested_role": "institution_officer"
})
record_test("College Portal - Authenticate DTU Registrar", status == 200 and res.get("institution_id") == "INST-DELHI-DTU", f"Subject: {res.get('subject')}, Institution: {res.get('institution_id')}")
dtu_token = res.get("access_token")

# 10. Role Mismatch Prevention (Cross-role impersonation forbidden)
status, mismatch = api_call("/auth/login", method="POST", data={
    "token": "student-token-2026",
    "requested_role": "institution_officer"
})
record_test("Security - Cross-Role Impersonation Prevented", status == 403, f"Status code: {status} Role mismatch rejected")

# 11. College Transfers Scoping
status, dtu_transfers = api_call("/transfers", token=dtu_token)
dtu_scoped = all(t["source_institution_id"] == "INST-DELHI-DTU" or t["destination_institution_id"] == "INST-DELHI-DTU" for t in dtu_transfers.get("items", []))
record_test("College Portal - Transfers Scoped to DTU Campus", status == 200 and dtu_scoped, f"{dtu_transfers.get('total')} transfer(s) for DTU")

# 12. Transfer Lifecycle - Release Action by Source Registrar
# Reset TRF-2026-002 to stage 2 first to ensure clean execution
cursor.execute("UPDATE student_transfers SET stage = 2, status = 'SOURCE_REVIEW' WHERE transfer_id = 'TRF-2026-002'")
cursor.execute("UPDATE enrolments SET enrolment_status = 'Active', enrolment_end = NULL WHERE student_ref = 'STU-DEMO-006' AND institution_id = 'INST-DELHI-DTU'")
conn.commit()

status, rel_res = api_call("/transfers/TRF-2026-002/release", method="POST", data={"comment": "Official NOC Issued"}, token=dtu_token)
cursor.execute("SELECT enrolment_status FROM enrolments WHERE student_ref = 'STU-DEMO-006' AND institution_id = 'INST-DELHI-DTU'")
enrol_status = cursor.fetchone()[0]
record_test("College Portal - Release Student & Update Source Enrolment to Withdrawn", status == 200 and enrol_status == "Withdrawn", f"Transfer Stage: {rel_res.get('stage')} ({rel_res.get('status')}), DB Status: {enrol_status}")

# 13. Transfer Lifecycle - Admit Action by Destination Registrar
cursor.execute("UPDATE student_transfers SET stage = 4, status = 'DESTINATION_REVIEW', admitted_at = NULL, completed_at = NULL WHERE transfer_id = 'TRF-2026-003'")
conn.commit()

status, adm_res = api_call("/transfers/TRF-2026-003/admit", method="POST", data={"comment": "Admitted to DTU Computer Science"}, token=dtu_token)
cursor.execute("SELECT enrolment_status FROM enrolments WHERE student_ref = 'STU-DEMO-003' AND institution_id = 'INST-DELHI-DTU'")
enrol_row = cursor.fetchone()
adm_enrol_status = enrol_row[0] if enrol_row else None
record_test("College Portal - Admit Student & Activate Destination Enrolment", status == 200 and adm_enrol_status == "Active", f"Transfer Stage: {adm_res.get('stage')} ({adm_res.get('status')}), Destination Enrolment: {adm_enrol_status}")

# 14. State Directorate Portal Scoping
status, res = api_call("/auth/login", method="POST", data={
    "token": "state-delhi-token-2026",
    "requested_role": "state_officer"
})
state_token = res.get("access_token")
status, state_transfers = api_call("/transfers", token=state_token)
state_scoped = all("Delhi" in {t["source_state"], t["destination_state"]} for t in state_transfers.get("items", []))
record_test("State Directorate Portal - Authenticate & Scope to Delhi State", status == 200 and state_scoped, f"State transfers: {state_transfers.get('total')}")

# 15. AICTE National Portal Oversight
status, res = api_call("/auth/login", method="POST", data={
    "token": "admin-token-2026",
    "requested_role": "administrator"
})
admin_token = res.get("access_token")
status, nat_transfers = api_call("/transfers", token=admin_token)
record_test("AICTE National Portal - Full Oversight Across Nationwide Registry", status == 200 and nat_transfers.get("total") >= 3, f"Total National Transfers: {nat_transfers.get('total')}")

conn.close()

passed = sum(1 for r in results if r["status"] == "PASS")
total = len(results)
print("\n==================================================")
print(f"VERIFICATION RESULTS: {passed} / {total} PASSED ({passed*100//total}%)")
print("==================================================")
