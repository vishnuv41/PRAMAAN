import urllib.request
import json

# We already have the 25 users:
users = [
    "admin", "aicte_reviewer", "dtu_registrar", "tcs_verifier", "compliance_auditor",
    "student_demo", "student_priya", "delhi_state_officer", "tn_state_officer", "mh_state_officer",
    "karnataka_state_officer", "coep_registrar", "nitt_registrar", "pes_registrar", "iitb_registrar",
    "student_aarav", "student_karthik", "student_aditya", "test_evaluator", "admin_demo",
    "reviewer_demo", "dtu_demo", "verifier_demo", "auditor_demo", "state_demo"
]

print("Testing Password@2026 for all users:")
for u in users:
    url = "http://10.31.11.118:8000/api/v1/auth/login"
    req = urllib.request.Request(
        url,
        data=json.dumps({
            "username": u,
            "password": "Password@2026"
        }).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            user_info = data.get("user", {})
            print(f"SUCCESS: {u} -> Role: {user_info.get('role')}, Name: {user_info.get('full_name')}, StudentRef: {user_info.get('student_ref')}")
    except Exception as e:
        pass
