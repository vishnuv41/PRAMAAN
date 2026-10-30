import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Users,
  ShieldCheck,
  GraduationCap,
  Search,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { api, getErrorMessage, AicteSummary, Enrolment, Student, ApiPage } from '../api'
import {
  PageHeader,
  StateMessage,
  MetricCard,
  Modal,
  EmptyState,
} from '../components/Common'

interface InstitutionMeta {
  id: string
  name: string
  location: string
  type: string
  programmes: string[]
  approvedIntakeTotal: number
}

export default function InstitutionsPage() {
  const [aicte, setAicte] = useState<AicteSummary | null>(null)
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [institutions, setInstitutions] = useState<InstitutionMeta[]>([])
  const [selectedInst, setSelectedInst] = useState<InstitutionMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get<AicteSummary>('/aicte/dashboard-summary'),
      api.get<ApiPage<Enrolment>>('/enrolments', { params: { limit: 100 } }),
      api.get<ApiPage<Student>>('/students', { params: { limit: 100 } }),
      api.get<{ total_rules: number; reports: any[] }>('/intake-compliance'),
    ])
      .then(([aicteRes, enrRes, stuRes, intakeRes]) => {
        setAicte(aicteRes.data)
        const enrList = enrRes.data.items || []
        const stuList = stuRes.data.items || []
        setEnrolments(enrList)
        setStudents(stuList)

        const reports = intakeRes.data.reports || []
        const instMap = new Map<string, {
          id: string
          name: string
          location: string
          type: string
          programmes: Set<string>
          approvedIntakeTotal: number
        }>()

        for (const r of reports) {
          if (!r.institution_id) continue
          if (!instMap.has(r.institution_id)) {
            instMap.set(r.institution_id, {
              id: r.institution_id,
              name: r.institution_name || r.institution_id,
              location: r.institution_id.includes('DELHI') ? 'Delhi' : r.institution_id.includes('PUNE') ? 'Maharashtra' : r.institution_id.includes('TRICHY') ? 'Tamil Nadu' : r.institution_id.includes('MUMBAI') ? 'Maharashtra' : 'National Jurisdiction',
              type: 'AICTE Approved Technical Institution',
              programmes: new Set(),
              approvedIntakeTotal: 0,
            })
          }
          const item = instMap.get(r.institution_id)!
          if (r.programme_name) item.programmes.add(r.programme_name)
          item.approvedIntakeTotal += (r.approved_intake || 0)
        }

        for (const e of enrList) {
          if (!e.institution_id) continue
          if (!instMap.has(e.institution_id)) {
            instMap.set(e.institution_id, {
              id: e.institution_id,
              name: e.institution_name || e.institution_id,
              location: e.institution_id.includes('DELHI') ? 'Delhi' : e.institution_id.includes('PUNE') ? 'Maharashtra' : e.institution_id.includes('TRICHY') ? 'Tamil Nadu' : e.institution_id.includes('MUMBAI') ? 'Maharashtra' : 'National Jurisdiction',
              type: 'Higher Education Institution',
              programmes: new Set(),
              approvedIntakeTotal: 0,
            })
          }
          const item = instMap.get(e.institution_id)!
          if (e.programme_name) item.programmes.add(e.programme_name)
        }

        const dynamicInstitutions: InstitutionMeta[] = Array.from(instMap.values()).map((inst) => ({
          ...inst,
          programmes: Array.from(inst.programmes),
        }))
        setInstitutions(dynamicInstitutions)
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const getInstitutionStats = (instId: string) => {
    const instEnrolments = enrolments.filter((e) => e.institution_id === instId)
    const activeEnrolments = instEnrolments.filter((e) => e.enrolment_status === 'Active')
    const instStudents = students.filter((s) => s.primary_institution_id === instId)
    return {
      totalEnrolments: instEnrolments.length,
      activeEnrolments: activeEnrolments.length,
      studentCount: instStudents.length,
    }
  }

  const filtered = institutions.filter((inst) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.id.toLowerCase().includes(q) ||
        inst.location.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="INSTITUTIONAL DIRECTORY"
        title="Approved Institutions"
        description="AICTE-affiliated colleges participating in the PRAMAAN multi-institutional enrolment verification network."
      />

      {/* Overview Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Registered Institutions"
          value={aicte?.total_institutions || institutions.length}
          caption="Active technical institutions in sentinel network"
          icon={Building2}
          tone="blue"
        />
        <MetricCard
          label="Total Student Cohort"
          value={aicte?.total_students || students.length}
          caption="Enrolled across all registered institutions"
          icon={Users}
          tone="green"
        />
        <MetricCard
          label="Active Enrolments"
          value={aicte?.total_enrolments || enrolments.length}
          caption="Subject to cross-institutional integrity monitoring"
          icon={GraduationCap}
          tone="slate"
        />
        <MetricCard
          label="Oversight Authority"
          value="AICTE RO-102"
          caption="Regional Directorate Northern & Western Oversight"
          icon={ShieldCheck}
          tone="green"
        />
      </div>

      {/* Search Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div className="table-search" style={{ width: '340px' }}>
          <Search size={16} />
          <input
            placeholder="Search institution name, code, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          Showing {filtered.length} of {institutions.length} institutions
        </span>
      </div>

      {error ? (
        <StateMessage error={error} retry={load} />
      ) : loading ? (
        <StateMessage />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No registered institutions found"
          message="No technical institutions match your search query or are registered in the sentinel ledger."
        />
      ) : (
        <div className="card-grid">
          {filtered.map((inst) => {
            const stats = getInstitutionStats(inst.id)

            return (
              <div className="institution-card" key={inst.id}>
                <div className="inst-card-top">
                  <div className="inst-icon">
                    <Building2 size={22} />
                  </div>
                  <span className="badge-verified">
                    <CheckCircle2 size={12} /> AICTE Approved
                  </span>
                </div>

                <div className="inst-card-body">
                  <h3>{inst.name}</h3>
                  <p>{inst.location} · {inst.type}</p>
                  <code style={{ fontSize: '11px', color: 'var(--muted)' }}>{inst.id}</code>
                </div>

                <div className="inst-stats">
                  <div>
                    <div className="inst-stat-val">{stats.studentCount || stats.totalEnrolments}</div>
                    <div className="inst-stat-lbl">Students</div>
                  </div>
                  <div>
                    <div className="inst-stat-val">{stats.activeEnrolments}</div>
                    <div className="inst-stat-lbl">Active ENR</div>
                  </div>
                  <div>
                    <div className="inst-stat-val">{inst.programmes.length}</div>
                    <div className="inst-stat-lbl">Programmes</div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    to={`/enrolments?institution=${inst.id}`}
                    className="subtle-link"
                    style={{ fontSize: '12.5px' }}
                  >
                    View enrolments <ArrowRight size={13} />
                  </Link>
                  <button
                    className="button-small button-outline"
                    onClick={() => setSelectedInst(inst)}
                  >
                    Profile
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Institution Detail Modal */}
      {selectedInst && (
        <Modal
          title={selectedInst.name}
          subtitle={`Institutional ID: ${selectedInst.id} · ${selectedInst.location}`}
          onClose={() => setSelectedInst(null)}
        >
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Affiliation & Classification
            </span>
            <div style={{ fontSize: '14px', marginTop: '2px' }}>
              {selectedInst.type} · AICTE Regional Directorate Oversight (Northern & Western Zone)
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Registered Academic Programmes ({selectedInst.programmes.length})
            </span>
            <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text)' }}>
              {selectedInst.programmes.map((prog, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{prog}</li>
              ))}
            </ul>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--workspace)', border: '1px solid var(--line)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Sanctioned Capacity Ceiling</span>
              <strong style={{ fontSize: '15px', color: '#1B756B' }}>
                {selectedInst.approvedIntakeTotal} seats
              </strong>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Governed by AICTE Approval Process Handbook (APH) 2025-26 quota formulas.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link
              to={`/intake`}
              className="button-primary"
              onClick={() => setSelectedInst(null)}
            >
              Check Intake Capacity
            </Link>
          </div>
        </Modal>
      )}
    </>
  )
}
