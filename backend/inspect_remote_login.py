import urllib.request
import json

with urllib.request.urlopen("http://10.31.11.118:8000/openapi.json") as resp:
    spec = json.loads(resp.read().decode())

login_op = spec["paths"]["/api/v1/auth/login"]["post"]
print("LOGIN OPERATION:")
print(json.dumps(login_op, indent=2))

schemas = spec["components"]["schemas"]
req_ref = login_op["requestBody"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
print(f"REQUEST SCHEMA ({req_ref}):")
print(json.dumps(schemas[req_ref], indent=2))

resp_ref = login_op["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
print(f"RESPONSE SCHEMA ({resp_ref}):")
print(json.dumps(schemas[resp_ref], indent=2))
