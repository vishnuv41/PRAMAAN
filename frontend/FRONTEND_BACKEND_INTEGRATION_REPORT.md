# PRAMAAN / APAAR Sentinel: Frontend-Backend Integration Report

**Execution Date:** 27 October 2026  
**System:** PRAMAAN / APAAR Sentinel (AICTE Student Verification & Temporal Integrity Engine)  
**Author:** Senior Full-Stack Integration Engineer  

---

## 1. Executive Summary & Architecture

The existing PRAMAAN React + Vite frontend has been audited, adapted, and integrated with the authoritative FastAPI backend across a two-laptop local area network (LAN) setup.

### Network Configuration (Two-Laptop LAN Demo)

| Node | Host IP | Port | Protocol / Prefix | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Laptop** | `10.31.9.62` | `8000` | `http://10.31.9.62:8000/api/v1` | FastAPI, SQLite (`apaar_sentinel.db`), Integrity Engine |
| **Frontend Laptop** | `10.31.9.99` | `5173` | `http://10.31.9.99:5173/` | React 18, Vite 6, Centralized Axios Client |
| **Health Check** | `10.31.9.62` | `8000` | `GET http://10.31.9.62:8000/health` | Service status: `healthy`, `PRAMAAN` / `APAAR Sentinel` |
| **API Documentation** | `10.31.9.62` | `8000` | `http://10.31.9.62:8000/docs` | OpenAPI 3.1 Swagger UI |

### Architecture & Proxy Strategy
To eliminate cross-origin resource sharing (CORS) blocks and browser cookie partitioning issues while maintaining high security:
1. **Centralized Base URL:** Frontend uses `VITE_API_BASE_URL=/api/v1` via `.env`.
2. **Reverse Proxy:** Vite's development server in `vite.config.ts` proxies `/api` and `/health` requests to `http://10.31.9.62:8000` (configurable via `VITE_BACKEND_PROXY_TARGET`), ensuring that all browser traffic stays on the origin `http://10.31.9.99:5173` without cross-origin pre-flight drops.

---

## 2. Source-of-Truth Backend Audit & Contract Mapping

The backend implementation was audited by inspecting all registered routers, Pydantic schemas, and SQLAlchemy database models:

| Router | Prefix | Endpoints Discovered | Key Schemas & Models |
| :--- | :--- | :---: | :--- |
| `dashboard` | `/api/v1/dashboard` | 1 | `DashboardSummaryResponse`, `Enrolment`, `Student`, `Alert` |
| `aicte` | `/api/v1/aicte` | 1 | Regional overview, `excess_intake_colleges`, `monthly_summary` |
| `institution` | `/api/v1/institution` | 1 | `institution_id` scoped intake utilization, student counts, alerts |
| `students` | `/api/v1/students` | 8 | `StudentCreate`, `StudentResponse`, CSV upload, timeline, versions |
| `enrolments` | `/api/v1/enrolments` | 2 | `EnrolmentResponse`, multi-institution enrolment records |
| `alerts` | `/api/v1/alerts` | 9 | `AlertReviewRequest`, `AlertAssignmentRequest`, notes, reopen |
| `intake` | `/api/v1/intake-compliance` | 4 | `ApprovedIntake`, APH handbook formulas, rule history |
| `analytics` | `/api/v1/analytics` | 5 | Trends, anomalies, statistical surge dismissal (`Z-score`, IQR) |
| `certificates` | `/api/v1/certificates` | 4 | Digital certificates, cryptographic signature verification, tamper simulation |
| `consent` | `/api/v1/consent` | 3 | `StudentConsent`, status toggle (`ACTIVE`/`WITHDRAWN`), purpose binding |
| `verifier` | `/api/v1/verifier` | 3 | BGV agency verification (`MATCH_VERIFIED`), organization logs |
| `reports` | `/api/v1/reports` | 2 | Executive compliance summary, CSV diagnostic export |
| `audit` | `/api/v1/audit-trail` | 1 | Immutable event ledger (`AuditLog`) |
| `validation` | `/api/v1/validation` | 4 | 10 pre-ingestion rule gates, sandbox test record, sample CSV |

---

## 3. Five Personas and Role-Specific Dashboards

In accordance with Section 5 of the specification, the application supports five distinct operational personas with dedicated, role-specific dashboard routes:

