import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_login_missing_token():
    res = client.post("/api/v1/auth/login", json={"requested_role": "administrator", "token": ""})
    assert res.status_code == 400
    assert "required" in res.json()["detail"].lower()

def test_login_invalid_token():
    res = client.post("/api/v1/auth/login", json={"requested_role": "administrator", "token": "invalid-token-12345"})
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower()

def test_login_role_mismatch():
    # dtu-registrar-token-2026 has role institution_officer. Attempting to login as administrator must return 403.
    res = client.post("/api/v1/auth/login", json={"requested_role": "administrator", "token": "dtu-registrar-token-2026"})
    assert res.status_code == 403
    assert "Role mismatch" in res.json()["detail"]

def test_login_valid_admin():
    res = client.post("/api/v1/auth/login", json={"requested_role": "administrator", "token": "admin-token-2026"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "administrator"
    assert data["access_token"] == "admin-token-2026"
    assert data["subject"] == "admin-national-sentinel"

def test_login_valid_institution_registrar():
    res = client.post("/api/v1/auth/login", json={"requested_role": "institution_officer", "token": "dtu-registrar-token-2026"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "institution_officer"
    assert data["institution_id"] == "INST-DELHI-DTU"

def test_login_valid_verifier():
    res = client.post("/api/v1/auth/login", json={"requested_role": "external_verifier", "token": "tcs-verifier-token-2026"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "external_verifier"
    assert data["verifier_org_id"] == "ORG-TCS-BGV"

def test_auth_me_with_bearer():
    headers = {"Authorization": "Bearer admin-token-2026"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "administrator"
    assert data["authenticated"] is True

def test_auth_logout():
    headers = {"Authorization": "Bearer admin-token-2026"}
    res = client.post("/api/v1/auth/logout", headers=headers)
    assert res.status_code == 200
    assert "terminated" in res.json()["message"].lower()
