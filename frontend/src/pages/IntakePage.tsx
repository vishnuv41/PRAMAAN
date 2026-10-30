import { useState, useEffect } from 'react'
import {
  BookOpenCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Search,
} from 'lucide-react'
import { api, getErrorMessage, IntakeComplianceReport } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  Modal,
} from '../components/Common'

export default function IntakePage() {
  const [reports, setReports] = useState<IntakeComplianceReport[]>([])
  const [totalRules, setTotalRules] = useState(0)
  const [institution, setInstitution] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showAddRule, setShowAddRule] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state for adding rule
  const [form, setForm] = useState({
    institution_id: 'INST-DELHI-DTU',
    programme_id: 'BTECH-CSE',
    academic_year: '2025-2026',
    admission_cycle: 'Regular 2025',
    approved_intake: 120,
    supernumerary_quota: 6,
    nri_quota: 18,
    rule_source: 'AICTE Approval Process Handbook 2025-26',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    api
      .get<{ total_rules: number; reports: IntakeComplianceReport[] }>('/intake-compliance')
      .then((res) => {
        setReports(res.data.reports || [])
        setTotalRules(res.data.total_rules || 0)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/intake-compliance/rules', form)
      setShowAddRule(false)
      load()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const compliantCount = reports.filter((r) => r.compliance_status === 'COMPLIANT').length
  const reviewCount = reports.filter((r) => r.compliance_status === 'NEEDS_REVIEW').length

  const filtered = reports.filter((r) => {
    if (institution && r.institution_id !== institution) return false
    if (statusFilter && r.compliance_status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        (r.institution_name?.toLowerCase() || '').includes(q) ||
        (r.programme_name?.toLowerCase() || '').includes(q) ||
        r.institution_id.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="CAPACITY OVERSIGHT"
        title="AICTE Intake Compliance"
        description="Monitor institutional sanctioned capacity against actual admissions, evaluate supernumerary quotas independently, and enforce regulatory intake ceilings."
        action={
          <button className="button-primary" onClick={() => setShowAddRule(true)}>
            <Plus size={16} /> Configure Capacity Rule
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="metric-grid">
        <MetricCard
          label="Monitored Programmes"
          value={reports.length}
          caption={`${totalRules} active AICTE rules registered`}
          icon={BookOpenCheck}
          tone="blue"
        />
        <MetricCard
          label="Compliant Programmes"
          value={compliantCount}
          caption="Strictly within approved intake quota"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Programmes Needing Review"
          value={reviewCount}
          caption="Pending rule scope or duplicate anomalies"
          icon={AlertTriangle}
          tone="amber"
        />
        <MetricCard
          label="Independent Quotas"
          value="Supernumerary & NRI"
          caption="Compared independently to avoid cross-subsidies"
          icon={ShieldCheck}
          tone="slate"
        />
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search programme, college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row compact-filters">
            <select
              aria-label="Filter institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            >
              <option value="">All institutions</option>
              <option value="INST-DELHI-DTU">DTU Delhi</option>
              <option value="INST-DELHI-IIITD">IIIT Delhi</option>
              <option value="INST-PUNE-COEP">COEP Pune</option>
              <option value="INST-DELHI-NSUT">NSUT Delhi</option>
            </select>

            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="COMPLIANT">COMPLIANT</option>
              <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
              <option value="OVER_CAPACITY">OVER_CAPACITY</option>
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
                  <th>Institution</th>
                  <th>Programme</th>
                  <th>Academic Year</th>
                  <th>Approved Intake</th>
                  <th>Admitted (New)</th>
                  <th>Utilization</th>
                  <th>Category Breakdown</th>
                  <th>Status</th>
                  <th>Explanation / Rule citation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const util = item.utilization_pct ?? 0
                  const hasRule = item.approved_intake !== null

                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{item.institution_name || item.institution_id}</strong>
                      </td>
                      <td>
                        {item.programme_name || item.programme_id}
                        {item.rule_id && (
                          <small className="table-sub mono">{item.rule_id}</small>
                        )}
                      </td>
                      <td>{item.academic_year}</td>
                      <td>
                        {hasRule ? (
                          <span>
                            <b>{item.approved_intake}</b>
                            {item.supernumerary_quota ? ` (+${item.supernumerary_quota} TFW)` : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Unconfigured</span>
                        )}
                      </td>
                      <td>
                        {hasRule ? (
                          <span>
                            <b>{item.new_admissions_count}</b> total ({item.regular_admitted} regular)
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ minWidth: '130px' }}>
                        {hasRule ? (
                          <>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                              {util.toFixed(1)}%
                            </div>
                            <div className="utilization-bar-bg">
                              <div
                                className={`utilization-bar-fill ${util > 100 ? 'over' : util > 85 ? 'warning' : ''}`}
                                style={{ width: `${Math.min(100, util)}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {item.category_breakdown ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Object.entries(item.category_breakdown).map(([cat, count]) => (
                              <span key={cat} className="badge-outline" style={{ fontSize: '11px' }}>
                                {cat}: {count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          label={item.compliance_status}
                          tone={
                            item.compliance_status === 'COMPLIANT'
                              ? 'green'
                              : item.compliance_status === 'OVER_CAPACITY'
                              ? 'red'
                              : 'amber'
                          }
                        />
                      </td>
                      <td style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '12px', color: 'var(--muted)' }}>
                        {item.explanation || item.summary || 'Compliant with sanctioned capacity'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No compliance reports found"
            message="No records matched the selected filters."
          />
        )}
      </section>

      {/* Add Rule Modal */}
      {showAddRule && (
        <Modal
          title="Configure AICTE Approved Intake Capacity"
          subtitle="Register authorized sanctioned capacity and supernumerary quotas"
          onClose={() => setShowAddRule(false)}
        >
          <form onSubmit={handleAddRule}>
            <div className="form-grid">
              <div className="form-group">
                <label>Institution ID</label>
                <select
                  value={form.institution_id}
                  onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
                >
                  <option value="INST-DELHI-DTU">INST-DELHI-DTU (Delhi Tech Univ)</option>
                  <option value="INST-DELHI-IIITD">INST-DELHI-IIITD (IIIT Delhi)</option>
                  <option value="INST-PUNE-COEP">INST-PUNE-COEP (COEP Pune)</option>
                  <option value="INST-DELHI-NSUT">INST-DELHI-NSUT (NSUT Delhi)</option>
                  <option value="INST-TRICHY-NITT">INST-TRICHY-NITT (NIT Trichy)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Programme ID</label>
                <input
                  value={form.programme_id}
                  onChange={(e) => setForm({ ...form, programme_id: e.target.value })}
                  placeholder="e.g. BTECH-CSE"
                  required
                />
              </div>

              <div className="form-group">
                <label>Academic Year</label>
                <input
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Admission Cycle</label>
                <input
                  value={form.admission_cycle}
                  onChange={(e) => setForm({ ...form, admission_cycle: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Approved Intake (Seats)</label>
                <input
                  type="number"
                  value={form.approved_intake}
                  onChange={(e) => setForm({ ...form, approved_intake: Number(e.target.value) })}
                  min={1}
                  required
                />
              </div>

              <div className="form-group">
                <label>Supernumerary Quota (TFW)</label>
                <input
                  type="number"
                  value={form.supernumerary_quota}
                  onChange={(e) => setForm({ ...form, supernumerary_quota: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>NRI Quota (Seats)</label>
                <input
                  type="number"
                  value={form.nri_quota}
                  onChange={(e) => setForm({ ...form, nri_quota: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="form-group">
                <label>Rule Source / Handbook Reference</label>
                <input
                  value={form.rule_source}
                  onChange={(e) => setForm({ ...form, rule_source: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowAddRule(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={submitting}>
                {submitting ? 'Registering...' : 'Save Rule Configuration'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
