import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileUp,
  ArrowRight,
} from 'lucide-react'
import { api, getErrorMessage, InstitutionDashboardSummary } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  MetricCard,
  StatusBadge,
  maskId,
} from '../components/Common'

export default function InstitutionDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sessionUser = (() => {
    try {
      const raw = sessionStorage.getItem('pramaan_session_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const activeInstId = searchParams.get('institution') || searchParams.get('institution_id') || sessionUser?.institution_id || ''
  const [data, setData] = useState<InstitutionDashboardSummary | null>(null)
  const [selectedInst, setSelectedInst] = useState(activeInstId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    const params: Record<string, string> = {}
    if (selectedInst) params.institution_id = selectedInst
    api
      .get<InstitutionDashboardSummary>('/institution/dashboard-summary', { params })
      .then((res) => setData(res.data))
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [selectedInst])

  useEffect(() => {
    window.addEventListener('pramaan:records_updated', load)
    return () => window.removeEventListener('pramaan:records_updated', load)
  }, [selectedInst])

  return (
    <>
      <PageHeader
        eyebrow="INSTITUTION REGISTRAR DASHBOARD"
        title={data?.institution_name || 'Institution Registrar Console'}
        description={`Campus Scope: ${data?.institution_id || 'Institutional Registry'} · Academic Year: ${data?.academic_year || '2025-2026'}`}
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {sessionUser?.role !== 'institution_officer' && (
              <select
                aria-label="Select Campus Scope"
                value={selectedInst}
                onChange={(e) => {
                  setSelectedInst(e.target.value)
                  if (e.target.value) {
                    setSearchParams({ institution_id: e.target.value })
                  } else {
                    setSearchParams({})
                  }
                }}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--workspace)' }}
              >
                <option value="">Default Campus</option>
                <option value="INST-CHENNAI-SJC">St. Joseph's College of Engineering (SJC)</option>
                <option value="INST-DELHI-DTU">DTU Delhi</option>
                <option value="INST-DELHI-IIITD">IIIT Delhi</option>
                <option value="INST-PUNE-COEP">COEP Tech Univ</option>
                <option value="INST-DELHI-NSUT">NSUT Delhi</option>
                <option value="INST-TRICHY-NITT">NIT Trichy</option>
                <option value="INST-MUMBAI-IITB">IIT Bombay External</option>
              </select>
            )}
            <Link to="/imports" className="button-secondary">
              <FileUp size={15} /> Batch CSV Upload
            </Link>
            <Link to="/students" className="button-primary">
              <Users size={15} /> Enrolled Students
            </Link>
          </div>
        }
      />

      {error ? (
        <StateMessage error={error} retry={load} />
      ) : loading ? (
        <StateMessage />
      ) : data ? (
        <>
          {/* Institution High-Level KPIs */}
          <div className="metric-grid">
            <MetricCard
              label="Campus Enrolments"
              value={data.total_enrolments}
              caption={`${data.active_students} Active · ${data.completed_students} Graduated · ${data.withdrawn_students} Withdrawn`}
              icon={Users}
              tone="blue"
            />
            <MetricCard
              label="Intake Utilization"
              value={`${data.overall_capacity_utilization}%`}
              caption={`${data.total_new_admitted} admitted of ${data.total_sanctioned_intake} sanctioned seats`}
              icon={Building2}
              tone={data.overall_capacity_utilization > 100 ? 'red' : 'green'}
            />
            <MetricCard
              label="Integrity Signals"
              value={data.open_integrity_signals}
              caption="Open or under-review temporal overlap cases"
              icon={AlertTriangle}
              tone={data.open_integrity_signals > 0 ? 'amber' : 'green'}
            />
            <MetricCard
              label="BGV Consent Coverage"
              value={data.consent_coverage_count}
              caption="Active third-party background verification authorizations"
              icon={ShieldCheck}
              tone="green"
            />
          </div>

          {/* Sanctioned Programmes & Intake Utilization */}
          <section className="panel" style={{ padding: '24px', marginBottom: '22px' }}>
            <div className="panel-heading" style={{ marginBottom: '16px' }}>
              <div>
                <h2>AICTE Sanctioned Capacity & Programme Utilization</h2>
                <p>Campus programmes monitored against AICTE Approval Process Handbook (APH) limits</p>
              </div>
              <Link to="/intake" className="button-small button-outline">
                All Quotas <ArrowRight size={13} />
              </Link>
            </div>

            {data.programmes.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Programme Code</th>
                      <th>Programme Name</th>
                      <th>Sanctioned Seats</th>
                      <th>Admitted Students</th>
                      <th>Utilization %</th>
                      <th>Supernumerary</th>
                      <th>NRI Quota</th>
                      <th>Compliance State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.programmes.map((p) => {
                      const isOver = p.utilization_pct > 100
                      return (
                        <tr key={p.programme_id}>
                          <td className="mono font-semibold">{p.programme_id}</td>
                          <td><strong>{p.programme_name}</strong></td>
                          <td className="mono">{p.approved_seats}</td>
                          <td className="mono font-semibold">{p.admitted_seats}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, minWidth: '60px', height: '6px', background: 'var(--workspace)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(p.utilization_pct, 100)}%`,
                                    background: isOver ? 'var(--red-600)' : 'var(--teal-500)',
                                    borderRadius: '3px',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: isOver ? 'var(--red-600)' : 'var(--text)' }}>
                                {p.utilization_pct}%
                              </span>
                            </div>
                          </td>
                          <td className="mono">{p.supernumerary_quota ?? '—'}</td>
                          <td className="mono">{p.nri_quota ?? '—'}</td>
                          <td>
                            <StatusBadge
                              label={isOver ? 'EXCESS OVER-ADMISSION' : 'WITHIN QUOTA'}
                              tone={isOver ? 'red' : 'green'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No programme intake records"
                message="No AICTE capacity rules are currently assigned to this institution."
              />
            )}
          </section>

          {/* Recent Campus Integrity Alerts */}
          <section className="panel" style={{ padding: '24px' }}>
            <div className="panel-heading" style={{ marginBottom: '16px' }}>
              <div>
                <h2>Recent Campus Integrity Signals</h2>
                <p>Temporal overlap conflicts involving this college's students</p>
              </div>
              <Link to="/reviews" className="button-small button-outline">
                Review Queue <ArrowRight size={13} />
              </Link>
            </div>

            {data.recent_alerts.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Alert ID</th>
                      <th>Student Reference</th>
                      <th>Masked APAAR ID</th>
                      <th>Investigation Title</th>
                      <th>Severity</th>
                      <th>Case Status</th>
                      <th>Adjudication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td className="mono font-semibold">{alert.id}</td>
                        <td className="mono">
                          <Link className="table-link" to={`/students/${alert.student_ref}`}>
                            {alert.student_ref}
                          </Link>
                        </td>
                        <td className="mono">{maskId(alert.apaar_id)}</td>
                        <td>{alert.title}</td>
                        <td>
                          <StatusBadge
                            label={alert.severity}
                            tone={
                              alert.severity === 'HIGH'
                                ? 'red'
                                : alert.severity === 'MEDIUM'
                                ? 'amber'
                                : 'blue'
                            }
                          />
                        </td>
                        <td>
                          <span className={`status-pill ${(alert.status || '').toLowerCase()}`}>
                            {alert.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                          {alert.reviewer_decision || 'Pending Review'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Zero active alerts"
                message="No unresolved temporal enrolment conflicts detected for this institution."
              />
            )}
          </section>
        </>
      ) : null}
    </>
  )
}