| Persona | Role Identifier | Assigned Route | Component | Permitted Capabilities & Scopes |
| :--- | :--- | :--- | :--- | :--- |
| **Prototype Admin** | `prototype_admin` / `administrator` | `/admin-dashboard` | [`DashboardPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/DashboardPage.tsx) | National central overview, global metrics, user management, unrestricted audit access |
| **AICTE Regional Reviewer** | `reviewer` | `/aicte-dashboard` | [`InstitutionsPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/InstitutionsPage.tsx) | Regional compliance, jurisdiction RO-102, temporal conflict review, quota discrepancy investigations |
| **Institution Registrar** | `institution_officer` | `/institution-dashboard` | [`InstitutionDashboardPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/InstitutionDashboardPage.tsx) | Campus scope (`INST-DELHI-DTU`), batch CSV ingestion, intake capacity monitoring, campus alerts |
| **BGV Verifier** | `external_verifier` | `/employer-portal` | [`VerificationPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/VerificationPage.tsx) | Purpose-bound credential checks (`ORG-TCS-BGV`), student consent verification, masked APAAR outputs |
| **Compliance Auditor** | `read_only_auditor` | `/auditor-dashboard` | [`AuditPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/AuditPage.tsx) | Read-only audit log queries, forensic event timestamps, compliance report inspection |

### Authentication & Persona Switching
- Added [`LoginPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/LoginPage.tsx) at `/login`.
- Unauthenticated users or evaluators can select any of the 5 operational personas with one click, pre-filling the appropriate role, subject, and scope.
- Topbar user profile reflects the active persona's name, avatar, and jurisdiction, providing an immediate path to `/login` to switch roles or log out.

---

## 4. Authentication Architecture & Identified Backend Gap

### Actual Backend Security Implementation
Inspection of `backend/app/security.py` revealed:
1. **Bearer Token Authentication:** The backend uses `HTTPBearer(auto_error=False)` with token validation against an in-memory SHA-256 hash dictionary `API_TOKEN_PRINCIPALS_JSON`.
2. **Default Prototype Mode:** When `AUTH_REQUIRED=false` (the default setting), requests without a Bearer header are automatically resolved to `Principal(subject="local-prototype", role="prototype_admin")`.
3. **Session Cookie Gap:** The backend **does not** currently implement an HttpOnly cookie handler (`pramaan_token`) or `/api/v1/auth/login` and `/api/v1/auth/logout` endpoints.

### Frontend Adapter Implementation
1. **Centralized Client:** Configured `api.ts` with `withCredentials: true`, a request interceptor that injects `Authorization: Bearer <token>` when a token is stored in session, and an unauthorized response interceptor.
2. **Session Persistence:** Session state (`pramaan_session_user` and `pramaan_session_token`) is preserved in `sessionStorage` (never exposing tokens in insecure local storage), surviving browser reloads.
3. **Logout:** Calling logout clears the session storage and redirects to `/login`.

---

## 5. Contract Mismatches Resolved

| Component / Area | Frontend Initial Assumption | Actual Backend Schema | Resolution Applied |
| :--- | :--- | :--- | :--- |
| **CSV Reports Export** | `window.open('http://127.0.0.1:8000/...')` | Relative endpoint `/reports/executive-summary/export` returning streamed `text/csv` blob | Refactored in [`ReportsPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/ReportsPage.tsx) to use `api.get(..., { responseType: 'blob' })` and automatic file download trigger |
| **Consent Model** | Expected `is_active: boolean`, `granted_to_org_id` | Backend returned `consent_granted: boolean`, `status: "ACTIVE" \| "WITHDRAWN"`, `data_scope` | Updated `ConsentRecord` in `api.ts` and adapters in `StudentDetailPage.tsx` to handle both formats |
| **Import Job Model** | Expected `filename`, `accepted_count`, `rejected_count`, `created_at` | Backend models `original_filename`, `accepted_rows`, `rejected_rows`, `uploaded_at` | Updated `ImportJob` interface and normalized adapter in `ImportsPage.tsx` |
| **Import Row Model** | Expected `status`, `validation_errors: [...]` | Backend returns `outcome: "ACCEPTED" \| "REJECTED"`, `validation_messages: [...]` | Updated `ImportRow` interface and fallbacks in `ImportsPage.tsx` |
| **Alert History** | Expected `performed_by` | Backend review event model returns `actor` | Updated `AlertHistory` interface and `AlertsPage.tsx` table display |
| **Timeline Feed CSS** | Collided with `.timeline-item` grid column 1 (22px) | Student timeline required full-width cards with connector line | Scoped legacy `.timeline > .timeline-item` and implemented full-width `.timeline-feed .timeline-card` |

---

## 6. Files Changed

1. [`backend/frontend/src/api.ts`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/api.ts) & [`frontend/src/api.ts`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/frontend/src/api.ts):
   - Configured `withCredentials: true`, timeout, and request/response interceptors.
   - Added `getAuthToken()` and `setAuthToken()`.
   - Updated TypeScript interfaces: `ConsentRecord`, `ImportJob`, `ImportRow`, `AlertHistory`, `ExecutiveReport`.
   - Added `InstitutionDashboardSummary` interface.
2. [`backend/frontend/src/App.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/App.tsx) & [`frontend/src/App.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/frontend/src/App.tsx):
   - Added routes for all 5 personas: `/admin-dashboard`, `/aicte-dashboard`, `/institution-dashboard`, `/employer-portal`, `/auditor-dashboard`, and `/login`.
   - Added reactive `currentUser` state tracking the active persona.
   - Connected topbar profile to display active persona with click-to-switch navigation.
3. [`backend/frontend/src/pages/InstitutionDashboardPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/InstitutionDashboardPage.tsx):
   - New dedicated dashboard for Institution Registrars querying `/api/v1/institution/dashboard-summary`.
   - Displays campus intake utilization, enrolled student categories, open integrity signals, and recent alerts.
