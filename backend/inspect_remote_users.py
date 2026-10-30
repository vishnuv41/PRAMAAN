import urllib.request
import json

url = "http://10.31.11.118:8000/api/v1/auth/login"
req = urllib.request.Request(
    url,
    data=json.dumps({
        "username": "admin_demo",
        "password": "Password@2026",
        "requested_role": "administrator"
    }).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req) as resp:
    admin_token = json.loads(resp.read().decode())["access_token"]

req2 = urllib.request.Request(
    "http://10.31.11.118:8000/api/v1/auth/users",
    headers={"Authorization": f"Bearer {admin_token}"}
)

with urllib.request.urlopen(req2) as resp2:
    items = json.loads(resp2.read().decode())
    print(f"Total Users: {len(items)}")
    for u in items:
        print(f"Username: {u.get('username')}, Role: {u.get('role')}, Student Ref: {u.get('student_ref')}, Institution: {u.get('institution_id')}")
