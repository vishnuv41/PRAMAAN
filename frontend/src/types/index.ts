export interface Student {
  student_ref: string;
  apaar_id: string;
  full_name: string;
  primary_institution_id?: string;
  identity_route?: string;
  nationality?: string;
  passport_ref?: string;
  is_foreign_national?: boolean;
  is_nri?: boolean;
  is_oci?: boolean;
  enrolment_count?: number;
  open_alerts_count?: number;
  created_at?: string;
}

export interface Enrolment {
  id: number;
  student_ref: string;
  apaar_id: string;
  institution_id: string;
  institution_name?: string;
  programme_id: string;
  programme_name?: string;
  academic_year: string;
  admission_cycle: string;
  enrolment_start: string;
  enrolment_end?: string | null;
  enrolment_status: 'Active' | 'Completed' | 'Withdrawn' | 'Suspended';
  seat_category: string;
  exception_ref?: string | null;
  source_submission_id: string;
  record_version: number;
  created_at?: string;
}

export interface Alert {
  id: string;
  student_ref: string;
  apaar_id: string;
  alert_type: 'TEMPORAL_OVERLAP_CONFLICT' | 'EXCEPTION_REVIEW_REQUIRED' | 'DUPLICATE_SUBMISSION' | 'INTAKE_ANOMALY';
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  title: string;
  explanation: string;
  evidence_summary?: any;
  confidence_score?: number | null;
  supporting_record_ids?: number[];
  exception_ref?: string | null;
  reviewer_decision?: string | null;
  reviewer_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
}

export interface DashboardSummary {
  total_students: number;
  total_institutions: number;
  open_alerts: number;
  records_requiring_review: number;
  validation_pass_rate: number;
  potential_conflicts_count: number;
  alert_severity_distribution: Record<string, number>;
  enrolment_trends: {
    academic_year: string;
    total_enrolments: number;
    active: number;
    completed: number;
    withdrawn: number;
  }[];
  recent_activity: {
    id: number;
    entity_type: string;
    entity_id: string;
    action: string;
    performed_by: string;
    timestamp: string;
    details?: any;
  }[];
  programme_admissions_vs_intake: {
    institution_id: string;
    institution_name: string;
    programme_name: string;
    academic_year: string;
    approved_intake: number;
    new_admitted: number;
    utilization_pct: number;
  }[];
}

export interface IntakeReport {
  institution_id: string;
  institution_name: string;
  programme_id: string;
  programme_name: string;
  academic_year: string;
  admission_cycle: string;
  rule_id: string;
  rule_source: string;
  effective_date: string;
  compliance_status: string;
  approved_intake: number;
  supernumerary_quota: number;
  nri_quota: number;
  new_admissions_count: number;
  regular_admitted: number;
  supernumerary_admitted: number;
  nri_admitted: number;
  total_active_all_cohorts: number;
  utilization_pct: number;
  category_breakdown: Record<string, number>;
  explanation: string;
  details?: string;
}

export interface CertificateRecord {
  certificate_id: string;
  student_ref: string;
  apaar_id: string;
  student_name: string;
  institution_id?: string;
  institution_name: string;
  programme_name: string;
  issue_date: string;
  completion_date?: string;
  status: 'VALID' | 'REVOKED';
  signature_algorithm: string;
  signature_hex?: string;
  public_key_id?: string;
  payload?: any;
}
