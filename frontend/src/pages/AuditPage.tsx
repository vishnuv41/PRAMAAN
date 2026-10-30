import { useState, useEffect } from 'react'
import {
  FileClock,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react'
import { api, getErrorMessage, AuditItem } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  formatDateTime,
  Modal,
} from '../components/Common'

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    const params: Record<string, any> = { limit: 100 }
    if (action) params.action = action

    api
      .get<{ items: AuditItem[]; total: number }>('/audit-trail', { params })
      .then((res) => {
        setItems(res.data.items || [])
        setTotal(res.data.total || 0)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [action])

  const outcomes = [
    ...new Set(
      items.map((item) => item.details?.status ?? item.details?.result).filter(Boolean),
    ),
  ] as string[]

  const actions = [...new Set(items.map((item) => item.action))]

  const visible = items.filter((item) => {
    if (actor && !String(item.performed_by || '').toLowerCase().includes(actor.toLowerCase()))
      return false
    if (fromDate && String(item.timestamp || '') < fromDate) return false
    if (toDate && String(item.timestamp || '').slice(0, 10) > toDate) return false
    if (resultFilter) {
      const res = item.details?.status ?? item.details?.result
      if (res !== resultFilter) return false
    }
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="IMMUTABLE SECURITY LEDGER"
        title="Audit Trail History"
        description="Append-only record of all system events: batch CSV uploads, rule gate validations, officer adjudications, and credential verifications."
      />

      <div className="metric-grid">
        <MetricCard
          label="Total Logged Events"
          value={total}
          caption="Immutable event records stored in SQLite ledger"
          icon={FileClock}
          tone="blue"
        />
        <MetricCard
          label="Security Standard"
          value="Append-Only"
          caption="Zero update/delete permissions on audit tables"
          icon={ShieldCheck}
          tone="green"
        />
        <MetricCard
          label="Actor Attribution"
          value="Officer / Service"
          caption="Every action recorded with principal context"
          icon={Calendar}
          tone="slate"
        />
        <MetricCard
          label="Filtered Scope"
          value={visible.length}
          caption="Events matching current filter criteria"
          icon={Layers}
          tone="green"
        />
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h2>Recorded System Events</h2>
            <p className="subheading">
              Showing {visible.length} of {total} events · Sensitive identifiers are masked
            </p>
          </div>
        </div>

        <div className="audit-filters" style={{ marginBottom: '18px' }}>
          <label>
            Action type
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All action types</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </label>

          <label>
            User or service
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Filter by actor..."
            />
          </label>

          <label>
            From date
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>

          <label>
            To date
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>

          <label>
            Result
            <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
              <option value="">All outcomes</option>
              {outcomes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <StateMessage error={error} retry={load} />
        ) : loading ? (
          <StateMessage />
        ) : visible.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / Service</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Reference ID</th>
                  <th>Outcome</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => {
                  const outcome = event.details?.status ?? event.details?.result

                  return (
                    <tr key={event.id}>
                      <td style={{ fontSize: '12.5px' }}>{formatDateTime(event.timestamp)}</td>
                      <td>
                        <strong>{event.performed_by || 'System Service'}</strong>
                      </td>
                      <td>
                        <StatusBadge label={event.action} tone="blue" />
                      </td>
                      <td>{event.entity_type}</td>
                      <td className="mono">{event.entity_id}</td>
                      <td>
                        {outcome ? (
                          <span
                            className="badge-outline"
                            style={{
                              borderColor:
                                outcome === 'VALID' || outcome === 'RESOLVED' || outcome === 'COMPLETED'
                                  ? '#1B756B'
                                  : undefined,
                            }}
                          >
                            {outcome}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <button
                          className="button-small button-outline"
                          onClick={() => setSelectedAudit(event)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No audit events matched"
            message="Try widening your date range or clearing the action and actor filters."
          />
        )}
      </section>

      {/* Inspect Audit Event Modal */}
      {selectedAudit && (
        <Modal
          title={`Audit Record #${selectedAudit.id}`}
          subtitle={`${selectedAudit.action} on ${selectedAudit.entity_type} ${selectedAudit.entity_id}`}
          onClose={() => setSelectedAudit(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Actor</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>{selectedAudit.performed_by}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Timestamp</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>{formatDateTime(selectedAudit.timestamp)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Target Entity</span>
              <strong style={{ display: 'block', fontSize: '14px' }}>{selectedAudit.entity_type} ({selectedAudit.entity_id})</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Action</span>
              <StatusBadge label={selectedAudit.action} tone="blue" />
            </div>
          </div>

          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            Captured Event Context Snapshot:
          </span>
          <pre className="code-preview" style={{ marginTop: '6px' }}>
            {JSON.stringify(selectedAudit.details ?? {}, null, 2)}
          </pre>
        </Modal>
      )}
    </>
  )
}
