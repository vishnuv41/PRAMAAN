import urllib.request
import json

with urllib.request.urlopen("http://10.31.11.118:8000/openapi.json") as resp:
    spec = json.loads(resp.read().decode())

paths = spec["paths"]
for path, methods in paths.items():
    if any(k in path.lower() for k in ["user", "password", "auth", "student", "reset"]):
        print(path, list(methods.keys()))
