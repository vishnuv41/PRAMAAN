import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  FileUp,
  Activity,
  Layers,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell as ChartCell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, getErrorMessage, DashboardSummary, AicteSummary } from '../api'
import { PageHeader, StateMessage, EmptyState, MetricCard, formatDateTime, tooltipStyle } from '../components/Common'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [aicte, setAicte] = useState<AicteSummary | null>(null)
  const [certCount, setCertCount] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    Promise.all([
      api.get<DashboardSummary>('/dashboard/summary'),
      api.get<AicteSummary>('/aicte/dashboard-summary'),
      api.get<{ items: unknown[] }>('/certificates'),
    ])
      .then(([dashboardRes, aicteRes, certsRes]) => {
        setSummary(dashboardRes.data)
        setAicte(aicteRes.data)
        setCertCount(certsRes.data.items.length)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
  }

  useEffect(() => {
    load()
    window.addEventListener('pramaan:records_updated', load)
    window.addEventListener('pramaan:dashboard_refresh', load)
    return () => {
      window.removeEventListener('pramaan:records_updated', load)
      window.removeEventListener('pramaan:dashboard_refresh', load)
    }
  }, [])

  if (error || !summary) {
    return (
      <>
        <PageHeader
          eyebrow="OVERVIEW"
          title="Student Enrolment Overview"
          description="Monitor record quality, enrolment integrity, and verification activity."
        />
        {error ? <StateMessage error={error} retry={load} /> : <StateMessage />}
      </>
    )
  }

  const severityColors: Record<string, string> = {
    HIGH: '#e5484d',
    MEDIUM: '#f0a53a',
    LOW: '#4f5fe0',
    INFORMATIONAL: '#2dc4aa',
  }

  const integrityData = Object.entries(summary.alert_severity_distribution)
    .map(([name, value]) => ({ name, value, color: severityColors[name] ?? '#8b98a8' }))
    .filter((entry) => entry.value > 0)

  return (
    <>
      <PageHeader
        eyebrow="AICTE INSTITUTIONAL GOVERNANCE"
        title="Student Enrolment Overview"
        description="Monitor verified student records, temporal enrolment integrity, capacity compliance, and cryptographic audit trails."
        action={
          <div className="date-chip">
            <span className="live-indicator" /> LIVE DATABASE
          </div>
        }
      />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">
            <ShieldCheck size={14} /> Integrity monitoring active
          </span>
          <h2>
            Every enrolment, <em>verified</em> once.
          </h2>
          <p>
            PRAMAAN cross-checks student timelines across institutions, flags overlaps for human
            review, tracks AICTE-sanctioned capacity, and maintains an immutable audit trail.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" to="/reviews">
              Open review queue <ArrowRight size={16} />
            </Link>
            <Link className="hero-ghost" to="/imports">
              <FileUp size={16} /> Import CSV
            </Link>
            <Link className="hero-ghost" to="/reports">
              <Layers size={16} /> Executive Reports
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{summary.total_students.toLocaleString()}</strong>
            <span>students</span>
          </div>
          <div>
            <strong>{summary.total_institutions.toLocaleString()}</strong>
            <span>institutions</span>
          </div>
          <div>
            <strong>{aicte?.critical_temporal_conflicts ?? summary.open_alerts}</strong>
            <span>conflicts flagged</span>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <div className="metric-grid">
        <MetricCard
          label="Student records"
          value={summary.total_students.toLocaleString()}
          caption={`${summary.total_institutions.toLocaleString()} institutions represented`}
          icon={Users}
        />
        <MetricCard
          label="Validation pass rate"
          value={`${summary.validation_pass_rate}%`}
          caption="Pre-ingestion schema & temporal rule pass rate"
          icon={BadgeCheck}
          tone="green"
        />
        <MetricCard
          label="Cases requiring review"
          value={summary.records_requiring_review.toLocaleString()}
          caption={`${summary.open_alerts} open or under review`}
          icon={ClipboardList}
          tone="amber"
        />
        <MetricCard
          label="Certificates on file"
          value={certCount ?? '—'}
          caption="Cryptographic credentials in sentinel ledger"
          icon={FileCheck2}
          tone="slate"
        />
      </div>

      {/* Charts Grid */}
      <div className="chart-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Enrolment activity</h2>
              <p>Records grouped by academic year</p>
            </div>
            <span className="chart-legend">
              <i className="legend-dot blue-dot" /> Total enrolments
            </span>
          </div>
          {summary.enrolment_trends.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={summary.enrolment_trends}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="enrolmentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#12a58e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#12a58e" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e9edf6" strokeDasharray="3 4" vertical={false} />
                  <XAxis
                    dataKey="academic_year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#7a859e', fontSize: 12 }}
                  />
                  <YAxis
                    width={48}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#7a859e', fontSize: 12 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#B8D6CC' }} />
                  <Area
                    type="monotone"
                    dataKey="total_enrolments"
                    name="Total enrolments"
                    stroke="#0b8773"
                    strokeWidth={3}
                    fill="url(#enrolmentFill)"
                    activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No enrolment history"
              message="The API has not returned trend records yet."
            />
          )}
        </section>

        <section className="panel chart-panel integrity-panel">
          <div className="panel-heading">
            <div>
              <h2>Alert severity</h2>
              <p>Severity distribution across current alert signals</p>
            </div>
            <Link className="subtle-link" to="/reviews">
              Review Queue <ArrowRight size={14} />
            </Link>
          </div>
          <div className="donut-wrap">
            {integrityData.length ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={integrityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={96}
                      paddingAngle={4}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {integrityData.map((entry) => (
                        <ChartCell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cfd6e6' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>
                    {integrityData.reduce((sum, entry) => sum + entry.value, 0).toLocaleString()}
                  </strong>
                  <span>alerts</span>
                </div>
              </>
            ) : (
              <EmptyState title="No alerts" message="No active alert signals found." />
            )}
          </div>
          <div className="donut-legend">
            {integrityData.map((entry) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="legend-dot" style={{ background: entry.color }} /> {entry.name}
                </span>
                <b>{entry.value}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Lower Grid */}
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest audit actions recorded in ledger</p>
            </div>
            <Link className="subtle-link" to="/audit">
              All activity <ArrowRight size={14} />
            </Link>
          </div>
          {summary.recent_activity.length ? (
            <div className="activity-list">
              {summary.recent_activity.slice(0, 5).map((event) => (
                <div className="activity-row" key={event.id}>
                  <div className="activity-symbol">
                    <Activity size={15} />
                  </div>
                  <div className="activity-copy">
                    <strong>{event.action.replaceAll('_', ' ')}</strong>
                    <span>
                      {event.entity_type} · {event.entity_id}
                    </span>
                  </div>
                  <time>{formatDateTime(event.timestamp)}</time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent activity"
              message="Audit events will appear here after a recorded action."
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Intake Capacity Tracking</h2>
              <p>Admissions vs AICTE approved capacity</p>
            </div>
            <Link className="subtle-link" to="/intake">
              Intake details <ArrowRight size={14} />
            </Link>
          </div>
          {summary.programme_admissions_vs_intake.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {summary.programme_admissions_vs_intake.map((item, idx) => (
                <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13.5px' }}>{item.programme_name}</strong>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: item.utilization_pct > 100 ? '#DC2626' : '#1B756B' }}>
                      {item.new_admitted} / {item.approved_intake} ({item.utilization_pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                    {item.institution_name} · {item.academic_year}
                  </div>
                  <div className="utilization-bar-bg">
                    <div
                      className={`utilization-bar-fill ${item.utilization_pct > 100 ? 'over' : item.utilization_pct > 85 ? 'warning' : ''}`}
                      style={{ width: `${Math.min(100, item.utilization_pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No intake records" message="Capacity data has not been configured yet." />
          )}
        </section>
      </div>
    </>
  )
}
