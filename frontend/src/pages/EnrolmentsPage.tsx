import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api, getErrorMessage, Enrolment, Alert, ApiPage } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  maskId,
  Modal,
} from '../components/Common'

export default function EnrolmentsPage() {
  const [searchParams] = useSearchParams()
  const sessionUser = (() => {
    try {
      const raw = sessionStorage.getItem('pramaan_session_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const initialInst = searchParams.get('institution') || searchParams.get('institution_id') || sessionUser?.institution_id || ''
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [institution, setInstitution] = useState(initialInst)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedEnrolment, setSelectedEnrolment] = useState<Enrolment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    const params: Record<string, any> = { page, limit: 20 }
    if (institution) params.institution_id = institution
    if (statusFilter) params.enrolment_status = statusFilter
    if (categoryFilter) params.seat_category = categoryFilter
    if (yearFilter) params.academic_year = yearFilter

    Promise.all([
      api.get<ApiPage<Enrolment>>('/enrolments', { params }),
      api.get<ApiPage<Alert>>('/alerts', { params: { limit: 50 } }),
    ])
      .then(([enrRes, alertsRes]) => {
        setEnrolments(enrRes.data.items || [])
        setTotal(enrRes.data.total || 0)
        setAlerts(alertsRes.data.items || [])
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const inst = searchParams.get('institution') || searchParams.get('institution_id')
    if (inst !== null && inst !== institution) setInstitution(inst)
  }, [searchParams])

  useEffect(() => {
    load()
  }, [page, institution, statusFilter, categoryFilter, yearFilter])

  const filteredEnrolments = enrolments.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        e.student_ref.toLowerCase().includes(q) ||
        e.institution_name.toLowerCase().includes(q) ||
        e.programme_name.toLowerCase().includes(q) ||
        e.apaar_id.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Find alert linked to a student
  const getStudentAlert = (studentRef: string) => alerts.find((a) => a.student_ref === studentRef)

  return (
    <>
      <PageHeader
        eyebrow="TEMPORAL INTEGRITY ENGINE"
        title="Enrolment Monitoring"
        description="Real-time multi-institutional enrolment tracking, timeline conflict discovery, and authorized dual-degree exception governance."
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search enrolments by student, college, programme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row compact-filters">
            <select
              aria-label="Filter institution"
              value={institution}
              onChange={(e) => {
                setInstitution(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All institutions</option>
              <option value="INST-DELHI-DTU">DTU Delhi</option>
              <option value="INST-DELHI-IIITD">IIIT Delhi</option>
              <option value="INST-PUNE-COEP">COEP Pune</option>
              <option value="INST-DELHI-NSUT">NSUT Delhi</option>
              <option value="INST-TRICHY-NITT">NIT Trichy</option>
              <option value="INST-MUMBAI-IITB">IIT Bombay External</option>
            </select>

            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All enrolment statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Suspended">Suspended</option>
            </select>

            <select
              aria-label="Filter category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All admission categories</option>
              <option value="General">General</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="OBC">OBC</option>
              <option value="EWS">EWS</option>
              <option value="NRI">NRI</option>
              <option value="Foreign-National">Foreign-National</option>
              <option value="Supernumerary-TFW">Supernumerary (TFW)</option>
            </select>

            <select
              aria-label="Filter year"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All academic years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
        </div>

        {error ? (
          <StateMessage error={error} retry={load} />
        ) : loading ? (
          <StateMessage />
        ) : filteredEnrolments.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Enrolment ID</th>
                    <th>Student Ref</th>
                    <th>Institution</th>
                    <th>Programme</th>
                    <th>Year / Cycle</th>
                    <th>Timeline Dates</th>
                    <th>Status</th>
                    <th>Seat Category</th>
                    <th>Conflict Signal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrolments.map((enr) => {
                    const alert = getStudentAlert(enr.student_ref)

                    return (
                      <tr key={enr.id}>
                        <td className="mono font-semibold">ENR-{enr.id}</td>
                        <td className="mono">
                          <Link className="table-link" to={`/students/${enr.student_ref}`}>
                            {enr.student_ref}
                          </Link>
                          <small className="table-sub">{maskId(enr.apaar_id)}</small>
                        </td>
                        <td>{enr.institution_name}</td>
                        <td><strong>{enr.programme_name}</strong></td>
                        <td>
                          {enr.academic_year}
                          <small className="table-sub">{enr.admission_cycle}</small>
                        </td>
                        <td>
                          {enr.enrolment_start} → {enr.enrolment_end || 'Present'}
                        </td>
                        <td>
                          <StatusBadge
                            label={enr.enrolment_status}
                            tone={
                              enr.enrolment_status === 'Active'
                                ? 'green'
                                : enr.enrolment_status === 'Completed'
                                ? 'blue'
                                : 'amber'
                            }
                          />
                        </td>
                        <td>
                          <span className="badge-outline">{enr.seat_category}</span>
                        </td>
                        <td>
                          {alert ? (
                            <span
                              className={`status-badge ${
                                alert.severity === 'HIGH'
                                  ? 'red'
                                  : alert.severity === 'MEDIUM'
                                  ? 'amber'
                                  : 'blue'
                              }`}
                              title={alert.title}
                            >
                              <AlertTriangle size={12} /> {alert.alert_type}
                            </span>
                          ) : (
                            <span className="status-badge green">
                              <ShieldCheck size={12} /> Clear
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="button-small button-outline"
                            onClick={() => setSelectedEnrolment(enr)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <span className="page-summary">
                Showing {filteredEnrolments.length} of {total} total enrolments
              </span>
              <div className="pagination-controls">
                <button
                  className="icon-button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-number">Page {page}</span>
                <button
                  className="icon-button"
                  disabled={filteredEnrolments.length < 20 || page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No enrolments matched"
            message="Try adjusting your institution, category, or status filters."
          />
        )}
      </section>

      {/* Enrolment Detail Modal */}
      {selectedEnrolment && (
        <Modal
          title={`Enrolment Record ENR-${selectedEnrolment.id}`}
          subtitle={`${selectedEnrolment.institution_name} · ${selectedEnrolment.programme_name}`}
          onClose={() => setSelectedEnrolment(null)}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Student Reference</span>
              <strong style={{ display: 'block', fontSize: '15px' }}>{selectedEnrolment.student_ref}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Masked APAAR ID</span>
              <strong style={{ display: 'block', fontSize: '15px' }}>{maskId(selectedEnrolment.apaar_id)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Academic Interval</span>
              <strong style={{ display: 'block', fontSize: '15px' }}>
                {selectedEnrolment.enrolment_start} → {selectedEnrolment.enrolment_end || 'Open-ended'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Status & Category</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <StatusBadge label={selectedEnrolment.enrolment_status} tone="green" />
                <span className="badge-outline">{selectedEnrolment.seat_category}</span>
              </div>
            </div>
          </div>

          {selectedEnrolment.exception_ref && (
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(18, 165, 142, .08)', border: '1px solid rgba(18, 165, 142, .2)', marginBottom: '16px' }}>
              <strong style={{ fontSize: '13px', color: '#1B756B' }}>Documented Permitted Exception Attached</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text)' }}>
                Reference: <code>{selectedEnrolment.exception_ref}</code> (Scenario C: Dual-degree / Credit transfer approval)
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Link
              to={`/students/${selectedEnrolment.student_ref}`}
              className="button-primary"
              onClick={() => setSelectedEnrolment(null)}
            >
              Open Full Student Profile
            </Link>
          </div>
        </Modal>
      )}
    </>
  )
}
