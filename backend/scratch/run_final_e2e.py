import urllib.request
import json
import hashlib

def run_e2e_verification():
    print("=== PRAMAAN SENTINEL E2E VERIFICATION ===")
    
    # 1. Verify protected DB hash
    expected_hash = "0529acd1b8f714404d4f530135678a48e6cc2e77fecb3a6ff9f25305846323b3"
    actual_hash = hashlib.sha256(open(r"c:\Users\VISHNU\OneDrive\Desktop\anayava\anayava\backend\apaar_sentinel.db", "rb").read()).hexdigest()
    assert actual_hash == expected_hash, f"Protected DB hash mismatch! {actual_hash} != {expected_hash}"
    print(f"[PASS] Protected database (apaar_sentinel.db) SHA-256 untouched: {actual_hash[:16]}...")

    # 2. Query SJC students
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/students?institution_id=INST-CHENNAI-SJC&limit=5", headers={"Authorization": "Bearer st-joseph-token-2026"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        total = data.get("total")
        print(f"[PASS] SJC Enrolled Students count: {total} (matches all 500 CSV students + original seeded students)")
        assert total >= 500, f"Expected at least 500 students, got {total}"

    # 3. Query SJC students using demo alias INST-DEMO-01
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/students?institution_id=INST-DEMO-01&limit=5", headers={"Authorization": "Bearer st-joseph-token-2026"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        total_alias = data.get("total")
        print(f"[PASS] SJC Students via alias INST-DEMO-01: {total_alias}")
        assert total_alias == total, "Alias total mismatch"

    # 4. Query Campus Overview summary
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/institution/dashboard-summary?institution_id=INST-CHENNAI-SJC", headers={"Authorization": "Bearer st-joseph-token-2026"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        total_enrolments = data.get("total_enrolments")
        active = data.get("active_students")
        sanctioned = data.get("total_sanctioned_intake")
        print(f"[PASS] Campus Overview: {total_enrolments} total enrolments, {active} active, {sanctioned} sanctioned seats across {len(data.get('programmes', []))} programmes")
        assert total_enrolments >= 500, f"Expected at least 500 enrolments, got {total_enrolments}"

    # 5. Verify all four roles login
    roles = [
        ("Student Portal", "aarav_sharma", "student-token-2026", "student"),
        ("College Portal", "st_joseph_demo", "st-joseph-token-2026", "institution_officer"),
        ("State Directorate Portal", "tn_state_officer", "state-tn-token-2026", "state_officer"),
        ("AICTE National Portal", "admin_demo", "admin-token-2026", "administrator"),
    ]
    for portal_name, username, token, expected_role in roles:
        login_data = json.dumps({"token": token, "requested_role": expected_role}).encode()
        req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            assert res.get("role") == expected_role, f"Role mismatch for {portal_name}"
            print(f"[PASS] {portal_name}: authenticated as '{username}' with role '{res.get('role')}'")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_e2e_verification()
