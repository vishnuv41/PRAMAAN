import { useState, useEffect } from 'react'
import {
  FileUp,
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react'
import Papa from 'papaparse'
import { api, getErrorMessage, ImportJob, ImportRow, ValidationRule } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  SubNav,
  downloadFile,
  isIsoDate,
  formatDateTime,
  Modal,
} from '../components/Common'

const HEADER_ALIASES: Record<string, string[]> = {
  student_ref: ['student_ref', 'student ref', 'student_id', 'student id', 'roll_no', 'roll no', 'registration_number', 'reg_no', 'ref_no'],
  apaar_id: ['apaar_id', 'apaar id', 'apaar', 'apaar_number'],
  full_name: ['full_name', 'student_name', 'student name', 'name', 'candidate_name'],
  institution_id: ['institution_id', 'institution id', 'college_id', 'institute_id', 'inst_id'],
  programme_id: ['programme_id', 'programme id', 'program_id', 'course_id', 'branch_id'],
  academic_year: ['academic_year', 'academic year', 'batch', 'year', 'admission_year'],
  enrolment_start: ['enrolment_start', 'enrolment start', 'start_date', 'admission_date', 'enrolment_date'],
  enrolment_end: ['enrolment_end', 'enrolment end', 'end_date', 'completion_date'],
  enrolment_status: ['enrolment_status', 'enrolment status', 'status'],
  seat_category: ['seat_category', 'seat category', 'category', 'quota'],
  identity_route: ['identity_route', 'identity route', 'auth_route'],
}

function normalizeHeaderName(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(/[\s\-_]+/g, '_')
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (canonical === clean) return canonical
    if (aliases.some((a) => a.toLowerCase().replace(/[\s\-_]+/g, '_') === clean)) {
      return canonical
    }
  }
  return clean
}

