import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Users,
  Search,
  Globe,
  ArrowRight,
} from 'lucide-react'
import { api, getErrorMessage, Student, ApiPage, DashboardSummary } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  SubNav,
  maskId,
  PendingBadge,
} from '../components/Common'

export default function IdentityPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [routeFilter, setRouteFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get<ApiPage<Student>>('/students', { params: { limit: 100 } }),
      api.get<DashboardSummary>('/dashboard/summary'),
    ])
      .then(([stuRes, sumRes]) => {
        setStudents(stuRes.data.items || [])
        setSummary(sumRes.data)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const isStandardApaar = (s: Student) => s.identity_route === 'STANDARD_APAAR' || s.identity_route === 'AADHAAR_APAAR'
  const isForeignRoute = (s: Student) => s.identity_route === 'FOREIGN_NATIONAL' || s.identity_route === 'PASSPORT_INTERNATIONAL' || (s as any).is_foreign_national || (s as any).is_nri || (s as any).is_oci
  const isHistorical = (s: Student) => s.identity_route === 'HISTORICAL_LEGACY' || s.identity_route === 'HISTORICAL' || !s.apaar_id

  const standardApaar = students.filter(isStandardApaar)
  const foreignNational = students.filter(isForeignRoute)
  const historicalLegacy = students.filter(isHistorical)

  const filtered = students.filter((s) => {
    if (routeFilter === 'STANDARD' && !isStandardApaar(s)) return false
    if (routeFilter === 'FOREIGN' && !isForeignRoute(s)) return false
    if (routeFilter === 'HISTORICAL' && !isHistorical(s)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        s.student_ref.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.apaar_id && s.apaar_id.toLowerCase().includes(q))
      )
    }
    return true
  })

  const tabs = [
    { id: 'ALL', label: 'All Identity Records', count: students.length },
    { id: 'STANDARD', label: 'Standard APAAR Verified', count: standardApaar.length },
    { id: 'FOREIGN', label: 'Alternative Routes (Foreign/OCI)', count: foreignNational.length },
    { id: 'HISTORICAL', label: 'Historical Legacy (Pre-APAAR)', count: historicalLegacy.length },
  ]

  return (
    <>
      <PageHeader
        eyebrow="IDENTITY GOVERNANCE"
        title="Identity Lifecycle & Verification"
        description="Multi-tier student identity verification distinguishing format checks, local ledger binding, and external registry gateways."
      />

      {/* Identity Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Standard APAAR"
          value={standardApaar.length}
          caption="12-digit UIDAI/APAAR registered cohorts"
          icon={Fingerprint}
          tone="green"
        />
        <MetricCard
          label="Alternative Routes"
          value={foreignNational.length}
          caption="Foreign national passport or OCI credentials"
          icon={Globe}
          tone="blue"
        />
        <MetricCard
          label="Historical Records"
          value={historicalLegacy.length}
          caption="Admitted pre-mandate; legitimate non-APAAR"
          icon={Users}
          tone="slate"
        />
        <MetricCard
          label="Verification Pass Rate"
          value={summary ? `${summary.validation_pass_rate}%` : "—"}
          caption="Local Verhoeff checksum & schema conformance"
          icon={ShieldCheck}
          tone="green"
        />
      </div>

      {/* Verification Authority Architecture Disclosure */}
      <section className="panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <div>
            <h2>Identity Verification Framework & Integrity Tiers</h2>
            <p>PRAMAAN rigorously separates identifier syntax from external verification certainty</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Tier 1: Syntax & Checksum</strong>
              <span className="badge-verified"><CheckCircle2 size={12} /> Active</span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Verifies mathematical format (XXXX-XXXX-XXXX) and Verhoeff modulus check against typographical errors.
            </p>
          </div>

          <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Tier 2: Institutional Ledger</strong>
              <span className="badge-verified"><CheckCircle2 size={12} /> Active</span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Binds the student to active enrolments, preventing multiple simultaneous full-time admissions across colleges.
            </p>
          </div>

          <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Tier 3: DigiLocker/UIDAI API</strong>
              <PendingBadge label="PROTOTYPE SANDBOX" note="Live national registry gateway integration pending regional deployment" />
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Real-time biometric or OTP token authentication against the central APAAR/ABC identity repository.
            </p>
          </div>
        </div>
      </section>

      {/* SubNav Tabs */}
      <SubNav tabs={tabs} active={routeFilter} onChange={setRouteFilter} />

      {/* Student Identity Ledger */}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search identity records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Showing {filtered.length} of {students.length} students
          </span>
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
                  <th>Student Ref</th>
                  <th>Masked APAAR ID</th>
                  <th>Full Name</th>
                  <th>Identity Classification</th>
                  <th>Nationality</th>
                  <th>Primary Institution</th>
                  <th>Format Validity</th>
                  <th>External Gateway</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.student_ref}>
                    <td className="mono font-semibold">
                      <Link className="table-link" to={`/students/${student.student_ref}`}>
                        {student.student_ref}
                      </Link>
                    </td>
                    <td className="mono">{maskId(student.apaar_id)}</td>
                    <td><strong>{student.full_name}</strong></td>
                    <td>
                      <StatusBadge
                        label={student.identity_route.replaceAll('_', ' ')}
                        tone={
                          student.identity_route === 'STANDARD_APAAR'
                            ? 'green'
                            : student.identity_route === 'FOREIGN_NATIONAL'
                            ? 'blue'
                            : 'slate'
                        }
                      />
                    </td>
                    <td>{student.nationality}</td>
                    <td>{student.primary_institution_id || '—'}</td>
                    <td>
                      <span className="badge-verified">
                        <CheckCircle2 size={12} /> Format Valid
                      </span>
                    </td>
                    <td>
                      <span className="badge-sandbox">
                        <HelpCircle size={12} /> Sandbox Stored
                      </span>
                    </td>
                    <td>
                      <Link
                        className="button-small button-outline"
                        to={`/students/${student.student_ref}`}
                      >
                        Inspect <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No records found"
            message="No students matched the chosen identity route classification."
          />
        )}
      </section>
    </>
  )
}
