import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Users,
  ShieldCheck,
  ArrowRightLeft,
  GraduationCap,
  Download,
  Filter,
  MapPin,
  TrendingUp,
} from 'lucide-react'
import { api, getErrorMessage, Enrolment, ApiPage } from '../api'
import {
  PageHeader,
  StateMessage,
  MetricCard,
  EmptyState,
  StatusBadge,
  maskId,
} from '../components/Common'

interface InstitutionMeta {
  id: string
  name: string
  state: string
  city: string
  type: string
  approvedIntake: number
  admittedCount: number
  programmesCount: number
  alertsCount: number
}

const STATE_INSTITUTION_MAP: Record<string, { state: string; city: string; type: string }> = {
  'INST-DELHI-DTU': { state: 'Delhi', city: 'Delhi', type: 'State Technical University' },
  'INST-DELHI-IIITD': { state: 'Delhi', city: 'New Delhi', type: 'State University (Autonomous)' },
  'INST-DELHI-NSUT': { state: 'Delhi', city: 'Dwarka, Delhi', type: 'State Technical University' },
  'INST-PUNE-COEP': { state: 'Maharashtra', city: 'Pune', type: 'Unitary Public University' },
  'INST-MUMBAI-IITB': { state: 'Maharashtra', city: 'Mumbai', type: 'Centrally Funded Institute' },
  'INST-TRICHY-NITT': { state: 'Tamil Nadu', city: 'Tiruchirappalli', type: 'National Institute of Technology' },
  'INST-CHENNAI-SJC': { state: 'Tamil Nadu', city: 'Chennai', type: "St. Joseph's College of Engineering" },
}

