import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  History,
} from 'lucide-react'
import { api, getErrorMessage, Alert, AlertHistory, ApiPage } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  Modal,
  formatDateTime,
  SubNav,
} from '../components/Common'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL')

  // Review Form State
  const [decision, setDecision] = useState('CONFIRMED_CONFLICT')
  const [note, setNote] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [newNote, setNewNote] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reEvaluating, setReEvaluating] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    const params: Record<string, any> = { limit: 100 }
    if (severityFilter) params.severity = severityFilter
    if (statusFilter) params.status = statusFilter

    api
      .get<ApiPage<Alert>>('/alerts', { params })
      .then((res) => setAlerts(res.data.items || []))
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [severityFilter, statusFilter])

  const openAlertModal = async (alert: Alert) => {
    setSelectedAlert(alert)
    setNote(alert.reviewer_note || '')
    setDecision(alert.reviewer_decision || 'CONFIRMED_CONFLICT')
    setLoadingHistory(true)
    try {
      const res = await api.get<{ events?: AlertHistory[]; history?: AlertHistory[] }>(`/alerts/${alert.id}/history`)
      setHistory(res.data.events || res.data.history || [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAlert) return
    setSubmittingReview(true)
    try {
      await api.patch(`/alerts/${selectedAlert.id}/review`, {
        decision,
        reviewer_note: note.trim() || 'Reviewed by authorized officer',
      })
      setSelectedAlert(null)
      load()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleReopen = async () => {
    if (!selectedAlert) return
    setReopening(true)
    try {
      await api.post(`/alerts/${selectedAlert.id}/reopen`, {
        reason: 'Case reopened for re-investigation based on supplementary evidence.',
      })
      setSelectedAlert(null)
      load()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setReopening(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAlert || !newNote.trim()) return
    try {
      await api.post(`/alerts/${selectedAlert.id}/notes`, { note: newNote.trim() })
      setNewNote('')
      // Reload history
      const res = await api.get<{ events?: AlertHistory[]; history?: AlertHistory[] }>(`/alerts/${selectedAlert.id}/history`)
      setHistory(res.data.events || res.data.history || [])
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const triggerReEvaluation = async () => {
    setReEvaluating(true)
    try {
      const res = await api.post('/alerts/re-evaluate')
      alert(`Re-evaluation complete: ${res.data.message || 'Engine refreshed'}`)
      load()
    } catch (e) {
      alert(getErrorMessage(e))
    } finally {
      setReEvaluating(false)
    }
  }

  const openCases = alerts.filter((a) => a.status === 'OPEN')
  const reviewCases = alerts.filter((a) => a.status === 'UNDER_REVIEW')
  const resolvedCases = alerts.filter((a) => a.status === 'RESOLVED')

  const filtered = alerts.filter((a) => {
    if (activeTab === 'OPEN' && a.status !== 'OPEN') return false
    if (activeTab === 'UNDER_REVIEW' && a.status !== 'UNDER_REVIEW') return false
    if (activeTab === 'RESOLVED' && a.status !== 'RESOLVED') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        a.id.toLowerCase().includes(q) ||
        a.student_ref.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.alert_type.toLowerCase().includes(q)
      )
    }
    return true
  })

  const tabs = [
    { id: 'ALL', label: 'All Investigation Cases', count: alerts.length },
    { id: 'OPEN', label: 'Open Alerts', count: openCases.length },
    { id: 'UNDER_REVIEW', label: 'Under Review', count: reviewCases.length },
    { id: 'RESOLVED', label: 'Resolved Decisions', count: resolvedCases.length },
  ]

  return (
    <>
      <PageHeader
        eyebrow="HUMAN-IN-THE-LOOP INVESTIGATION"
        title="Alerts and Review Queue"
        description="Centralized investigative console for temporal enrolment conflicts, duplicate submissions, and dual-degree exception approvals."
        action={
          <button
            className="button-secondary"
            onClick={triggerReEvaluation}
            disabled={reEvaluating}
          >
            <RefreshCw size={15} className={reEvaluating ? 'spinning' : ''} />
            {reEvaluating ? 'Re-evaluating...' : 'Re-evaluate Engine'}
          </button>
        }
      />

      {/* Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Alerts"
          value={alerts.length}
          caption="Signals generated by the temporal engine"
          icon={ClipboardList}
          tone="blue"
        />
        <MetricCard
          label="Open Investigations"
          value={openCases.length}
          caption="Awaiting assigned officer triage"
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          label="Resolved Decisions"
          value={resolvedCases.length}
          caption="Adjudicated with recorded findings"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Investigative Principle"
          value="Prompt != Fraud"
          caption="Findings are prompts for review, not conclusions"
          icon={ShieldCheck}
          tone="slate"
        />
      </div>

      <SubNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search alert by ID, student reference, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row compact-filters">
            <select
              aria-label="Filter severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All severities</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INFORMATIONAL">INFORMATIONAL</option>
            </select>

            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
        </div>

        {error ? (
          <StateMessage error={error} retry={load} />
        ) : loading ? (
          <StateMessage />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Student Ref</th>
                  <th>Alert Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Title / Summary</th>
                  <th>Decision</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="mono font-semibold">{item.id}</td>
                    <td className="mono">
                      <Link className="table-link" to={`/students/${item.student_ref}`}>
                        {item.student_ref}
                      </Link>
                    </td>
                    <td>
                      <span className="badge-outline">{item.alert_type}</span>
                    </td>
                    <td>
                      <StatusBadge
                        label={item.severity}
                        tone={
                          item.severity === 'HIGH'
                            ? 'red'
                            : item.severity === 'MEDIUM'
                            ? 'amber'
                            : 'blue'
                        }
                      />
                    </td>
                    <td>
                      <StatusBadge
                        label={item.status}
                        tone={
                          item.status === 'RESOLVED'
                            ? 'green'
                            : item.status === 'UNDER_REVIEW'
                            ? 'amber'
                            : 'blue'
                        }
                      />
                    </td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '13px' }}>
                      <strong>{item.title}</strong>
                    </td>
                    <td>
                      {item.reviewer_decision ? (
                        <span className="mono font-semibold" style={{ fontSize: '12px', color: '#1B756B' }}>
                          {item.reviewer_decision}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Pending</span>
                      )}
                    </td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>
                      <button
                        className="button-small"
                        onClick={() => openAlertModal(item)}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No alerts in this view"
            message="No investigative cases matched the specified criteria."
          />
        )}
      </section>

      {/* Case Review Modal */}
      {selectedAlert && (
        <Modal
          title={`Investigation Case: ${selectedAlert.id}`}
          subtitle={`Student: ${selectedAlert.student_ref} · Rule: ${selectedAlert.alert_type}`}
          onClose={() => setSelectedAlert(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
            <div style={{ padding: '10px 12px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>SEVERITY</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                {selectedAlert.severity}
              </strong>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>CURRENT STATUS</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                {selectedAlert.status}
              </strong>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--workspace)', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>CONFIDENCE SCORE</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>
                {selectedAlert.confidence_score ? `${(selectedAlert.confidence_score * 100).toFixed(0)}%` : 'Rule-based'}
              </strong>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
              {selectedAlert.title}
            </strong>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              {selectedAlert.explanation}
            </p>
          </div>

          {selectedAlert.evidence_summary && (
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                Supporting Evidence Payload:
              </span>
              <pre className="code-preview" style={{ marginTop: '6px' }}>
                {JSON.stringify(selectedAlert.evidence_summary, null, 2)}
              </pre>
            </div>
          )}

          {/* Record Decision Form */}
          <form onSubmit={handleReviewSubmit} style={{ padding: '16px', borderRadius: '10px', background: 'var(--workspace)', marginBottom: '18px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Record Officer Adjudication</h4>
            <div className="form-grid" style={{ margin: '0 0 12px' }}>
              <div className="form-group">
                <label>Adjudication Decision</label>
                <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <option value="CONFIRMED_CONFLICT">CONFIRMED CONFLICT</option>
                  <option value="FALSE_POSITIVE">FALSE POSITIVE (DISMISS)</option>
                  <option value="PERMITTED_EXCEPTION">PERMITTED DUAL EXCEPTION</option>
                  <option value="UNDER_INVESTIGATION">HOLD FOR FURTHER INQUIRY</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reviewer Reason / Note</label>
                <input
                  required
                  placeholder="Justification note for audit trail..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedAlert.status === 'RESOLVED' && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleReopen}
                  disabled={reopening}
                >
                  {reopening ? 'Reopening...' : 'Reopen Case'}
                </button>
              )}
              <button type="submit" className="button-primary" disabled={submittingReview}>
                {submittingReview ? 'Recording...' : 'Submit Decision'}
              </button>
            </div>
          </form>

          {/* Audit History for this Alert */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={15} /> Case Decision History
            </h4>

            {/* Add Audit Note Form */}
            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                placeholder="Append case note to audit history..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', fontSize: '13px', border: '1px solid var(--line)', borderRadius: '8px' }}
              />
              <button type="submit" className="button-small button-outline" disabled={!newNote.trim()}>
                Add Note
              </button>
            </form>
            {loadingHistory ? (
              <StateMessage />
            ) : history.length ? (
              <div className="table-scroll" style={{ maxHeight: '180px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Officer</th>
                      <th>Decision</th>
                      <th>Transition</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any) => (
                      <tr key={h.id}>
                        <td>{formatDateTime(h.created_at)}</td>
                        <td>{h.performed_by || h.actor || 'AICTE Officer'}</td>
                        <td className="mono">{h.decision || h.action || '—'}</td>
                        <td>{h.previous_status} → {h.new_status}</td>
                        <td style={{ fontSize: '12px' }}>{h.notes || h.note || h.resolution_reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                No past decision entries recorded on this alert.
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
