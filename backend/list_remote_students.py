import urllib.request
import json

url = "http://10.31.11.118:8000/api/v1/auth/login"
req = urllib.request.Request(
    url,
    data=json.dumps({"username": "admin_demo", "password": "Password@2026", "requested_role": "administrator"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    admin_token = json.loads(resp.read().decode())["access_token"]

req2 = urllib.request.Request(
    "http://10.31.11.118:8000/api/v1/students?limit=10",
    headers={"Authorization": f"Bearer {admin_token}"}
)
with urllib.request.urlopen(req2) as resp2:
    students = json.loads(resp2.read().decode())
    items = students.get("items", [])
    print(f"Total students on remote backend: {students.get('total')}")
    for s in items[:10]:
        print(f"  - Ref: {s.get('student_ref')}, APAAR: {s.get('apaar_id')}, Name: {s.get('full_name')}, Inst: {s.get('primary_institution_id')}")