export default function StateDashboardPage() {
  const sessionUser = (() => {
    try {
      const raw = sessionStorage.getItem('pramaan_session_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  // Default state from session or "Tamil Nadu" if tn_state_officer
  const defaultState =
    sessionUser?.jurisdiction?.toLowerCase().includes('tamil') ||
    sessionUser?.subject?.toLowerCase().includes('tn') ||
    sessionUser?.institution_id?.toLowerCase().includes('tamil')
      ? 'Tamil Nadu'
      : sessionUser?.jurisdiction?.toLowerCase().includes('maharashtra')
      ? 'Maharashtra'
      : sessionUser?.jurisdiction?.toLowerCase().includes('delhi')
      ? 'Delhi'
      : 'Tamil Nadu'

  const [selectedState, setSelectedState] = useState<string>(defaultState)
  const [activeTab, setActiveTab] = useState<'institutions' | 'enrolments' | 'transfers' | 'intake'>('institutions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [intakeReports, setIntakeReports] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  const loadData = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get<ApiPage<Enrolment>>('/enrolments', { params: { limit: 100 } }),
      api.get<{ total_rules: number; reports: any[] }>('/intake-compliance'),
      api.get<ApiPage<any>>('/alerts', { params: { limit: 50 } }),
    ])
      .then(([enrRes, intakeRes, alertsRes]) => {
        setEnrolments(enrRes.data.items || [])
        setIntakeReports(intakeRes.data.reports || [])
        setAlerts(alertsRes.data.items || [])
      })
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Aggregate institutions by state
  const institutionsByState = useMemo(() => {
    const map = new Map<string, InstitutionMeta>()

    enrolments.forEach((e) => {
      if (!map.has(e.institution_id)) {
        const meta = STATE_INSTITUTION_MAP[e.institution_id] || {
          state: 'Other',
          city: 'Unknown',
          type: 'Technical Institute',
        }
        map.set(e.institution_id, {
          id: e.institution_id,
          name: e.institution_name,
          state: meta.state,
          city: meta.city,
          type: meta.type,
          approvedIntake: 0,
          admittedCount: 0,
          programmesCount: 0,
          alertsCount: 0,
        })
      }
    })

    // Also include institutions from intake reports
    intakeReports.forEach((rpt) => {
      if (!map.has(rpt.institution_id)) {
        const meta = STATE_INSTITUTION_MAP[rpt.institution_id] || {
          state: 'Other',
          city: 'Unknown',
          type: 'Technical Institute',
        }
        map.set(rpt.institution_id, {
          id: rpt.institution_id,
          name: rpt.institution_name || rpt.institution_id,
          state: meta.state,
          city: meta.city,
          type: meta.type,
          approvedIntake: 0,
          admittedCount: 0,
          programmesCount: 0,
          alertsCount: 0,
        })
      }
    })

    // Calculate admitted and intake
    intakeReports.forEach((rpt) => {
      const inst = map.get(rpt.institution_id)
      if (inst) {
        inst.approvedIntake += rpt.approved_intake || 0
        inst.admittedCount += rpt.new_admitted || 0
        inst.programmesCount += 1
      }
    })

    // Alerts count per institution
    alerts.forEach((alert) => {
      const matchedEnr = enrolments.find((e) => e.student_ref === alert.student_ref)
      if (matchedEnr && map.has(matchedEnr.institution_id)) {
        map.get(matchedEnr.institution_id)!.alertsCount += 1
      }
    })

    return Array.from(map.values())
  }, [enrolments, intakeReports, alerts])

  // Filter institutions for the selected state
  const filteredInstitutions = useMemo(() => {
    if (selectedState === 'All') return institutionsByState
    return institutionsByState.filter((inst) => inst.state === selectedState)
  }, [institutionsByState, selectedState])

  const stateInstitutionIds = useMemo(() => {
    return new Set(filteredInstitutions.map((i) => i.id))
  }, [filteredInstitutions])

  // Filter enrolments in this state
  const stateEnrolments = useMemo(() => {
    return enrolments.filter((e) => stateInstitutionIds.has(e.institution_id))
  }, [enrolments, stateInstitutionIds])

  // Interstate migration analysis
  const interstateTransfers = useMemo(() => {
    const studentEnrMap = new Map<string, Enrolment[]>()
    enrolments.forEach((e) => {
      const list = studentEnrMap.get(e.student_ref) || []
      list.push(e)
      studentEnrMap.set(e.student_ref, list)
    })

    const transfers: {
      student_ref: string
      apaar_id: string
      from_inst: string
      to_inst: string
      from_state: string
      to_state: string
      status: string
      type: 'inbound' | 'outbound' | 'internal'
    }[] = []

    studentEnrMap.forEach((enrs, sRef) => {
      if (enrs.length > 1) {
        const sorted = [...enrs].sort((a, b) => a.id - b.id)
        for (let i = 0; i < sorted.length - 1; i++) {
          const from = sorted[i]
          const to = sorted[i + 1]
          const fromState = STATE_INSTITUTION_MAP[from.institution_id]?.state || 'Other'
          const toState = STATE_INSTITUTION_MAP[to.institution_id]?.state || 'Other'

          const involvesState =
            selectedState === 'All' || fromState === selectedState || toState === selectedState

          if (involvesState) {
            let type: 'inbound' | 'outbound' | 'internal' = 'internal'
            if (fromState !== toState) {
              type = toState === selectedState ? 'inbound' : 'outbound'
            }

            transfers.push({
              student_ref: sRef,
              apaar_id: from.apaar_id,
              from_inst: from.institution_name,
              to_inst: to.institution_name,
              from_state: fromState,
              to_state: toState,
              status: to.enrolment_status,
              type,
            })
          }
        }
      }
    })

    return transfers
  }, [enrolments, selectedState])

  // State-level KPI aggregates
  const totalStateSeats = filteredInstitutions.reduce((acc, curr) => acc + curr.approvedIntake, 0)
  const totalStateAdmissions = filteredInstitutions.reduce((acc, curr) => acc + curr.admittedCount, 0)
  const totalStateAlerts = filteredInstitutions.reduce((acc, curr) => acc + curr.alertsCount, 0)
  const utilizationRate =
    totalStateSeats > 0 ? Math.round((totalStateAdmissions / totalStateSeats) * 100) : 0

  const handleExportStateCsv = () => {
    const headers = [
      'Institution ID',
      'Institution Name',
      'City',
      'State',
      'Institution Type',
      'Approved Intake (Seats)',
      'Admitted Students',
      'Capacity Utilization %',
      'Active Alerts & Conflicts',
      'Compliance Status'
    ]
    const rows = filteredInstitutions.map((inst) => {
      const util = inst.approvedIntake > 0 ? Math.round((inst.admittedCount / inst.approvedIntake) * 100) : 0
      const status = inst.alertsCount === 0 && util <= 100 ? 'COMPLIANT' : util > 100 ? 'OVER_ENROLLED' : 'INVESTIGATION_PENDING'
      return [
        `"${inst.id}"`,
        `"${inst.name.replace(/"/g, '""')}"`,
        `"${inst.city}"`,
        `"${inst.state}"`,
        `"${inst.type}"`,
        inst.approvedIntake,
        inst.admittedCount,
        `"${util}%"`,
        inst.alertsCount,
        status
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `State_Compliance_Digest_${selectedState.replace(/\s+/g, '_')}_2026.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportStateExcel = () => {
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F1830" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="State Compliance">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Institution ID</Data></Cell>
    <Cell><Data ss:Type="String">Institution Name</Data></Cell>
    <Cell><Data ss:Type="String">City</Data></Cell>
    <Cell><Data ss:Type="String">State</Data></Cell>
    <Cell><Data ss:Type="String">Institution Type</Data></Cell>
    <Cell><Data ss:Type="String">Approved Intake</Data></Cell>
    <Cell><Data ss:Type="String">Admitted Students</Data></Cell>
    <Cell><Data ss:Type="String">Capacity Utilization</Data></Cell>
    <Cell><Data ss:Type="String">Active Alerts</Data></Cell>
    <Cell><Data ss:Type="String">Compliance Status</Data></Cell>
   </Row>
   ${filteredInstitutions.map(inst => {
     const util = inst.approvedIntake > 0 ? Math.round((inst.admittedCount / inst.approvedIntake) * 100) : 0
     const status = inst.alertsCount === 0 && util <= 100 ? 'COMPLIANT' : util > 100 ? 'OVER_ENROLLED' : 'INVESTIGATION_PENDING'
     return `<Row>
      <Cell><Data ss:Type="String">${inst.id}</Data></Cell>
      <Cell><Data ss:Type="String">${inst.name.replace(/&/g, '&amp;')}</Data></Cell>
      <Cell><Data ss:Type="String">${inst.city}</Data></Cell>
      <Cell><Data ss:Type="String">${inst.state}</Data></Cell>
      <Cell><Data ss:Type="String">${inst.type}</Data></Cell>
      <Cell><Data ss:Type="Number">${inst.approvedIntake}</Data></Cell>
      <Cell><Data ss:Type="Number">${inst.admittedCount}</Data></Cell>
      <Cell><Data ss:Type="String">${util}%</Data></Cell>
      <Cell><Data ss:Type="Number">${inst.alertsCount}</Data></Cell>
      <Cell><Data ss:Type="String">${status}</Data></Cell>
     </Row>`
   }).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `State_Compliance_Digest_${selectedState.replace(/\s+/g, '_')}_2026.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        eyebrow="STATE TECHNICAL EDUCATION DIRECTORATE"
        title={`State Higher Education Oversight — ${selectedState === 'All' ? 'National View' : selectedState}`}
        description="Jurisdictional cohort monitoring, institutional intake compliance, and interstate academic migration audit under APAAR & AICTE framework."
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                aria-label="Select State Jurisdiction"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--workspace)',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                }}
              >
                <option value="Delhi">NCT of Delhi (Directorate of Training & Technical Ed)</option>
                <option value="Maharashtra">Maharashtra (Directorate of Technical Education)</option>
                <option value="Tamil Nadu">Tamil Nadu (Directorate of Technical Education)</option>
                {sessionUser?.role === 'administrator' && (
                  <option value="All">All States / National Registry</option>
                )}
              </select>
            </div>
            <button
              className="button-secondary"
              onClick={handleExportStateCsv}
              title="Download State Oversight CSV Report"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              className="button-secondary"
              onClick={handleExportStateExcel}
              title="Download State Oversight Excel .xlsx Workbook"
            >
              <Download size={15} /> Export Excel
            </button>
          </div>
        }
      />

      {/* Synthetic Demonstration Notice Banner */}
      <div
        style={{
          margin: '0 0 16px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(234, 88, 12, 0.08)',
          border: '1px solid rgba(234, 88, 12, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--foreground)',
        }}
      >
        <span
          style={{
            background: '#ea580c',
            color: '#fff',
            fontWeight: 700,
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          DEMO ENVIRONMENT
        </span>
        <span>
          <strong>SYNTHETIC DEMONSTRATION DATA — NOT OFFICIAL GOVERNMENT RECORDS:</strong> Real-time
          queries against encrypted student database for state-level capacity and interstate mobility
          auditing.
        </span>
      </div>

      {error ? (
        <StateMessage error={error} retry={loadData} />
      ) : loading ? (
        <StateMessage />
      ) : (
        <>
          {/* State High-Level Metrics */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <MetricCard
              label="Institutions in State"
              value={filteredInstitutions.length}
              caption={`AICTE-approved colleges in ${selectedState}`}
              icon={Building2}
              tone="blue"
            />
            <MetricCard
              label="State Student Enrolments"
              value={stateEnrolments.length}
              caption="Active academic enrollments"
              icon={Users}
              tone="blue"
            />
            <MetricCard
              label="Sanctioned Intake"
              value={totalStateSeats.toLocaleString()}
              caption={`Admitted: ${totalStateAdmissions} (${utilizationRate}% utilized)`}
              icon={GraduationCap}
              tone={utilizationRate > 100 ? 'red' : 'green'}
            />
            <MetricCard
              label="Interstate Migrations"
              value={interstateTransfers.length}
              caption="Cross-state transfers tracked"
              icon={ArrowRightLeft}
              tone="blue"
            />
            <MetricCard
              label="Compliance Exceptions"
              value={totalStateAlerts}
              caption={totalStateAlerts === 0 ? 'Zero active violations' : 'Flagged for review'}
              icon={ShieldCheck}
              tone={totalStateAlerts > 0 ? 'amber' : 'green'}
            />
          </div>

          {/* Section Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--line)',
              marginBottom: '20px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={() => setActiveTab('institutions')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'institutions' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'institutions' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'institutions' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Building2 size={16} /> Institutions in State ({filteredInstitutions.length})
            </button>
            <button
              onClick={() => setActiveTab('enrolments')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'enrolments' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'enrolments' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'enrolments' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} /> State Enrolment Ledger ({stateEnrolments.length})
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'transfers' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'transfers' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'transfers' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ArrowRightLeft size={16} /> Interstate Transfers ({interstateTransfers.length})
            </button>
            <button
              onClick={() => setActiveTab('intake')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'intake' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'intake' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'intake' ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <TrendingUp size={16} /> State Intake Compliance
            </button>
          </div>

          {/* TAB 1: Institutions in State */}
          {activeTab === 'institutions' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">AICTE-Approved Institutions ({selectedState})</h3>
                  <p className="panel-subtitle">
                    Recognized degree-granting technical campuses under jurisdictional purview.
                  </p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Institution Code</th>
                      <th>College Name</th>
                      <th>Location / City</th>
                      <th>Classification</th>
                      <th style={{ textAlign: 'right' }}>Sanctioned Seats</th>
                      <th style={{ textAlign: 'right' }}>Admitted</th>
                      <th style={{ textAlign: 'right' }}>Capacity Used</th>
                      <th>Compliance Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstitutions.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '32px' }}>
                          <EmptyState
                            title="No Institutions Found"
                            message={`No institutions registered under ${selectedState} jurisdiction.`}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredInstitutions.map((inst) => {
                        const pct =
                          inst.approvedIntake > 0
                            ? Math.round((inst.admittedCount / inst.approvedIntake) * 100)
                            : 0
                        return (
                          <tr key={inst.id}>
                            <td>
                              <span className="code-pill">{inst.id}</span>
                            </td>
                            <td>
                              <strong>{inst.name}</strong>
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                                {inst.city}, {inst.state}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {inst.type}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {inst.approvedIntake.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {inst.admittedCount.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: pct > 100 ? 'var(--critical)' : 'var(--foreground)',
                                }}
                              >
                                {pct}%
                              </span>
                            </td>
                            <td>
                              {inst.alertsCount > 0 ? (
                                <StatusBadge
                                  tone="amber"
                                  label={`${inst.alertsCount} Alert${inst.alertsCount > 1 ? 's' : ''}`}
                                />
                              ) : (
                                <StatusBadge tone="green" label="Compliant" />
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link
                                to={`/institution-dashboard?institution_id=${inst.id}`}
                                className="button-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                View Console
                              </Link>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: State Enrolment Ledger */}
          {activeTab === 'enrolments' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">State Student Enrolment Registry</h3>
                  <p className="panel-subtitle">
                    Active student records registered under {selectedState} technical institutions.
                  </p>
                </div>
                <Link to="/enrolments" className="button-secondary" style={{ fontSize: '12px' }}>
                  Full Central Enrolment Ledger
                </Link>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Enrolment ID</th>
                      <th>Student Reference</th>
                      <th>APAAR ID</th>
                      <th>Institution</th>
                      <th>Programme</th>
                      <th>Academic Year</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateEnrolments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                          <EmptyState
                            title="No Enrolments Found"
                            message={`No active enrolment records in ${selectedState}.`}
                          />
                        </td>
                      </tr>
                    ) : (
                      stateEnrolments.slice(0, 15).map((e) => (
                        <tr key={e.id}>
                          <td>
                            <span className="code-pill">ENR-{String(e.id).padStart(4, '0')}</span>
                          </td>
                          <td>
                            <Link to={`/students/${e.student_ref}`} style={{ fontWeight: 600 }}>
                              {e.student_ref}
                            </Link>
                          </td>
                          <td>
                            <code>{maskId(e.apaar_id)}</code>
                          </td>
                          <td>{e.institution_name}</td>
                          <td>{e.programme_name}</td>
                          <td>{e.academic_year}</td>
                          <td>
                            <StatusBadge
                              label={e.enrolment_status}
                              tone={e.enrolment_status === 'Active' ? 'green' : e.enrolment_status === 'Withdrawn' ? 'amber' : 'blue'}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Interstate Transfers */}
          {activeTab === 'transfers' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">Interstate Student Migration & Mobility Ledger</h3>
                  <p className="panel-subtitle">
                    Tracking cross-state student movements affecting {selectedState} intake quotas and degree integrity.
                  </p>
                </div>
                <Link to="/transfers" className="button-secondary" style={{ fontSize: '12px' }}>
                  Central Transfer Ledger
                </Link>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Reference</th>
                      <th>APAAR ID</th>
                      <th>Origin State & College</th>
                      <th style={{ textAlign: 'center' }}>Direction</th>
                      <th>Destination State & College</th>
                      <th>Movement Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interstateTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                          <EmptyState
                            title="No Interstate Migrations"
                            message={`No cross-state transfers detected involving ${selectedState}.`}
                          />
                        </td>
                      </tr>
                    ) : (
                      interstateTransfers.map((t, idx) => (
                        <tr key={idx}>
                          <td>
                            <Link to={`/students/${t.student_ref}`} style={{ fontWeight: 600 }}>
                              {t.student_ref}
                            </Link>
                          </td>
                          <td>
                            <code>{maskId(t.apaar_id)}</code>
                          </td>
                          <td>
                            <strong>{t.from_state}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {t.from_inst}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <ArrowRightLeft size={16} style={{ color: 'var(--primary)' }} />
                          </td>
                          <td>
                            <strong>{t.to_state}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {t.to_inst}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background:
                                  t.type === 'inbound'
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : t.type === 'outbound'
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(59, 130, 246, 0.1)',
                                color:
                                  t.type === 'inbound'
                                    ? '#059669'
                                    : t.type === 'outbound'
                                    ? '#dc2626'
                                    : '#2563eb',
                              }}
                            >
                              {t.type.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <StatusBadge
                              label={t.status}
                              tone={t.status === 'Active' ? 'green' : 'blue'}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: State Intake Compliance */}
          {activeTab === 'intake' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">AICTE Sanctioned Quota Compliance ({selectedState})</h3>
                  <p className="panel-subtitle">
                    Programme-level seat allocation audit across state institutions.
                  </p>
                </div>
                <Link to="/intake" className="button-secondary" style={{ fontSize: '12px' }}>
                  All Intake Audits
                </Link>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Programme Code</th>
                      <th>Academic Year</th>
                      <th style={{ textAlign: 'right' }}>Sanctioned Seats</th>
                      <th style={{ textAlign: 'right' }}>Admitted Seats</th>
                      <th style={{ textAlign: 'right' }}>Utilization</th>
                      <th>Compliance Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakeReports
                      .filter((r) => stateInstitutionIds.has(r.institution_id))
                      .map((rpt, idx) => {
                        const isOver = rpt.new_admitted > rpt.approved_intake
                        return (
                          <tr key={idx}>
                            <td>
                              <strong>{rpt.institution_name}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {rpt.institution_id}
                              </div>
                            </td>
                            <td>{rpt.programme_id}</td>
                            <td>{rpt.academic_year}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {rpt.approved_intake}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {rpt.new_admitted}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isOver ? 'var(--critical)' : 'var(--foreground)',
                                }}
                              >
                                {rpt.utilization_pct}%
                              </span>
                            </td>
                            <td>
                              {isOver ? (
                                <StatusBadge tone="red" label="Over-Enrolment" />
                              ) : (
                                <StatusBadge tone="green" label="Compliant" />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
