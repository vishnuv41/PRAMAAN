import sys
import requests
import json
import io
import csv

BASE = "http://127.0.0.1:8000/api/v1"

print("==========================================================")
print("  PRAMAAN SENTINEL E2E SMOKE & INTEGRATION VERIFICATION  ")
print("==========================================================")

# ----------------------------------------------------
# 1. VERIFY LOGIN & RBAC FOR ALL 4 AUTHORIZED PORTALS
# ----------------------------------------------------
portals = [
    {
        "name": "AICTE National Portal",
        "username": "admin_demo",
        "password": "Password@2026",
        "role": "administrator",
        "expected_role": "administrator",
        "expected_subject": "admin-national-sentinel",
    },
    {
        "name": "Student Portal",
        "username": "aarav_sharma",
        "password": "Password@2026",
        "role": "student",
        "expected_role": "student",
        "expected_subject": "aarav-sharma",
    },
    {
        "name": "College Portal (St. Joseph's College of Engineering)",
        "username": "st_joseph_demo",
        "password": "Password@2026",
        "role": "institution_officer",
        "expected_role": "institution_officer",
        "expected_inst": "INST-CHENNAI-SJC",
    },
    {
        "name": "State Directorate Portal (Tamil Nadu)",
        "username": "tn_state_officer",
        "password": "Password@2026",
        "role": "state_directorate",
        "expected_role": "state_officer",
        "expected_inst": "STATE-TAMILNADU",
    },
]

tokens = {}

for p in portals:
    res = requests.post(f"{BASE}/auth/login", json={
        "username": p["username"],
        "password": p["password"],
        "requested_role": p["role"]
    })
    assert res.status_code == 200, f"Login failed for {p['name']}: {res.text}"
    data = res.json()
    assert data["role"] == p["expected_role"], f"Role mismatch: {data['role']} vs {p['expected_role']}"
    if "expected_subject" in p:
        assert data["subject"] == p["expected_subject"]
    if "expected_inst" in p:
        assert data["institution_id"] == p["expected_inst"]
    
    tokens[p["role"]] = data["access_token"]
    print(f"  [PASS] {p['name']}: Authenticated with role '{data['role']}', Token: {data['access_token'][:15]}...")

# Cross-role impersonation rejection test (Student cannot request administrator)
res = requests.post(f"{BASE}/auth/login", json={
    "token": "student-token-2026",
    "requested_role": "administrator"
})
assert res.status_code == 403, f"Expected 403 Forbidden for cross-role escalation, got {res.status_code}"
print("  [PASS] Security Check: Cross-role privilege escalation strictly rejected (HTTP 403)")


# ----------------------------------------------------
# 2. VERIFY STUDENT PORTAL DATA INTEGRITY & PRIVACY
# ----------------------------------------------------
print("\n--- Testing Student Portal Data & Endpoints ---")
stu_token = tokens["student"]
headers_stu = {"Authorization": f"Bearer {stu_token}"}

# Student /students/me
res = requests.get(f"{BASE}/students/me", headers=headers_stu)
assert res.status_code == 200
stu_data = res.json()
student = stu_data["student"]
assert student["full_name"] == "Aarav Sharma"
assert student["student_ref"] == "STU-DEMO-001"
print(f"  [PASS] /students/me: Loaded {student['full_name']} ({student['student_ref']}), Enrolments: {len(stu_data['enrolments'])}")

# Student Consents & Toggle
res = requests.get(f"{BASE}/consent/student/{student['student_ref']}", headers=headers_stu)
assert res.status_code == 200
consents = res.json()["consents"]
assert len(consents) > 0
cid = consents[0]["id"]
curr_val = consents[0]["consent_granted"]
toggle_res = requests.patch(f"{BASE}/consent/{cid}/toggle", headers=headers_stu, json={"consent_granted": not curr_val})
assert toggle_res.status_code == 200
assert toggle_res.json()["consent_granted"] == (not curr_val)
# Toggle back to original state
requests.patch(f"{BASE}/consent/{cid}/toggle", headers=headers_stu, json={"consent_granted": curr_val})
print(f"  [PASS] /consent toggle: Successfully toggled and restored consent ID {cid}")

