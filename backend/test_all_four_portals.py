import urllib.request
import urllib.error
import json

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

print("--- 1. Testing Student Login ---")
status, res = api_call("/auth/login", method="POST", data={
    "token": "student-token-2026",
    "requested_role": "student"
})
print("Student login status:", status, res.get("role"), res.get("student_ref"))
assert status == 200, f"Expected 200 got {status}: {res}"
student_token = res["access_token"]

print("\n--- 2. Testing Student Profile (/students/me) ---")
status, data = api_call("/students/me", token=student_token)
print("Student profile status:", status)
assert status == 200
print("Student name:", data["student"]["full_name"], "APAAR ID:", data["student"]["apaar_id"])
print("Enrolments count:", len(data["enrolments"]))
for e in data["enrolments"]:
    print(f"  - {e['institution_name']}: {e['enrolment_status']} ({e['academic_year']})")

print("\n--- 3. Testing Student Privacy Isolation (/students/STU-DEMO-002 should FAIL 403) ---")
status, err = api_call("/students/STU-DEMO-002", token=student_token)
print("Unauthorized student read status:", status, err)
assert status == 403, f"Expected 403 but got {status}"

print("\n--- 4. Testing Student Transfers (/transfers) ---")
status, t_data = api_call("/transfers", token=student_token)
print("Student transfers status:", status)
assert status == 200
print("Transfers returned for student:", t_data["total"])
for t in t_data["items"]:
    print(f"  - {t['transfer_id']}: {t['source_institution_name']} -> {t['destination_institution_name']} (Status: {t['status']}, Stage: {t['stage']})")

print("\n--- 5. Testing College Registrar Login & Transfers ---")
status, res = api_call("/auth/login", method="POST", data={
    "token": "dtu-registrar-token-2026",
    "requested_role": "institution_officer"
})
assert status == 200
college_token = res["access_token"]

status, res = api_call("/transfers", token=college_token)
print("College transfers count:", res["total"])
for t in res["items"]:
    print(f"  - {t['transfer_id']}: {t['student_name']} ({t['source_institution_id']} -> {t['destination_institution_id']}) Stage: {t['stage']} ({t['status']})")

print("\n--- 6. Testing State Directorate Login & Scoping ---")
status, res = api_call("/auth/login", method="POST", data={
    "token": "state-delhi-token-2026",
    "requested_role": "state_officer"
})
assert status == 200
state_token = res["access_token"]
status, res = api_call("/transfers", token=state_token)
print("State transfers count:", res["total"])

print("\n--- 7. Testing AICTE National Admin Login ---")
status, res = api_call("/auth/login", method="POST", data={
    "token": "admin-token-2026",
    "requested_role": "administrator"
})
assert status == 200
admin_token = res["access_token"]
status, res = api_call("/transfers", token=admin_token)
print("National transfers count:", res["total"])

print("\nALL BACKEND API TESTS PASSED PERFECTLY!")
