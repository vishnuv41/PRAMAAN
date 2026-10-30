import axios from 'axios'

const envBaseUrl = import.meta.env.VITE_API_BASE_URL
const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
export const baseURL = envBaseUrl && envBaseUrl !== '/api/v1'
  ? envBaseUrl
  : (isVercel ? 'https://pramaan-ie7p.vercel.app/api/v1' : (envBaseUrl || '/api/v1'))

export const api = axios.create({
  baseURL,
  timeout: 20000,
  withCredentials: true,
})

// Authentication Token & Persona Management
let inMemoryToken: string | null = null

export function getAuthToken(): string | null {
  return inMemoryToken || sessionStorage.getItem('pramaan_session_token') || null
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token
  if (token) {
    sessionStorage.setItem('pramaan_session_token', token)
  } else {
    sessionStorage.removeItem('pramaan_session_token')
  }
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      const token = getAuthToken()
      if (token) {
        // Fire event only when a protected request genuinely receives 401 with a token present
        window.dispatchEvent(new CustomEvent('pramaan:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'The API could not be reached. Check that the backend is running.'
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
    if (error.response.status === 401) return 'Authentication is required or the bearer credential is invalid.'
    if (error.response.status === 403) return 'You do not have permission to perform this action.'
    if (error.response.status === 404) return 'The requested record was not found.'
    if (error.response.status === 409) return 'The request conflicts with current server state. Refresh and try again.'
    if (error.response.status === 422) return 'The submitted data did not match the API schema.'
    return `The API returned an error (${error.response.status}).`
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

/* ==================== Domain Models ==================== */

export interface DashboardSummary {
  total_students: number
  total_institutions: number
  open_alerts: number
  records_requiring_review: number
  validation_pass_rate: number
  potential_conflicts_count: number
  alert_severity_distribution: Record<string, number>
  enrolment_trends: { academic_year: string; total_enrolments: number; active: number; completed: number; withdrawn: number }[]
  recent_activity: { id: number; entity_type: string; entity_id: string; action: string; performed_by: string; timestamp: string | null; details: Record<string, unknown> | null }[]
  programme_admissions_vs_intake: { institution_id: string; institution_name: string; programme_name: string; academic_year: string; approved_intake: number; new_admitted: number; utilization_pct: number }[]
}

export interface AicteSummary {
  officer_role: string
  jurisdiction: string
  total_institutions: number
  total_students: number
  total_enrolments: number
  open_investigations: number
  resolved_investigations: number
  critical_temporal_conflicts: number
  non_compliant_colleges: number
  pending_reviews_by_severity: Record<string, number>
  excess_intake_colleges: any[]
  duplicate_enrolment_cases: any[]
  monthly_summary: { month: string; new_admissions: number; alerts_triggered: number; resolved_cases: number; imports_completed: number }[]
}

export interface InstitutionDashboardSummary {
  institution_id: string
  institution_name: string
  academic_year: string
  total_enrolments: number
  active_students: number
  completed_students: number
  withdrawn_students: number
  total_sanctioned_intake: number
  total_new_admitted: number
  overall_capacity_utilization: number
  open_integrity_signals: number
  consent_coverage_count: number
  programmes: {
    programme_id: string
    programme_name: string
    approved_seats: number
    admitted_seats: number
    supernumerary_quota: number
    nri_quota: number
    utilization_pct: number
  }[]
  recent_alerts: {
    id: string
    student_ref: string
    apaar_id: string
    title: string
    severity: string
    status: string
    reviewer_decision: string | null
  }[]
}

export interface Student {
  student_ref: string
  apaar_id: string
  full_name: string
  primary_institution_id: string | null
  identity_route: string
  nationality: string
  enrolment_count: number
  open_alerts_count: number
  created_at?: string
}

export interface StudentTimeline {
  student_ref: string
  apaar_id: string
  full_name: string
  enrolments: {
    id: number
    institution_id: string
    institution_name: string
    programme_id: string
    programme_name: string
    academic_year: string
    admission_cycle: string
    enrolment_start: string
    enrolment_end: string | null
    enrolment_status: string
    seat_category: string
    exception_ref?: string | null
    source_submission_id?: string | null
    record_version: number
  }[]
  temporal_intervals: {
    enrolment_id: number
    start: string
    end: string | null
    status: string
    has_conflict: boolean
    conflict_type?: string
  }[]
}

export interface StudentVersion {
  id: number
  student_ref: string
  version_number: number
  changed_fields: Record<string, any>
  created_at: string
  created_by: string
}

export interface Enrolment {
  id: number
  student_ref: string
  apaar_id: string
  institution_id: string
  institution_name: string
  programme_id: string
  programme_name: string
  academic_year: string
  admission_cycle: string
  enrolment_start: string
  enrolment_end: string | null
  enrolment_status: string
  seat_category: string
  exception_ref?: string | null
  source_submission_id?: string | null
  record_version: number
  created_at?: string
}

export interface Alert {
  id: string
  student_ref: string
  alert_type: string
  severity: string
  status: string
  title: string
  explanation: string
  evidence_summary: Record<string, any> | null
  confidence_score: number | null
  supporting_record_ids: number[] | null
  reviewer_decision: string | null
  reviewer_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
}

export interface AlertHistory {
  id: number
  alert_id: string
  action: string
  previous_status: string | null
  new_status: string | null
  decision: string | null
  notes: string | null
  note?: string | null
  /** Backend returns 'actor'; frontend previously expected 'performed_by' */
  actor?: string
  performed_by?: string
  assigned_to?: string | null
  resolution_reason?: string | null
  evidence_references?: string[]
  created_at: string
}

export interface ImportJob {
  /** Backend field – primary key returned as import_job_id in list responses */
  id: string
  institution_id: string
  /** Backend field: original_filename, mapped via adapter in ImportsPage */
  filename?: string
  original_filename?: string
  status: string
  total_rows: number
  /** Backend field: accepted_rows */
  accepted_rows?: number
  accepted_count?: number
  /** Backend field: rejected_rows */
  rejected_rows?: number
  rejected_count?: number
  /** Backend field: review_rows */
  review_rows?: number
  review_count?: number
  submitted_by?: string
  /** Backend field: uploaded_at */
  uploaded_at?: string
  created_at?: string
  completed_at?: string | null
  safe_error_summary?: string | null
  error_summary?: string | null
  pass_rate_percent?: number
}

export interface ImportRow {
  id: number
  /** Backend field: import_job_id */
  import_job_id?: string
  job_id?: string
  row_number: number
  /** Backend field: outcome (ACCEPTED / REJECTED / NEEDS_REVIEW) */
  outcome?: string
  status?: string
  /** Backend field: record_reference */
  record_reference?: string | null
  raw_data?: Record<string, any>
  /** Backend field: validation_messages (array of strings) */
  validation_messages?: any[]
  validation_errors?: { rule_id: string; field: string; severity: string; explanation: string }[]
  issue_codes?: string[]
  created_at: string
}

export interface IntakeComplianceReport {
  institution_id: string
  institution_name?: string
  programme_id: string
  programme_name?: string
  academic_year: string
  admission_cycle: string
  rule_id?: string
  rule_source?: string
  effective_date?: string
  compliance_status: string
  approved_intake: number | null
  supernumerary_quota?: number | null
  nri_quota?: number | null
  new_admissions_count: number | null
  regular_admitted?: number | null
  supernumerary_admitted?: number | null
  nri_admitted?: number | null
  utilization_pct: number | null
  utilization_defined?: boolean
  category_breakdown?: Record<string, number>
  explanation?: string
  summary?: string
}

export interface AnomalyItem {
  id: number
  institution_id: string
  institution_name?: string
  programme_id: string
  programme_name?: string
  academic_year: string
  admitted_count: number
  approved_intake?: number | null
  pct_change?: number | null
  z_score?: number | null
  explanation?: string
  dismissed: boolean
  dismissal_reason?: string | null
}

export interface CertificateItem {
  certificate_id: string
  student_ref: string
  student_name: string
  apaar_id: string
  institution_name: string
  institution_id: string
  programme_name: string
  programme_id: string
  issue_date: string
  completion_date?: string | null
  status: string
  signature_algorithm?: string
  is_tampered?: boolean
}

export interface AuditItem {
  id: number
  entity_type: string
  entity_id: string
  action: string
  performed_by: string
  timestamp: string | null
  details: Record<string, any> | null
}

export interface ValidationRule {
  rule_id: string
  name: string
  severity: string
  description: string
  scope: string
}

export interface VerifierOrg {
  id: string
  org_name: string
  org_type: string
  is_approved: boolean
  contact_email: string
}

export interface VerificationLog {
  id: number
  verifier_org_id: string
  verifier_org_name: string
  query_student_ref: string | null
  query_apaar_id: string | null
  certificate_id: string | null
  verification_outcome: string
  timestamp: string | null
  details?: Record<string, any> | null
}

export interface ConsentRecord {
  id: number
  student_ref: string
  purpose: string
  /** Returned by backend as data_scope */
  data_scope?: string | null
  /** Backend field – true = ACTIVE, false = WITHDRAWN */
  consent_granted: boolean
  status: string
  granted_at: string
  withdrawn_at?: string | null
}

export interface ExecutiveReport {
  generated_at: string
  filters: Record<string, any>
  total_pending_reviews: number
  pendency_by_severity: Record<string, number>
  pending_cases?: any[]
  enrolment_summary: {
    enrolment_records: number
    distinct_students: number
    records_by_status: Record<string, number>
  }
  import_summary?: {
    jobs: number
    total_rows: number
    accepted_rows: number
    rejected_rows: number
    review_rows: number
    outcomes: Record<string, number>
    validation_issue_counts: Record<string, number>
  }
  import_validation_issues?: any[]
  intake_compliance_results: IntakeComplianceReport[]
  excess_intake_colleges?: any[]
  duplicate_enrolment_cases: any[]
  monthly_summary: { month: string; new_admissions: number; alerts_triggered: number; resolved_cases: number; imports_completed: number }[]
}

export interface ApiPage<T> {
  items: T[]
  total: number
  page?: number
  limit?: number
  total_pages?: number
}
