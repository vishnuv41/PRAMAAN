import urllib.request
import json

# 1. Login admin_demo
url = "http://10.31.11.118:8000/api/v1/auth/login"
req = urllib.request.Request(
    url,
    data=json.dumps({"username": "admin_demo", "password": "Password@2026", "requested_role": "administrator"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    admin_token = json.loads(resp.read().decode())["access_token"]

# 2. Create student user: aarav_sharma
create_url = "http://10.31.11.118:8000/api/v1/auth/users"
payload = {
    "username": "aarav_sharma",
    "email": "aarav.sharma@dtu.ac.in",
    "password": "Password@2026",
    "full_name": "Aarav Sharma",
    "role_category": "STUDENT",
    "institution_id": "INST-DELHI-DTU",
    "student_ref": "STU-DEMO-001"
}
req2 = urllib.request.Request(
    create_url,
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"},
    method="POST"
)

try:
    with urllib.request.urlopen(req2) as resp2:
        print("CREATE USER SUCCESS:", resp2.status, resp2.read().decode())
except urllib.error.HTTPError as e:
    print("CREATE USER ERROR:", e.code, e.read().decode())
