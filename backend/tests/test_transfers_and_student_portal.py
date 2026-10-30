import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.student import Student
from app.models.enrolment import Enrolment
from app.models.transfer import StudentTransfer
from datetime import date, datetime
import json

client = TestClient(app)

def test_student_login_and_profile_access():
    login_resp = client.post("/api/v1/auth/login", json={
        "token": "student-token-2026",
        "requested_role": "student"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # /students/me should return Aarav Sharma
    me_resp = client.get("/api/v1/students/me", headers=headers)
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["student"]["student_ref"] == "STU-DEMO-001"
    assert data["student"]["full_name"] == "Aarav Sharma"

    # Enforce isolation: Student cannot access STU-DEMO-002
    forbidden_resp = client.get("/api/v1/students/STU-DEMO-002", headers=headers)
    assert forbidden_resp.status_code == 403

def test_student_transfers_list():
    login_resp = client.post("/api/v1/auth/login", json={
        "token": "student-token-2026",
        "requested_role": "student"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/transfers", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    # All items returned must belong to the student
    for item in items:
        assert item["student_ref"] == "STU-DEMO-001"

def test_college_registrar_transfers_scoping():
    login_resp = client.post("/api/v1/auth/login", json={
        "token": "dtu-registrar-token-2026",
        "requested_role": "institution_officer"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/transfers", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    # All transfers returned must involve DTU as source or destination
    for item in items:
        assert item["source_institution_id"] == "INST-DELHI-DTU" or item["destination_institution_id"] == "INST-DELHI-DTU"

def test_national_admin_transfers_oversight():
    login_resp = client.post("/api/v1/auth/login", json={
        "token": "admin-token-2026",
        "requested_role": "administrator"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/transfers", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
