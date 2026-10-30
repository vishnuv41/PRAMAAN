import { useState, useEffect } from 'react'
import {
  FileText,
  ArrowDownToLine,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { api, getErrorMessage, ExecutiveReport } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  formatDateTime,
} from '../components/Common'

export default function ReportsPage() {
  const [report, setReport] = useState<ExecutiveReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api
      .get<ExecutiveReport>('/reports/executive-summary')
      .then((res) => setReport(res.data))
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const exportExecutiveCsv = async () => {
    try {
      const res = await api.get('/reports/executive-summary/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'apaar_sentinel_executive_report.csv'
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: unknown) { alert(getErrorMessage(e)) }
  }

  const exportValidationDiagnosticsCsv = async () => {
    try {
      const res = await api.get('/validation/export-errors-csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'apaar_sentinel_ingestion_diagnostics.csv'
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: unknown) { alert(getErrorMessage(e)) }
  }

  return (
    <>
      <PageHeader
        eyebrow="REGULATORY OVERSIGHT"
        title="Executive Reports and Analytics"
        description="Authoritative regulatory intelligence derived from live database snapshots, intake compliance audits, and temporal conflict investigations."
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="button-secondary" onClick={exportValidationDiagnosticsCsv}>
              <ArrowDownToLine size={15} /> Ingestion Diagnostics CSV
            </button>
            <button className="button-primary" onClick={exportExecutiveCsv}>
              <ArrowDownToLine size={15} /> Export Executive Report CSV
            </button>
          </div>
        }
      />

      {error ? (
        <StateMessage error={error} retry={load} />
      ) : loading ? (
        <StateMessage />
      ) : report ? (
        <>
          {/* Summary KPIs */}
          <div className="metric-grid">
            <MetricCard
              label="Monitored Enrolments"
              value={report.enrolment_summary.enrolment_records}
              caption={`${report.enrolment_summary.distinct_students} unique student references`}
              icon={FileText}
              tone="blue"
            />
            <MetricCard
              label="Active Student Records"
              value={report.enrolment_summary.records_by_status.Active || 0}
              caption="Currently attending participating colleges"
              icon={CheckCircle2}
              tone="green"
            />
            <MetricCard
              label="Pending Case Reviews"
              value={report.total_pending_reviews}
              caption="High-priority investigations requiring signoff"
              icon={AlertTriangle}
              tone={report.total_pending_reviews > 0 ? 'amber' : 'green'}
            />
            <MetricCard
              label="Generated Timestamp"
              value={formatDateTime(report.generated_at)}
              caption="Directly compiled from SQLite sentinel database"
              icon={Calendar}
              tone="slate"
            />
          </div>

          {/* Enrolment Status Breakdown & Intake Overview */}
          <div className="chart-grid">
            <section className="panel" style={{ padding: '24px' }}>
              <div className="panel-heading" style={{ marginBottom: '16px' }}>
                <div>
                  <h2>Enrolment Status Distribution</h2>
                  <p>Aggregate counts by state transition model</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {Object.entries(report.enrolment_summary.records_by_status).map(([status, count]) => (
                  <div
                    key={status}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'var(--workspace)',
                      border: '1px solid var(--line)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', textTransform: 'uppercase' }}>
                      {status}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel" style={{ padding: '24px' }}>
              <div className="panel-heading" style={{ marginBottom: '16px' }}>
                <div>
                  <h2>Monthly Sentinel Ingestion Trends</h2>
                  <p>Admissions, alert triggers, and adjudications</p>
                </div>
              </div>

              {report.monthly_summary?.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Reporting Month</th>
                        <th>New Admissions</th>
                        <th>Alerts Triggered</th>
                        <th>Resolved Cases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.monthly_summary.map((m, i) => (
                        <tr key={i}>
                          <td className="mono font-semibold">{m.month}</td>
                          <td style={{ color: '#1B756B', fontWeight: 600 }}>{m.new_admissions}</td>
                          <td>
                            <span className="status-badge amber">{m.alerts_triggered}</span>
                          </td>
                          <td>
                            <span className="status-badge green">{m.resolved_cases}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No monthly trends" message="Monthly aggregation data is accumulating." />
              )}
            </section>
          </div>

          {/* Duplicate Enrolment Cases */}
          {report.duplicate_enrolment_cases?.length > 0 && (
            <section className="panel table-panel" style={{ marginTop: '22px' }}>
              <div className="panel-heading" style={{ padding: '0 0 16px' }}>
                <div>
                  <h2>Flagged Duplicate & Conflict Findings</h2>
                  <p>Investigative cases identified across institution enrolment intervals</p>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Alert ID</th>
                      <th>Student Ref</th>
                      <th>Masked APAAR ID</th>
                      <th>Investigation Title</th>
                      <th>Severity</th>
                      <th>Adjudication Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.duplicate_enrolment_cases.map((c: any) => (
                      <tr key={c.alert_id}>
                        <td className="mono font-semibold">{c.alert_id}</td>
                        <td className="mono">{c.student_ref}</td>
                        <td className="mono">{c.apaar_id}</td>
                        <td style={{ maxWidth: '320px', whiteSpace: 'normal', fontSize: '13px' }}>
                          <strong>{c.title}</strong>
                        </td>
                        <td>
                          <StatusBadge
                            label={c.severity}
                            tone={c.severity === 'HIGH' ? 'red' : c.severity === 'MEDIUM' ? 'amber' : 'blue'}
                          />
                        </td>
                        <td>
                          <span className="mono font-semibold" style={{ color: '#1B756B' }}>
                            {c.decision || 'Pending Decision'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : null}
    </>
  )
}
