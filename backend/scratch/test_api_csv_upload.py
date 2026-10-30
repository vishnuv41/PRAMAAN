import requests

url = "http://127.0.0.1:8000/api/v1/students/upload-csv"
headers = {"Authorization": "Bearer st-joseph-token-2026"}
files = {"file": ("PRAMAAN DEMO DATA.csv", open(r"c:\Users\VISHNU\OneDrive\Desktop\PRAMAAN DEMO DATA.csv", "rb"), "text/csv")}

res = requests.post(url, headers=headers, files=files)
print("Status code:", res.status_code)
print("Response:", res.json())
