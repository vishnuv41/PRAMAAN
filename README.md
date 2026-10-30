# APAAR Sentinel

**AICTE Institutional Enrolment Integrity, Temporal Conflict Detection & Compliance Verification Platform**

*A hackathon prototype engineered for AICTE-approved institutions.*

---

## 1. Overview & Core Innovation

**APAAR Sentinel** addresses critical challenges in higher technical education data governance. Beyond basic student profile collection, Sentinel provides an **uncertainty-aware temporal enrolment integrity engine**, automated pre-ingestion validation gates, approved-intake capacity tracking, statistical anomaly detection, and cryptographic credential verification.

### Main Innovation: Temporal Enrolment Integrity & Explainable Conflict Detection

The engine evaluates student identity evidence, active enrolment intervals, academic statuses, and regulatory exceptions to distinguish three distinct scenarios:

1. **Scenario A: Legitimate Transfer**  
   *A student attends College A from August 2025 to May 2026 (marked Completed or Withdrawn), and joins College B in August 2026.*  
   **Result:** No conflict alert. The timeline displays chronological progression and explains that the intervals do not overlap.
2. **Scenario B: Potential Overlapping Active Enrolment**  
   *A student has an active record at College C starting July 2026 and another active record at College D starting August 2026, both with no end dates.*  
   **Result:** Generates an investigative `TEMPORAL_OVERLAP_CONFLICT` signal (Severity: High, ~95% certainty). Displays both timelines and holds the case for officer review.
3. **Scenario C: Documented Permitted Exception**  
   *A student holds concurrent active records, but one contains an attached exception reference (e.g. `AICTE-EXC-2025-DUAL-04` for an approved dual-degree/credit transfer).*  
   **Result:** Generates an `EXCEPTION_REVIEW_REQUIRED` alert (Severity: Medium). The alert is **not** automatically cleared—an authorized officer must inspect and record the disposition.

> **Investigative Principle:** Alerts are investigative signals, never automatic proof of fraud or student misconduct.

---

## 2. System Architecture & Tech Stack

```
PRAMAAN/
├── backend/                        # FastAPI Python Backend
│   ├── app/
│   │   ├── models/                 # SQLAlchemy ORM Models
│   │   ├── schemas/                # Pydantic v2 Schemas
│   │   ├── services/
│   │   │   ├── integrity_engine.py # Temporal Enrolment Integrity Engine
│   │   │   ├── validation_service.py # Automated Pre-Ingestion Validation
│   │   │   ├── intake_service.py   # AICTE Approved-Intake Compliance
│   │   │   ├── anomaly_service.py  # Historical Anomaly Detection (Z-Score)
│   │   │   ├── certificate_service.py # HMAC-SHA256 Cryptographic Verification
│   │   │   └── audit_service.py    # Append-only Audit Ledger
│   │   ├── routers/                # Documented REST Endpoints (/api/v1)
│   │   ├── config.py
│   │   ├── database.py             # SQLite Local Engine
│   │   ├── main.py                 # FastAPI Application & Middleware
│   │   └── seed_data.py            # Reproducible Synthetic Seed Script
│   ├── tests/                      # Automated Pytest Suite
│   ├── pramaan_india_demo.db       # Active demonstration database with 500+ records
│   ├── apaar_sentinel.db           # Protected reference database
│   └── requirements.txt
├── frontend/                       # React + Vite + TypeScript (4 Portals)
│   ├── src/
│   │   ├── api.ts                  # Typed Axios Client & Auth Interceptors
│   │   ├── components/             # Reusable UI & Layout Components
│   │   ├── pages/                  # Student, College, State & AICTE Portal Pages
│   │   ├── App.tsx                 # Route Hierarchy & RBAC Guards
│   │   └── styles.css              # Sentinel Design System
│   ├── vite.config.ts              # Vite Config + Proxy Configuration
│   └── package.json
├── sample_data/                    # Pre-formatted demonstration CSV batches (500 records)
├── docs/                           # Architecture, RBAC, and Security Audit Reports
└── README.md
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, React Router v7.
- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2, Pydantic v2, Pytest, Uvicorn, Cryptography.
- **Database:** SQLite 3 with parameterized queries and indexed lookups.

---

## 3. Quickstart & Local Setup (Windows PowerShell)

### Prerequisites
- Python 3.11+ (Python 3.14 confirmed)
- Node.js 18+ (Node v24.20 confirmed) & npm

### Step 1: Set up and Launch Backend

Open a PowerShell terminal in the project root (`PRAMAAN`):

```powershell
# 1. Navigate to backend
cd backend

# 2. Activate virtual environment
.\venv\Scripts\Activate.ps1

# (If creating a fresh virtual environment from scratch):
# python -m venv venv
# .\venv\Scripts\pip install -r requirements.txt

