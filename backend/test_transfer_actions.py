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

# 1. Login DTU Registrar
status, res = api_call("/auth/login", method="POST", data={
    "token": "dtu-registrar-token-2026",
    "requested_role": "institution_officer"
})
assert status == 200
dtu_token = res["access_token"]

# 2. Release Vikramaditya Rao (TRF-2026-002)
print("--- Testing Transfer Release (TRF-2026-002) ---")
status, res = api_call("/transfers/TRF-2026-002/release", method="POST", data={"comment": "NOC Issued by DTU Registrar"}, token=dtu_token)
print("Release status:", status, "Raw res:", repr(res))
if isinstance(res, dict):
    print("New stage:", res.get("stage"), "Status:", res.get("status"))
assert status == 200
assert res["status"] in {"SOURCE_RELEASED", "DESTINATION_REVIEW"}

# Check source enrolment status in database
status, student = api_call("/students/STU-DEMO-006", token=dtu_token)
dtu_enrol = [e for e in student["enrolments"] if e["institution_id"] == "INST-DELHI-DTU"][0]
print("Vikramaditya Rao DTU Enrolment Status after release:", dtu_enrol["enrolment_status"])
assert dtu_enrol["enrolment_status"] == "Withdrawn"

# 3. Admit Rohan Verma (TRF-2026-003)
print("\n--- Testing Transfer Admission (TRF-2026-003) ---")
status, res = api_call("/transfers/TRF-2026-003/admit", method="POST", data={"comment": "Rohan Verma admitted to DTU Computer Science"}, token=dtu_token)
print("Admit status:", status, "New stage:", res.get("stage"), "Status:", res.get("status"))
assert status == 200
assert res["status"] == "COMPLETED"

# Check Rohan Verma now has an active enrolment at DTU
status, student = api_call("/students/STU-DEMO-003", token=dtu_token)
dtu_enrol = [e for e in student["enrolments"] if e["institution_id"] == "INST-DELHI-DTU"][0]
print("Rohan Verma DTU Enrolment Status after admission:", dtu_enrol["enrolment_status"])
assert dtu_enrol["enrolment_status"] == "Active"

# 4. Initiate a new transfer for Ananya Iyer (STU-DEMO-004)
print("\n--- Testing Transfer Initiation (STU-DEMO-004) ---")
status, res = api_call("/transfers/initiate", method="POST", data={
    "student_ref": "STU-DEMO-004",
    "destination_institution_id": "INST-DELHI-IIITD",
    "programme_id": "BTECH-CSE",
    "reason": "Research internship & dual degree pathway"
}, token=dtu_token)
print("Initiate status:", status, "Transfer ID:", res.get("transfer_id"), "Stage:", res.get("stage"))
assert status == 201

print("\nALL TRANSFER WORKFLOW ACTIONS VERIFIED SUCCESSFULLY!")