# Student Transfers
res = requests.get(f"{BASE}/transfers", headers=headers_stu)
assert res.status_code == 200
print(f"  [PASS] /transfers (Student scope): Returned {res.json()['total']} transfers")


# ----------------------------------------------------
# 3. VERIFY COLLEGE PORTAL (ST. JOSEPH'S COLLEGE)
# ----------------------------------------------------
print("\n--- Testing College Portal (St. Joseph's College of Engineering) ---")
col_token = tokens["institution_officer"]
headers_col = {"Authorization": f"Bearer {col_token}"}

# College Dashboard Summary
res = requests.get(f"{BASE}/institution/dashboard-summary?institution_id=INST-CHENNAI-SJC", headers=headers_col)
assert res.status_code == 200
col_data = res.json()
assert col_data["institution_id"] == "INST-CHENNAI-SJC"
assert "St. Joseph" in col_data["institution_name"]
print(f"  [PASS] /institution/dashboard-summary: Bound to {col_data['institution_name']} ({col_data['institution_id']})")
print(f"         Total Enrolments: {col_data['total_enrolments']}, Sanctioned Intake: {col_data['total_sanctioned_intake']}")

# College Student Directory
res = requests.get(f"{BASE}/students?institution_id=INST-CHENNAI-SJC", headers=headers_col)
assert res.status_code == 200
col_students = res.json()["items"]
assert len(col_students) >= 5
print(f"  [PASS] /students (College scope): Returned {len(col_students)} enrolled students at St. Joseph's")

# College Transfers Review
res = requests.get(f"{BASE}/transfers", headers=headers_col)
assert res.status_code == 200
col_transfers = res.json()["items"]
assert len(col_transfers) >= 1
print(f"  [PASS] /transfers (College scope): Returned {len(col_transfers)} transfers involving St. Joseph's")


# ----------------------------------------------------
# 4. VERIFY STATE DIRECTORATE PORTAL (TAMIL NADU)
# ----------------------------------------------------
print("\n--- Testing State Directorate Portal (Tamil Nadu Scope) ---")
state_token = tokens["state_directorate"]
headers_state = {"Authorization": f"Bearer {state_token}"}

# State Transfers Scoping
res = requests.get(f"{BASE}/transfers", headers=headers_state)
assert res.status_code == 200
print(f"  [PASS] /transfers (State scope): Returned {res.json()['total']} transfers under Tamil Nadu purview")

# Intake Compliance for State
res = requests.get(f"{BASE}/intake-compliance", headers=headers_state)
assert res.status_code == 200
intake_reports = res.json()["reports"]
tn_reports = [r for r in intake_reports if r["institution_id"] in ("INST-CHENNAI-SJC", "INST-TRICHY-NITT")]
assert len(tn_reports) >= 1
print(f"  [PASS] /intake-compliance: Successfully loaded Tamil Nadu programmes ({len(tn_reports)} found)")


# ----------------------------------------------------
# 5. VERIFY AICTE NATIONAL DASHBOARD & REFRESH
# ----------------------------------------------------
print("\n--- Testing AICTE National Dashboard & Student Count ---")
admin_token = tokens["administrator"]
headers_admin = {"Authorization": f"Bearer {admin_token}"}

res = requests.get(f"{BASE}/dashboard/summary", headers=headers_admin)
assert res.status_code == 200
dash = res.json()
print(f"  [PASS] /dashboard/summary: Live Total Students = {dash['total_students']} (Verified > 11)")
assert dash["total_students"] > 11, "National Dashboard is incorrectly locked to 11 students!"

# Executive Report Export
res = requests.get(f"{BASE}/reports/executive-summary/export", headers=headers_admin)
assert res.status_code == 200
assert "text/csv" in res.headers.get("content-type", "")
assert len(res.content) > 1000
print(f"  [PASS] /reports/executive-summary/export: Exported valid CSV ({len(res.content)} bytes)")

print("\n==========================================================")
print("  ALL 5 CRITICAL TEST DOMAINS VERIFIED SUCCESSFULLY!      ")
print("==========================================================")