export default function ImportsPage() {
  const [activeTab, setActiveTab] = useState('upload')

  // Upload State
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [allParsedRows, setAllParsedRows] = useState<Record<string, string>[]>([])
  const [rowChecks, setRowChecks] = useState<{ line: number; issues: string[] }[]>([])
  const [rowTotal, setRowTotal] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  // Jobs History State
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null)
  const [jobRows, setJobRows] = useState<ImportRow[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  // Rules State
  const [rules, setRules] = useState<ValidationRule[]>([])
  const [testRecord, setTestRecord] = useState({
    student_ref: 'STU-TEST-001',
    apaar_id: '9876-5432-9001',
    institution_id: 'INST-DELHI-DTU',
    programme_id: 'BTECH-CSE',
    academic_year: '2025-2026',
    admission_cycle: 'Regular 2025',
    enrolment_start: '2025-08-01',
    enrolment_end: '',
    enrolment_status: 'Active',
    seat_category: 'General',
  })
  const [testResult, setTestResult] = useState<any>(null)

  const required = [
    'student_ref',
    'apaar_id',
    'institution_id',
    'programme_id',
    'academic_year',
    'admission_cycle',
    'enrolment_start',
    'enrolment_status',
  ]

  const loadJobs = () => {
    setLoadingJobs(true)
    api
      .get<{ items: any[] }>('/students/import-jobs')
      .then((res) => {
        const mapped = (res.data.items || []).map((j: any) => ({
          ...j,
          id: j.import_job_id || j.id,
          accepted_count: j.accepted_rows ?? j.accepted_count ?? 0,
          rejected_count: j.rejected_rows ?? j.rejected_count ?? 0,
          review_count: j.review_rows ?? j.review_count ?? 0,
          created_at: j.uploaded_at ?? j.created_at,
        }))
        setJobs(mapped)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoadingJobs(false))
  }

  const loadRules = () => {
    api
      .get<{ rules: ValidationRule[] }>('/validation/rules')
      .then((res) => setRules(res.data.rules || []))
      .catch((e: unknown) => setError(getErrorMessage(e)))
  }

  useEffect(() => {
    if (activeTab === 'history') loadJobs()
    if (activeTab === 'rules') loadRules()
  }, [activeTab])

  const selectFile = (selected?: File) => {
    setError('')
    setResult(null)
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file. The backend accepts CSV uploads only.')
      return
    }
    setFile(selected)
    Papa.parse<Record<string, string>>(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const rawFields = parsed.meta.fields ?? []
        const headerMap = new Map<string, string>()
        rawFields.forEach((rf) => {
          headerMap.set(rf, normalizeHeaderName(rf))
        })

        // Remap rows to canonical keys regardless of order or alias
        const normalizedData = parsed.data.map((rawRow) => {
          const normRow: Record<string, string> = {}
          for (const [k, v] of Object.entries(rawRow)) {
            const canonicalKey = headerMap.get(k) || k
            normRow[canonicalKey] = v
          }
          if (!normRow.enrolment_status || !normRow.enrolment_status.trim()) {
            normRow.enrolment_status = 'Active'
          }
          if (!normRow.admission_cycle || !normRow.admission_cycle.trim()) {
            normRow.admission_cycle = 'Regular 2025'
          }
          if (!normRow.seat_category || !normRow.seat_category.trim()) {
            normRow.seat_category = 'General'
          }
          if (!normRow.source_submission_id || !normRow.source_submission_id.trim()) {
            normRow.source_submission_id = 'BATCH-CSV-2026'
          }
          if (!normRow.record_version || !normRow.record_version.trim()) {
            normRow.record_version = '1'
          }
          return normRow
        })

        const canonicalHeaders = Array.from(new Set([
          ...rawFields.map((f) => headerMap.get(f) || f),
          'enrolment_status',
          'admission_cycle',
          'seat_category',
        ]))

        const seen = new Map<string, number>()
        const checks = normalizedData.map((row, index) => {
          const issues = required
            .filter((field) => !String(row[field] ?? '').trim())
            .map((field) => `Missing ${field}`)
          if (row.enrolment_start && !isIsoDate(row.enrolment_start)) issues.push('Invalid start date')
          if (row.enrolment_end && !isIsoDate(row.enrolment_end)) issues.push('Invalid end date')
          if (
            isIsoDate(row.enrolment_start) &&
            isIsoDate(row.enrolment_end) &&
            row.enrolment_end < row.enrolment_start
          )
            issues.push('End date precedes start date')
          if (
            row.enrolment_status &&
            !['active', 'completed', 'withdrawn', 'suspended'].includes(
              row.enrolment_status.trim().toLowerCase(),
            )
          )
            issues.push('Unsupported enrolment status')
          const key = ['student_ref', 'institution_id', 'programme_id', 'enrolment_start']
            .map((field) => String(row[field] ?? '').trim())
            .join('|')
          if (seen.has(key)) issues.push(`Duplicate of row ${seen.get(key)}`)
          else seen.set(key, index + 2)
          return { line: index + 2, issues }
        })
        setHeaders(canonicalHeaders)
        setRows(normalizedData.slice(0, 5))
        setAllParsedRows(normalizedData)
        setRowChecks(checks)
        setRowTotal(normalizedData.length)
      },
      error: () => setError('The selected file could not be parsed as CSV.'),
    })
  }

  const downloadSample = async () => {
    try {
      const response = await api.get('/validation/sample-csv-data')
      const data = response.data
      const csv = Papa.unparse([
        data.headers,
        ...data.example_rows.map((row: Record<string, unknown>) =>
          data.headers.map((header: string) => row[header] ?? ''),
        ),
      ])
      downloadFile(csv, 'pramaan-sample.csv', 'text/csv')
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const submit = async () => {
    if (!file || busy) return
    const missing = required.filter((header) => !headers.includes(header))
    if (missing.length) {
      setError(`Required columns missing: ${missing.join(', ')}`)
      return
    }
    if (
      !window.confirm(
        `Submit ${file.name} (${file.size.toLocaleString()} bytes) to the backend for authoritative validation?`,
      )
    )
      return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const body = new FormData()
      if (allParsedRows.length > 0) {
        const canonicalCsv = Papa.unparse(allParsedRows)
        const cleanBlob = new Blob([canonicalCsv], { type: 'text/csv' })
        body.append('file', cleanBlob, file.name)
      } else {
        body.append('file', file)
      }
      const response = await api.post('/students/upload-csv', body)
      setResult(response.data)
      loadJobs()
      window.dispatchEvent(new Event('pramaan:records_updated'))
      window.dispatchEvent(new Event('pramaan:dashboard_refresh'))
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const viewJobDetails = async (job: ImportJob) => {
    setSelectedJob(job)
    try {
      const res = await api.get<{ items: any[] }>(`/students/import-jobs/${job.id}/rows`)
      const mapped = (res.data.items || []).map((r: any) => ({
        id: r.row_result_id || r.id,
        job_id: job.id,
        row_number: r.row_number,
        status: r.outcome || r.status,
        raw_data: r.raw_data || { student_ref: r.record_reference },
        validation_errors: r.validation_errors || (r.validation_messages || []).map((msg: string) => ({
          rule_id: '',
          field: '',
          severity: 'ERROR',
          explanation: msg,
        })),
        created_at: r.created_at || '',
      }))
      setJobRows(mapped)
    } catch {
      setJobRows([])
    }
  }

  const runTestValidation = async () => {
    try {
      const res = await api.post('/validation/test-record', testRecord)
      setTestResult(res.data)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const tabs = [
    { id: 'upload', label: 'CSV Upload & Authoritative Validation' },
    { id: 'history', label: 'Import Job History', count: jobs.length },
    { id: 'rules', label: 'Pre-Ingestion Rule Gates', count: rules.length },
  ]

  return (
    <>
      <PageHeader
        eyebrow="BATCH DATA INGESTION"
        title="CSV Import Center"
        description="Ingest student and enrolment datasets with pre-flight checks, automated rule validation, and transaction rollback tracking."
        action={
          <button className="button-secondary" onClick={() => void downloadSample()}>
            <ArrowDownToLine size={16} /> Sample CSV
          </button>
        }
      />

      <SubNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Upload & Validate */}
      {activeTab === 'upload' && (
        <>
          <div className="import-layout">
            <section className="panel import-main">
              <div
                className={`dropzone ${dragging ? 'dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  selectFile(e.dataTransfer.files[0])
                }}
              >
                <div className="drop-icon">
                  <FileUp size={21} />
                </div>
                <strong>{file ? file.name : 'Drop your student CSV file here'}</strong>
                <p>
                  {file
                    ? `${file.size.toLocaleString()} bytes · ${rowTotal} rows`
                    : 'or browse files from your device'}
                </p>
                <label className="button-secondary browse-button">
                  Browse files
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => selectFile(e.target.files?.[0])}
                  />
                </label>
                <small>CSV format · UTF-8 recommended</small>
              </div>

              {error && (
                <div className="inline-error">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {file && (
                <>
                  <div className="preview-heading">
                    <div>
                      <h2>Preliminary browser pre-flight</h2>
                      <p>Authoritative validation occurs when submitted to the backend engine.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFile(null)
                        setRows([])
                        setHeaders([])
                        setRowChecks([])
                        setRowTotal(0)
                        setResult(null)
                      }}
                    >
                      Clear file
                    </button>
                  </div>

                  <div className="column-chips">
                    {required.map((field) => (
                      <span
                        key={field}
                        className={headers.includes(field) ? 'column-ok' : 'column-missing'}
                      >
                        {headers.includes(field) ? '✓' : '!'} {field}
                      </span>
                    ))}
                  </div>

                  <div className="preflight-stats">
                    <span>
                      Total rows: <b>{rowTotal}</b>
                    </span>
                    <span>
                      Preliminary issues:{' '}
                      <b>{rowChecks.filter((check) => check.issues.length > 0).length}</b>
                    </span>
                    <span>
                      Duplicate candidates:{' '}
                      <b>{rowChecks.filter((check) => check.issues.some((i) => i.startsWith('Duplicate'))).length}</b>
                    </span>
                  </div>

                  {rows.length > 0 && (
                    <div className="table-scroll preview-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Row</th>
                            {headers.slice(0, 5).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                            <th>Preliminary check</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={index}>
                              <td>{index + 2}</td>
                              {headers.slice(0, 5).map((h) => (
                                <td key={h}>{row[h] || '—'}</td>
                              ))}
                              <td>
                                {rowChecks[index]?.issues.length ? (
                                  <span
                                    className="preview-issue"
                                    title={rowChecks[index].issues.join('; ')}
                                  >
                                    Review: {rowChecks[index].issues.join('; ')}
                                  </span>
                                ) : (
                                  <span className="preview-valid">Preliminary pass</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    className="button-primary import-submit"
                    disabled={busy || !file}
                    onClick={() => void submit()}
                  >
                    {busy ? 'Validating on backend...' : 'Submit to backend for authoritative import'}{' '}
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
            </section>

            <aside className="panel import-aside">
              <div className="panel-heading">
                <div>
                  <h2>Ingestion contract</h2>
                  <p>Requirements enforced by backend</p>
                </div>
              </div>
              <div className="contract-list">
                <div>
                  <span className="contract-number">01</span>
                  <p>
                    <strong>Mandatory Attributes</strong>
                    <br />
                    student_ref, apaar_id, institution_id, programme_id, academic_year, enrolment_start, status.
                  </p>
                </div>
                <div>
                  <span className="contract-number">02</span>
                  <p>
                    <strong>Idempotency & Deduplication</strong>
                    <br />
                    Existing enrolments are identified by composite key and recognized rather than duplicated.
                  </p>
                </div>
                <div>
                  <span className="contract-number">03</span>
                  <p>
                    <strong>Transaction Rollback</strong>
                    <br />
                    Critical parsing or database exceptions guarantee complete rollback of affected batch rows.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Import Result Panel */}
          {result && (
            <section className="panel import-result" style={{ marginTop: '22px' }}>
              <div className="result-title">
                <div className="success-mark">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <h2>Backend Authoritative Import Response</h2>
                  <p>{result.message}</p>
                </div>
              </div>

              <div className="result-stats">
                <div>
                  <span>Status</span>
                  <strong style={{ color: result.status === 'COMPLETED' ? '#1B756B' : '#DC2626' }}>
                    {result.status}
                  </strong>
                </div>
                <div>
                  <span>Rows received</span>
                  <strong>{result.total_rows}</strong>
                </div>
                <div>
                  <span>Accepted rows</span>
                  <strong style={{ color: '#1B756B' }}>{result.accepted_count}</strong>
                </div>
                <div>
                  <span>Rejected rows</span>
                  <strong style={{ color: '#DC2626' }}>{result.rejected_count}</strong>
                </div>
              </div>

              {result.field_errors?.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <h3 style={{ fontSize: '15px', marginBottom: '10px' }}>Field-Level Rule Violations</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Record Reference</th>
                          <th>Rule Code</th>
                          <th>Field</th>
                          <th>Severity</th>
                          <th>Explanation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.field_errors.map((err: any, idx: number) => (
                          <tr key={idx}>
                            <td className="mono">{err.record_reference ?? '—'}</td>
                            <td className="mono font-semibold" style={{ color: '#8177F1' }}>{err.rule_id}</td>
                            <td>{err.field}</td>
                            <td>
                              <StatusBadge
                                label={err.severity}
                                tone={err.severity === 'CRITICAL' ? 'red' : 'amber'}
                              />
                            </td>
                            <td>{err.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="text-button"
                    style={{ marginTop: '12px' }}
                    onClick={() =>
                      downloadFile(Papa.unparse(result.field_errors), 'import-errors.csv', 'text/csv')
                    }
                  >
                    Download error report CSV <ArrowDownToLine size={14} />
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Tab 2: Import Job History */}
      {activeTab === 'history' && (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <h2>Historical Ingestion Jobs</h2>
              <p className="subheading">Audited record of all CSV batches processed by the backend engine</p>
            </div>
            <button className="button-secondary" onClick={loadJobs}>
              Refresh history
            </button>
          </div>

          {loadingJobs ? (
            <StateMessage />
          ) : jobs.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Filename</th>
                    <th>Institution</th>
                    <th>Submitted by</th>
                    <th>Status</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th>Review</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="mono font-semibold">{job.id}</td>
                      <td><strong>{job.filename}</strong></td>
                      <td>{job.institution_id}</td>
                      <td>{job.submitted_by || 'Demo Operator'}</td>
                      <td>
                        <StatusBadge
                          label={job.status}
                          tone={
                            job.status === 'COMPLETED'
                              ? 'green'
                              : job.status === 'COMPLETED_WITH_ERRORS'
                              ? 'amber'
                              : 'red'
                          }
                        />
                      </td>
                      <td style={{ color: '#1B756B', fontWeight: 600 }}>{job.accepted_count}</td>
                      <td style={{ color: '#DC2626', fontWeight: 600 }}>{job.rejected_count}</td>
                      <td>{job.review_count}</td>
                      <td>{formatDateTime(job.created_at)}</td>
                      <td>
                        <button
                          className="button-small button-outline"
                          onClick={() => viewJobDetails(job)}
                        >
                          Inspect rows
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No past jobs recorded"
              message="No batch CSV ingestion jobs have been logged in the sentinel database yet."
            />
          )}
        </section>
      )}

      {/* Tab 3: Pre-Ingestion Rule Gates */}
      {activeTab === 'rules' && (
        <>
          <section className="panel" style={{ padding: '24px', marginBottom: '22px' }}>
            <div className="panel-heading" style={{ marginBottom: '18px' }}>
              <div>
                <h2>Automated Rule Gate Specifications</h2>
                <p>10 authoritative criteria checked before any record is committed to the database</p>
              </div>
              <a
                className="button-secondary"
                href="/api/v1/validation/export-errors-csv"
                target="_blank"
                rel="noreferrer"
              >
                <ArrowDownToLine size={15} /> Export Diagnostics CSV
              </a>
            </div>

            <div className="rule-gate-grid">
              {rules.map((rule) => (
                <div className="rule-gate-card" key={rule.rule_id}>
                  <div className="rule-gate-top">
                    <span className="rule-id-badge">{rule.rule_id}</span>
                    <StatusBadge
                      label={rule.severity}
                      tone={rule.severity === 'CRITICAL' ? 'red' : rule.severity === 'ERROR' ? 'amber' : 'blue'}
                    />
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{rule.name}</strong>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                    {rule.description}
                  </p>
                  <span style={{ fontSize: '11px', color: '#6b7aa3', marginTop: 'auto', fontWeight: 600 }}>
                    Scope: {rule.scope}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Single-Record Tester */}
          <section className="panel" style={{ padding: '24px' }}>
            <div className="panel-heading" style={{ marginBottom: '16px' }}>
              <div>
                <h2>Interactive Rule Gate Sandbox</h2>
                <p>Submit a test payload to evaluate authoritative rule gates without writing to the database</p>
              </div>
              <button className="button-primary" onClick={runTestValidation}>
                Run Validation Test <ArrowRight size={15} />
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Student Reference</label>
                <input
                  value={testRecord.student_ref}
                  onChange={(e) => setTestRecord({ ...testRecord, student_ref: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>APAAR ID</label>
                <input
                  value={testRecord.apaar_id}
                  onChange={(e) => setTestRecord({ ...testRecord, apaar_id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Institution ID</label>
                <input
                  value={testRecord.institution_id}
                  onChange={(e) => setTestRecord({ ...testRecord, institution_id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Programme ID</label>
                <input
                  value={testRecord.programme_id}
                  onChange={(e) => setTestRecord({ ...testRecord, programme_id: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  value={testRecord.enrolment_start}
                  onChange={(e) => setTestRecord({ ...testRecord, enrolment_start: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={testRecord.enrolment_status}
                  onChange={(e) => setTestRecord({ ...testRecord, enrolment_status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Withdrawn">Withdrawn</option>
                  <option value="Suspended">Suspended</option>
                  <option value="InvalidStatus">Invalid (Test Rule)</option>
                </select>
              </div>
            </div>

            {testResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <StatusBadge
                    label={
                      testResult.is_valid ?? testResult.valid ?? testResult.status === 'PASS'
                        ? 'VALIDATION PASSED'
                        : 'VALIDATION REJECTED'
                    }
                    tone={
                      testResult.is_valid ?? testResult.valid ?? testResult.status === 'PASS'
                        ? 'green'
                        : 'red'
                    }
                  />
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Errors / Warnings: {testResult.errors?.length || 0}
                  </span>
                </div>
                {testResult.errors?.length > 0 && (
                  <pre className="code-preview">{JSON.stringify(testResult.errors, null, 2)}</pre>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal
          title={`Job: ${selectedJob.id}`}
          subtitle={`File: ${selectedJob.filename} · Institution: ${selectedJob.institution_id}`}
          onClose={() => setSelectedJob(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '10px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>STATUS</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>{selectedJob.status}</strong>
            </div>
            <div style={{ padding: '10px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>TOTAL ROWS</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>{selectedJob.total_rows}</strong>
            </div>
            <div style={{ padding: '10px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>ACCEPTED</span>
              <strong style={{ display: 'block', fontSize: '14px', color: '#1B756B' }}>
                {selectedJob.accepted_count}
              </strong>
            </div>
            <div style={{ padding: '10px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>REJECTED</span>
              <strong style={{ display: 'block', fontSize: '14px', color: '#DC2626' }}>
                {selectedJob.rejected_count}
              </strong>
            </div>
          </div>

          {jobRows.length ? (
            <div className="table-scroll" style={{ maxHeight: '350px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Status</th>
                    <th>Student Ref</th>
                    <th>APAAR ID</th>
                    <th>Validation issues</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.row_number}</td>
                      <td>
                        <StatusBadge
                          label={r.status || r.outcome || 'UNKNOWN'}
                          tone={(r.status || r.outcome) === 'ACCEPTED' ? 'green' : 'red'}
                        />
                      </td>
                      <td className="mono">{r.raw_data?.student_ref || '—'}</td>
                      <td className="mono">{r.raw_data?.apaar_id || '—'}</td>
                      <td style={{ fontSize: '12px', color: r.validation_errors?.length ? '#DC2626' : 'var(--muted)' }}>
                        {r.validation_errors?.length
                          ? r.validation_errors.map((e) => e.explanation).join('; ')
                          : 'None (passed all gates)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', textAlign: 'center', margin: '20px 0' }}>
              No individual row diagnostics were recorded for this job.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
