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
    "http://10.31.11.118:8000/api/v1/auth/users",
    headers={"Authorization": f"Bearer {admin_token}"}
)
with urllib.request.urlopen(req2) as resp2:
    users = json.loads(resp2.read().decode())
    for u in users:
        if "student" in u.get("username", ""):
            print(json.dumps(u, indent=2))
