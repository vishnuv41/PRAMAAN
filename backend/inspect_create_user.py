import urllib.request
import json

with urllib.request.urlopen("http://10.31.11.118:8000/openapi.json") as resp:
    spec = json.loads(resp.read().decode())

post_user = spec["paths"]["/api/v1/auth/users"]["post"]
print(json.dumps(post_user, indent=2))
ref = post_user["requestBody"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
print(json.dumps(spec["components"]["schemas"][ref], indent=2))