# 3. Initialize database and seed synthetic records
python -m app.seed_data

# 4. Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### Step 2: Set up and Launch Frontend

Open a second PowerShell terminal in the project root:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies (if fresh clone)
npm install

# 3. Start Vite dev server
npm run dev -- --host 127.0.0.1 --port 5173
```

- **Dashboard UI:** [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

## 4. Automated Testing

The backend includes a comprehensive automated test suite covering all core requirements:

```powershell
cd backend
.\venv\Scripts\pytest -v
```

### Verified Test Cases (17 Passed):
- `tests/test_integrity_engine.py`:
  - `test_intervals_overlap_function`: Chronological boundary handling and status-aware overlap.
  - `test_scenario_a_legitimate_transfer`: Verifies completed enrolment followed by new institution produces **0 alerts**.
  - `test_scenario_b_overlapping_active_enrolments`: Verifies concurrent active records produce `TEMPORAL_OVERLAP_CONFLICT` (High severity).
  - `test_scenario_c_documented_permitted_exception`: Verifies exception reference produces `EXCEPTION_REVIEW_REQUIRED` (Medium severity) without auto-clearing.
  - `test_duplicate_submission_detection`: Verifies duplicate batch submissions are flagged as `DUPLICATE_SUBMISSION` (Low severity).
- `tests/test_validation.py`:
  - `test_missing_required_fields`: Schema completeness check.
  - `test_chronological_inversion`: Rejects end date earlier than start date.
  - `test_invalid_status`: Enforces approved status enum.
  - `test_dataset_validation_with_batch_duplicate`: Identifies duplicate rows within batch import.
- `tests/test_intake_compliance.py`:
  - `test_intake_dimensions_separation`: Proves multi-cohort active student counts (160) are **never** compared against single-year approved intake (60).
- `tests/test_certificates.py`:
  - Authenticity check: Proves HMAC-SHA256 signature verification succeeds on untampered payload.
  - Tamper detection: Modifying any field (e.g. student name) fails signature verification.
  - Revocation handling: Revoked credentials report status `REVOKED` even with mathematically valid signatures.
- `tests/test_alerts_review.py`:
  - Reviewer decision persistence: Confirmed conflict, Not a conflict, Exception accepted, Needs more info.
  - Audit event creation on reviewer action.
- `tests/test_api_endpoints.py`:
  - `/health`, `/api/v1/dashboard/summary`, `/api/v1/students`, `/api/v1/alerts`, `/api/v1/certificates/verify`.

---

## 5. Main Features & Navigation

| Navigation View | Route | Functionality |
| :--- | :--- | :--- |
| **Overview** | `/` | Live institutional metrics, open alerts count, validation pass rate, approved intake vs new admissions chart, alert severity distribution, and recent audit activity. |
| **Student Records** | `/students` | Searchable profile directory (by student ref, APAAR ID, or name), enrolment detail drawer, individual record creation form, and CSV upload with schema validation summary. |
| **Enrolment Integrity** | `/integrity` | Core case review console. Inspects temporal overlap evidence, side-by-side enrolment cards, chronological timelines, exception citations, and allows recording officer dispositions. |
| **Validation Centre** | `/validation` | Inventory of pre-ingestion schema and temporal rules, plus an interactive JSON testing playground providing real-time diagnostics. |
| **Intake Compliance** | `/intake` | Compares single-cycle new admissions against approved capacity while isolating total active student cohorts. Audits supernumerary (TFW) and NRI quota utilization. |
| **Historical Analytics** | `/analytics` | 5-year moving average admission trend charts, Z-score anomaly baseline, and exact confusion matrix metrics against synthetic ground truth labels. |
| **Certificate Verification** | `/certificates` | Sample student certificate with watermarked demo banner, fictional APAAR ID, QR code, cryptographic HMAC verification, and interactive tamper resistance testbed. |
| **Audit Trail** | `/audit` | Append-only audit ledger recording every human review decision, batch CSV ingestion, certificate verification, and system lifecycle event. |
| **Settings** | `/settings` | Demo reviewer identity credentials (`Demo Officer (AICTE-RO-102)`), authentication disclosure, database driver details, and rules engine versioning. |

---

## 6. Privacy & Governance Disclaimers

1. **Fictional Data Only:** All student names, references (e.g. `STU-DEMO-001`), and APAAR identifiers (e.g. `9876-5432-1001`) are entirely synthetic demo fixtures.
2. **No Fake Authority:** The application does not claim official sovereign AICTE authority, nor does it connect to DigiLocker or the national APAAR production registry.
3. **No Unauthenticated Claims:** Authentication is explicitly disclosed as prototype demo mode (`Demo Officer`).
4. **Explainable AI:** Anomaly scores and conflict alerts are probabilistic signals for human institutional review, never automated determinations of wrongdoing.