4. [`backend/frontend/src/pages/LoginPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/LoginPage.tsx):
   - New authentication gateway supporting selection of all 5 operational personas.
   - Stores session user and optional bearer token in session storage and redirects to the designated persona route.
5. [`backend/frontend/src/pages/ReportsPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/ReportsPage.tsx):
   - Replaced hardcoded `localhost:8000` URLs with blob-based download handling via centralized API client.
6. [`backend/frontend/src/pages/ImportsPage.tsx`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/pages/ImportsPage.tsx):
   - Adapted status badge to handle both `status` and `outcome`.
7. [`backend/frontend/src/styles.css`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/styles.css):
   - Scoped legacy 22px `.timeline-item` grid to `.timeline > .timeline-item`.
   - Implemented full-width academic timeline feed (`.timeline-feed .timeline-card`).
   - Hidden visible sidebar vertical scrollbar while preserving scrollability.
   - Interactive PRAMAAN brand icon collapse/expand toggle.
8. [`backend/frontend/vite.config.ts`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/vite.config.ts):
   - Reverse proxy targeting `http://10.31.9.62:8000` with fallback via `VITE_BACKEND_PROXY_TARGET`.
9. [`backend/frontend/src/tests/frontend.test.mjs`](file:///c:/Users/VISHNU/OneDrive/Desktop/anayava/anayava/backend/frontend/src/tests/frontend.test.mjs):
   - Expanded test suite to cover all 14 routes, all 5 persona routes, and dashboard endpoints.

---

## 7. Verification & Test Execution Results

### 1. TypeScript & Bundling Verification
Executed `npm run build` (`tsc -b && vite build`):
- **backend/frontend:** Built cleanly in 9.77s with **0 errors, 0 warnings**.
- **frontend:** Built cleanly in 6.73s with **0 errors, 0 warnings**.

### 2. Automated Test Suite Output
Executed `node --test src/tests/frontend.test.mjs`:
```text
✔ maskId: should mask APAAR ID leaving only last 4 digits (1.08ms)
✔ isIsoDate: should validate ISO dates (0.77ms)
✔ Navigation: all 14 required sections must be present (0.07ms)
✔ Persona Navigation: all 5 persona routes must be supported (0.09ms)
✔ Backend Health: verifies FastAPI /health response (26.20ms)
✔ API Integration: Dashboard Summary (10.36ms)
✔ API Integration: AICTE Regional Reviewer Dashboard Summary (8.92ms)
✔ API Integration: Institution Registrar Dashboard Summary (7.45ms)
✔ API Integration: Student Registry (6.92ms)
✔ API Integration: Enrolments (5.58ms)
✔ API Integration: Intake Compliance (9.37ms)
✔ API Integration: Statistical Anomalies (3.46ms)
✔ API Integration: Alerts and Review Queue (5.51ms)
✔ API Integration: Digital Certificates & Verification (11.98ms)
✔ API Integration: Pre-Ingestion Rules (2.24ms)
✔ API Integration: Audit Trail Ledger (4.16ms)
✔ API Integration: Student Details & Temporal Progression (9.09ms)
✔ API Integration: Third-Party BGV Gateway Verification (10.73ms)
✔ API Integration: Reports CSV Diagnostics Export (9.66ms)

ℹ tests 19 | suites 0 | pass 19 | fail 0
```

---

## 8. Requested Changes for Backend Owner

For the backend developer maintaining the FastAPI service on laptop `10.31.9.62`:

1. **CORS Allowlist Addition:**
   - In `backend/app/config.py` or `.env`, update `ALLOW_ORIGINS` to include the frontend laptop origin:
     ```env
     ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://10.31.9.99:5173
     ```
2. **Cryptographic Signing Root Key:**
   - Ensure the server has the HMAC/Ed25519 signing secret configured in its environment so that `/api/v1/certificates/{id}/verify` and `/api/v1/verifier/verify-credential` execute without internal server incidents.
3. **Optional HttpOnly Session Cookie Route (Future Phase):**
   - If migrating from Bearer authorization to session cookies, implement `/api/v1/auth/login` setting `Set-Cookie: pramaan_token=...; HttpOnly; SameSite=Lax; Path=/`.

---

## 9. Commands to Run the Demo

### Starting the Frontend
```powershell
Set-Location "c:\Users\VISHNU\OneDrive\Desktop\anayava\anayava\backend\frontend"
npm run dev
```
The application will be accessible locally at `http://localhost:5173/` and across the LAN at `http://10.31.9.99:5173/`.

### Starting the Backend (on 10.31.9.62)
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
