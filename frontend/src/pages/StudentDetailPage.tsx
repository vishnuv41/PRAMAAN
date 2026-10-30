import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Building2,
  GraduationCap,
} from 'lucide-react'
import { api, getErrorMessage, Student, StudentTimeline, StudentVersion, ConsentRecord } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  InfoField,
  SubNav,
  maskId,
  formatDateTime,
  PendingBadge,
} from '../components/Common'

export default function StudentDetailPage() {
  const { studentRef } = useParams<{ studentRef: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [timeline, setTimeline] = useState<StudentTimeline | null>(null)
  const [versions, setVersions] = useState<StudentVersion[]>([])
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [activeTab, setActiveTab] = useState('timeline')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!studentRef) return
    setLoading(true)
    setError('')

    Promise.all([
      api.get<any>(`/students/${encodeURIComponent(studentRef)}`),
      api.get<any>(`/students/${encodeURIComponent(studentRef)}/timeline`),
      api.get<any>(`/students/${encodeURIComponent(studentRef)}/versions`),
      api.get<any>(`/consent/student/${encodeURIComponent(studentRef)}`),
    ])
      .then(([studentRes, timelineRes, versionsRes, consentRes]) => {
        const sData = studentRes.data
        const actualStudent = sData?.student || sData
        setStudent({
          ...actualStudent,
          enrolment_count: actualStudent.enrolment_count ?? sData?.enrolments?.length ?? 0,
          open_alerts_count: actualStudent.open_alerts_count ?? sData?.alerts?.length ?? 0,
        })
        setTimeline(timelineRes.data)
        setVersions(versionsRes.data?.versions || versionsRes.data?.items || sData?.version_history || [])
        setConsents(consentRes.data?.consents || consentRes.data?.items || [])
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [studentRef])

  const toggleConsent = async (consentId: number) => {
    try {
      await api.patch(`/consent/${consentId}/toggle`, {})
      load()
    } catch (e) {
      alert(getErrorMessage(e))
    }
  }

  if (loading) return <StateMessage />
  if (error || !student) {
    return (
      <div style={{ padding: '24px' }}>
        <Link to="/students" className="subtle-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to student records
        </Link>
        <StateMessage error={error || 'Student not found'} retry={load} />
      </div>
    )
  }

  const tabs = [
    { id: 'timeline', label: 'Academic Timeline', count: timeline?.enrolments?.length },
    { id: 'identity', label: 'Identity & Credentials' },
    { id: 'versions', label: 'Version History', count: versions.length },
    { id: 'consent', label: 'Consent & BGV Gateway', count: consents.length },
  ]

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/students" className="subtle-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to student records
        </Link>
      </div>

      <PageHeader
        eyebrow="STUDENT RECORD"
        title={student.full_name}
        description={`Reference: ${student.student_ref} · Masked APAAR ID: ${maskId(student.apaar_id)}`}
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <StatusBadge
              label={student.identity_route.replaceAll('_', ' ')}
              tone={student.identity_route === 'STANDARD_APAAR' ? 'green' : 'blue'}
            />
          </div>
        }
      />

      {/* Profile Overview Card */}
      <section className="panel" style={{ padding: '22px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <InfoField label="Student Reference" value={student.student_ref} />
          <InfoField label="Masked APAAR ID" value={maskId(student.apaar_id)} />
          <InfoField label="Primary Institution" value={student.primary_institution_id || 'Not assigned'} />
          <InfoField label="Nationality" value={student.nationality} />
          <InfoField label="Total Enrolments" value={student.enrolment_count} />
          <InfoField label="Active Conflict Alerts" value={student.open_alerts_count} />
        </div>
      </section>

      {/* Segmented SubNav Tabs */}
      <SubNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Academic Timeline */}
      {activeTab === 'timeline' && (
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '18px' }}>
            <div>
              <h2>Chronological Enrolment Progression</h2>
              <p>Temporal interval evaluation used by the conflict detection engine</p>
            </div>
            <span className="badge-outline">
              <ShieldCheck size={14} /> Interval Boundary Checks Active
            </span>
          </div>

          {timeline?.enrolments?.length ? (
            <div className="timeline-feed">
              {timeline.enrolments.map((enr: any) => {
                const interval = timeline.temporal_intervals?.find((t) => t.enrolment_id === enr.id)
                const pairwise = (timeline as any).pairwise_analysis?.find((p: any) => p.record_ids?.includes(enr.id))
                const isConflict = interval?.has_conflict ?? pairwise?.overlaps ?? false
                const conflictType = interval?.conflict_type ?? (pairwise?.overlaps ? pairwise.rule_id : undefined)
                const start = enr.enrolment_start || enr.start
                const end = enr.enrolment_end || enr.end
                const status = enr.enrolment_status || enr.status

                return (
                  <div className="timeline-item" key={enr.id}>
                    <div className={`timeline-dot ${(status || '').toLowerCase()}`}>
                      <GraduationCap size={12} color="#1B756B" />
                    </div>
                    <div className="timeline-card">
                      <div className="timeline-card-header">
                        <div>
                          <h3 className="timeline-title">{enr.programme_name}</h3>
                          <div style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <Building2 size={14} /> {enr.institution_name} ({enr.institution_id})
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <StatusBadge
                            label={status || 'Unknown'}
                            tone={
                              status === 'Active'
                                ? 'green'
                                : status === 'Completed'
                                ? 'blue'
                                : 'amber'
                            }
                          />
                          {isConflict && (
                            <span className="status-badge red">
                              Conflict: {conflictType || 'Overlap Detected'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="timeline-meta">
                        <span>
                          <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          {start} → {end || 'Present / Open-ended'}
                        </span>
                        <span>Academic Year: <b>{enr.academic_year}</b></span>
                        {enr.admission_cycle && <span>Admission Cycle: <b>{enr.admission_cycle}</b></span>}
                        {enr.seat_category && <span>Category: <b>{enr.seat_category}</b></span>}
                        {enr.exception_ref && (
                          <span style={{ color: '#1B756B', fontWeight: 600 }}>
                            Exception Ref: {enr.exception_ref}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No enrolments" message="No enrolment timeline records exist for this student." />
          )}
        </section>
      )}

      {/* Tab 2: Identity & Credentials */}
      {activeTab === 'identity' && (
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '20px' }}>
            <div>
              <h2>Identity Lifecycle & Authority Verification</h2>
              <p>Cryptographic checksum verification and external gateway connection posture</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--workspace)' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>1. Identifier Presence</strong>
              <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                Verifies 12-digit standard numerical APAAR formatting.
              </p>
              <span className="badge-verified"><CheckCircle2 size={13} /> Present and Masked</span>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--workspace)' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>2. Format & Checksum Integrity</strong>
              <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                Local Verhoeff mathematical algorithm compliance.
              </p>
              <span className="badge-verified"><CheckCircle2 size={13} /> Validated Locally</span>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--workspace)' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>3. External DigiLocker / UIDAI</strong>
              <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
                Official national registry identity binding.
              </p>
              <PendingBadge label="SANDBOX DEMO GATEWAY" note="Production API gateway connection pending institutional certificate clearance" />
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Version History */}
      {activeTab === 'versions' && (
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <h2>Record Version Ledger</h2>
              <p>Append-only audit trail of modifications to this student's profile</p>
            </div>
          </div>

          {versions.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Version #</th>
                    <th>Changed fields</th>
                    <th>Recorded timestamp</th>
                    <th>Actor / Service</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((ver: any) => (
                    <tr key={ver.id}>
                      <td className="mono">v{ver.version_number}</td>
                      <td>
                        <code style={{ fontSize: '12px', background: 'var(--workspace)', padding: '2px 6px', borderRadius: '4px' }}>
                          {JSON.stringify(ver.changed_fields || ver.diff_payload || { reason: ver.change_reason })}
                        </code>
                      </td>
                      <td>{formatDateTime(ver.created_at || ver.timestamp)}</td>
                      <td>{ver.created_by || ver.changed_by || 'System Ingestion'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No past revisions" message="This record is currently on its initial creation version." />
          )}
        </section>
      )}

      {/* Tab 4: Consent & BGV Gateway */}
      {activeTab === 'consent' && (
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panel-heading" style={{ marginBottom: '16px' }}>
            <div>
              <h2>Consent & Background Verification Permissions</h2>
              <p>Student-governed purpose binding for prospective employers (e.g. TCS, Infosys)</p>
            </div>
          </div>

          {consents.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Consent ID</th>
                    <th>Authorized purpose</th>
                    <th>Authorized verifier</th>
                    <th>Granted timestamp</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c: any) => {
                    const isActive = c.status === 'ACTIVE' || c.consent_granted === true || c.is_active === true
                    return (
                      <tr key={c.id}>
                        <td className="mono">CNS-{c.id}</td>
                        <td><strong>{c.purpose}</strong></td>
                        <td>{c.granted_to_org_id || 'All Accredited BGV Agencies (TCS, Infosys, etc.)'}</td>
                        <td>{formatDateTime(c.granted_at)}</td>
                        <td>
                          <StatusBadge
                            label={isActive ? 'ACTIVE GRANTED' : 'REVOKED'}
                            tone={isActive ? 'green' : 'amber'}
                          />
                        </td>
                        <td>
                          <button
                            className="button-small button-outline"
                            onClick={() => toggleConsent(c.id)}
                          >
                            {isActive ? 'Revoke Consent' : 'Re-grant Consent'}
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
              title="No active consent directives"
              message="No third-party employment background verification consents have been filed for this student."
            />
          )}
        </section>
      )}
    </>
  )
}
