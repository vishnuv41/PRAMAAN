# PRAMAAN Frontend (AICTE SIH26263)

AICTE Institutional Enrolment Integrity, Temporal Conflict Detection & Compliance Verification Platform.

## Features
- **14 Primary Oversight Modules:**
  1. Dashboard (`/`)
  2. Student Records (`/students`) & Detail Profile (`/students/:studentRef`)
  3. CSV Data Ingestion & Authoritative Pre-Ingestion Rules (`/imports`)
  4. Identity Lifecycle & Checksum Verification (`/identity`)
  5. Enrolment Monitoring & Temporal Overlap Conflict Engine (`/enrolments`)
  6. Intake Compliance & Capacity Tracking (`/intake`)
  7. Statistical Anomaly Detection & Justification Workflow (`/anomalies`)
  8. Alerts & Human-in-the-Loop Review Queue (`/reviews`)
  9. Approved Institutional Directory (`/institutions`)
  10. Executive Reporting & Diagnostics CSV Exports (`/reports`)
  11. Digital Educational Credentials & Tamper Simulation (`/credentials`)
  12. Credential Verification & Employer BGV Gateway (`/verification`)
  13. Immutable Security Audit Trail (`/audit`)
  14. System Configuration & Persona Access Governance (`/settings`)

## Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev

# 3. Run production build check
npm run build

# 4. Run automated integration test suite
npm test
```

## Production Artifacts
- Built with TypeScript 5.7, React 18, Vite 6, and custom high-contrast institutional styling.
- Production bundle compiled in `dist/`.
- Full phase-by-phase test report available in `FRONTEND_IMPLEMENTATION_REPORT.md`.
