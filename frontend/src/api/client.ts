const API_BASE = '/api/v1';

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errData = await res.json();
      errorDetail = errData.detail || errData.message || JSON.stringify(errData);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Dashboards
  getDashboardSummary: (institutionId?: string, academicYear?: string) => {
    const params = new URLSearchParams();
    if (institutionId) params.append('institution_id', institutionId);
    if (academicYear) params.append('academic_year', academicYear);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<any>(`/dashboard/summary${qs}`);
  },

  getInstitutionDashboard: (institutionId: string = 'INST-DELHI-DTU', academicYear?: string) => {
    const qs = new URLSearchParams({ institution_id: institutionId });
    if (academicYear) qs.append('academic_year', academicYear);
    return fetchJson<any>(`/institution/dashboard-summary?${qs.toString()}`);
  },

  getAicteDashboard: (region?: string) => {
    const qs = region ? `?region=${encodeURIComponent(region)}` : '';
    return fetchJson<any>(`/aicte/dashboard-summary${qs}`);
  },

  // Students & Versions
  listStudents: (params?: { search?: string; institution_id?: string; programme_id?: string; academic_year?: string; enrolment_status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.institution_id) qs.append('institution_id', params.institution_id);
    if (params?.programme_id) qs.append('programme_id', params.programme_id);
    if (params?.academic_year) qs.append('academic_year', params.academic_year);
    if (params?.enrolment_status) qs.append('enrolment_status', params.enrolment_status);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    return fetchJson<any>(`/students?${qs.toString()}`);
  },

  getStudentDetail: (studentRef: string) => {
    return fetchJson<any>(`/students/${studentRef}`);
  },

  getStudentVersions: (studentRef: string) => {
    return fetchJson<any>(`/students/${studentRef}/versions`);
  },

  createStudent: (payload: any) => {
    return fetchJson<any>('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/students/upload-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'CSV upload failed');
    }
    return res.json();
  },

  // Alerts
  listAlerts: (params?: { status?: string; severity?: string; alert_type?: string; student_ref?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.severity) qs.append('severity', params.severity);
    if (params?.alert_type) qs.append('alert_type', params.alert_type);
    if (params?.student_ref) qs.append('student_ref', params.student_ref);
    return fetchJson<any>(`/alerts?${qs.toString()}`);
  },

  getAlertDetail: (alertId: string) => {
    return fetchJson<any>(`/alerts/${alertId}`);
  },

  reviewAlert: (alertId: string, decision: string, note: string, reviewedBy?: string) => {
    return fetchJson<any>(`/alerts/${alertId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, note, reviewed_by: reviewedBy }),
    });
  },

  reEvaluateAlerts: () => {
    return fetchJson<any>('/alerts/re-evaluate', { method: 'POST' });
  },

  // Consent Module (DPDP)
  getStudentConsents: (studentRef: string) => {
    return fetchJson<any>(`/consent/student/${studentRef}`);
  },

  toggleConsent: (consentId: number, consentGranted: boolean) => {
    return fetchJson<any>(`/consent/${consentId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ consent_granted: consentGranted }),
    });
  },

  createConsent: (payload: any) => {
    return fetchJson<any>('/consent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Employer / Verifier Portal
  listVerifierOrgs: () => {
    return fetchJson<any>('/verifier/organizations');
  },

  verifyCandidate: (payload: { verifier_org_id: string; student_ref?: string; apaar_id?: string; certificate_id?: string }) => {
    return fetchJson<any>('/verifier/verify-credential', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getVerificationLogs: (orgId?: string) => {
    const qs = orgId ? `?verifier_org_id=${encodeURIComponent(orgId)}` : '';
    return fetchJson<any>(`/verifier/logs${qs}`);
  },

  // Reports
  getExecutiveReports: () => {
    return fetchJson<any>('/reports/executive-summary');
  },

  // Validation
  getValidationRules: () => {
    return fetchJson<any>('/validation/rules');
  },

  testValidationRecord: (record: any) => {
    return fetchJson<any>('/validation/test-record', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  getSampleCsvTemplate: () => {
    return fetchJson<any>('/validation/sample-csv-data');
  },

  // Intake
  getIntakeCompliance: () => {
    return fetchJson<any>('/intake-compliance');
  },

  configureIntakeRule: (payload: any) => {
    return fetchJson<any>('/intake-compliance/rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Analytics & Anomaly Dismissal
  getHistoricalTrends: (instId: string, progId: string) => {
    return fetchJson<any>(`/analytics/historical/${instId}/${progId}`);
  },

  getAnomalies: () => {
    return fetchJson<any>('/analytics/anomalies');
  },

  dismissAnomaly: (anomalyId: number, reason: string, dismissedBy?: string) => {
    return fetchJson<any>(`/analytics/anomalies/${anomalyId}/dismiss`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, dismissed_by: dismissedBy }),
    });
  },

  getBenchmarkEvaluation: () => {
    return fetchJson<any>('/analytics/benchmark-evaluation');
  },

  // Certificates
  listCertificates: () => {
    return fetchJson<any>('/certificates');
  },

  getCertificate: (certId: string) => {
    return fetchJson<any>(`/certificates/${certId}`);
  },

  verifyCertificate: (certId: string) => {
    return fetchJson<any>(`/certificates/${certId}/verify`);
  },

  simulateTamper: (certId: string, tamperedField: any) => {
    return fetchJson<any>(`/certificates/${certId}/simulate-tamper`, {
      method: 'POST',
      body: JSON.stringify(tamperedField),
    });
  },

  // Audit
  getAuditTrail: (params?: { entity_type?: string; action?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.append('entity_type', params.entity_type);
    if (params?.action) qs.append('action', params.action);
    if (params?.limit) qs.append('limit', String(params.limit));
    return fetchJson<any>(`/audit-trail?${qs.toString()}`);
  },
};
