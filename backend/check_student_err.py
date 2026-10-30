import urllib.request
import json

url = "http://10.31.11.118:8000/api/v1/auth/login"
for u in ["student_aarav", "student_demo", "student_priya"]:
    for role in ["student", None]:
        req = urllib.request.Request(
            url,
            data=json.dumps({"username": u, "password": "Password@2026", "requested_role": role}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"SUCCESS {u} (role={role}):", resp.read().decode())
        except urllib.error.HTTPError as e:
            print(f"FAILED {u} (role={role}): {e.code} -> {e.read().decode()}")
