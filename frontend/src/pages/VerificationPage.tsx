import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Fingerprint,
  ArrowRight,
  FileCheck2,
  Briefcase,
  CheckCircle2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api, getErrorMessage, VerifierOrg, VerificationLog } from '../api'
import {
  PageHeader,
  StatusBadge,
  InfoField,
  SubNav,
  maskId,
  EmptyState,
  formatDateTime,
} from '../components/Common'

export default function VerificationPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'certificate')
  const [reference, setReference] = useState(searchParams.get('ref') || 'CERT-APAAR-2026-001')
  const [certificate, setCertificate] = useState<any>(null)
  const [verification, setVerification] = useState<any>(null)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Employer portal state
  const [orgs, setOrgs] = useState<VerifierOrg[]>([])
  const [employerStudentRef, setEmployerStudentRef] = useState('STU-DEMO-001')
  const [employerCertId, setEmployerCertId] = useState('CERT-APAAR-2026-001')
  const [employerOrgId, setEmployerOrgId] = useState('ORG-TCS-BGV')
  const [employerPurpose, setEmployerPurpose] = useState('EMPLOYMENT_VERIFICATION')
  const [employerResult, setEmployerResult] = useState<any>(null)
  const [employerBusy, setEmployerBusy] = useState(false)
  const [logs, setLogs] = useState<VerificationLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const loadLogs = () => {
    setLoadingLogs(true)
    api
      .get<{ total: number; items: VerificationLog[] }>('/verifier/logs')
      .then((res) => setLogs(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoadingLogs(false))
  }

  const verifyCertificate = async (id = reference) => {
    if (!id.trim()) return
    setError('')
    setCertificate(null)
    setVerification(null)
    setVerifying(true)
    try {
      const [detailRes, verifyRes] = await Promise.all([
        api.get(`/certificates/${encodeURIComponent(id.trim())}`),
        api.get(`/certificates/${encodeURIComponent(id.trim())}/verify`),
      ])
      setCertificate(detailRes.data)
      setVerification(verifyRes.data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (reference) void verifyCertificate(reference)
    // Load organizations
    api
      .get<{ items: VerifierOrg[] }>('/verifier/organizations')
      .then((res) => setOrgs(res.data.items || []))
      .catch(() => {})
    loadLogs()
  }, [])

  const handleEmployerVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmployerBusy(true)
    setEmployerResult(null)
    setError('')
    try {
      const res = await api.post('/verifier/verify-credential', {
        student_ref: employerStudentRef,
        certificate_id: employerCertId,
        verifier_org_id: employerOrgId,
        purpose: employerPurpose,
      })
      setEmployerResult(res.data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setEmployerBusy(false)
      loadLogs()
    }
  }

  const tabs = [
    { id: 'certificate', label: 'Cryptographic Certificate Verification' },
    { id: 'employer', label: 'Employer Background Verification Gateway' },
    { id: 'orgs', label: 'Accredited Verifier Registry', count: orgs.length },
    { id: 'logs', label: 'Verification Audit Logs', count: logs.length },
  ]

  return (
    <>
      <PageHeader
        eyebrow="CREDENTIAL INTEGRITY"
        title="Credential Verification Gateway"
        description="Public and enterprise verification portal providing cryptographic integrity proofs, student-governed consent checks, and tamper detection."
      />

      <SubNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Certificate Verification */}
      {activeTab === 'certificate' && (
        <div className="cert-layout">
          <section className="panel cert-search">
            <div className="panel-heading">
              <div>
                <h2>Verify a Certificate</h2>
                <p>Enter any educational certificate ID recorded in the sentinel ledger</p>
              </div>
              <ShieldCheck size={20} className="heading-icon" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void verifyCertificate()
              }}
              className="verify-form"
            >
              <label htmlFor="cert-ref">Verification reference</label>
              <div>
                <input
                  id="cert-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. CERT-APAAR-2026-001"
                />
                <button className="button-primary" disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Verify'} <ArrowRight size={16} />
                </button>
              </div>
            </form>

            {error && <div className="inline-error">{error}</div>}

            {verification && (
              <div
                className={`verification-result ${
                  verification.is_authentic ? 'verified' : 'unverified'
                }`}
              >
                <div className="verification-icon">
                  {verification.is_authentic ? <BadgeCheck size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <strong>
                    {verification.verification_status ??
                      (verification.is_authentic ? 'Signature Authentic & Valid' : 'Verification Failed (Tampered)')}
                  </strong>
                  <p>{verification.message ?? 'Result returned by sentinel cryptographic service.'}</p>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: 'var(--workspace)', border: '1px solid var(--line)', fontSize: '12.5px' }}>
              <strong>Cryptographic Protocol Note:</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
                This prototype validates payload signatures against an HMAC-SHA256 root key. In Phase 5, this transitions to asymmetric Ed25519 institutional public-key certificates without breaking verification endpoints.
              </p>
            </div>
          </section>

          {/* High-Fidelity Certificate Paper Preview */}
          <section className="certificate-paper">
            <div className="certificate-topline">
              <div className="cert-seal">
                <ShieldCheck size={22} />
              </div>
              <div>
                <small>PRAMAAN</small>
                <h2>Student Record Certificate</h2>
              </div>
            </div>

            <div className="cert-watermark">DEMONSTRATION</div>

            {certificate ? (
              <>
                <p className="cert-intro">
                  This educational credential is certified under the AICTE Institutional Enrolment Integrity platform.
                </p>
                <div className="cert-student">{certificate.student_name}</div>

                <div className="cert-fields">
                  <InfoField label="Student reference" value={certificate.student_ref} />
                  <InfoField label="Masked APAAR ID" value={maskId(certificate.apaar_id)} />
                  <InfoField label="Institution" value={certificate.institution_name} />
                  <InfoField label="Programme" value={certificate.programme_name} />
                  <InfoField label="Issue date" value={certificate.issue_date} />
                  <InfoField label="Completion date" value={certificate.completion_date || 'Enrolled / In Progress'} />
                </div>

                <div className="signature-state">
                  <Fingerprint size={17} />
                  <span>Algorithm: {certificate.signature_algorithm || 'HMAC-SHA256'}</span>
                  <StatusBadge
                    label={verification?.is_authentic ? 'VERIFIED BY API' : 'SIGNATURE INVALID'}
                    tone={verification?.is_authentic ? 'green' : 'red'}
                  />
                  <div className="cert-qr">
                    <QRCodeSVG
                      value={`${window.location.origin}/verification?ref=${encodeURIComponent(
                        certificate.certificate_id,
                      )}`}
                      size={64}
                      level="M"
                    />
                    <small>Verify Reference</small>
                  </div>
                </div>
              </>
            ) : (
              <div className="cert-empty">
                <FileCheck2 size={28} />
                <p>Enter a certificate reference above to inspect the authoritative record.</p>
              </div>
            )}

            <div className="cert-footnote">
              PROTOTYPE ENVIRONMENT · AICTE SIH26263 VERIFICATION LEDGER
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Employer Verification Gateway */}
      {activeTab === 'employer' && (
        <section className="panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="panel-heading" style={{ marginBottom: '18px' }}>
            <div>
              <h2>Employer Background Verification Gateway</h2>
              <p>Consent-scoped verification for enterprise hiring partners (e.g. TCS, Infosys, UPSC)</p>
            </div>
            <Briefcase size={22} className="heading-icon" />
          </div>

          <form onSubmit={handleEmployerVerify}>
            <div className="form-grid">
              <div className="form-group">
                <label>Accredited Verifier Organization</label>
                <select
                  value={employerOrgId}
                  onChange={(e) => setEmployerOrgId(e.target.value)}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.org_name} ({o.org_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Verification Purpose</label>
                <select
                  value={employerPurpose}
                  onChange={(e) => setEmployerPurpose(e.target.value)}
                >
                  <option value="EMPLOYMENT_VERIFICATION">EMPLOYMENT_VERIFICATION</option>
                </select>
              </div>

              <div className="form-group">
                <label>Student Reference</label>
                <input
                  required
                  value={employerStudentRef}
                  onChange={(e) => setEmployerStudentRef(e.target.value)}
                  placeholder="e.g. STU-DEMO-001"
                />
              </div>

              <div className="form-group">
                <label>Certificate Reference ID</label>
                <input
                  required
                  value={employerCertId}
                  onChange={(e) => setEmployerCertId(e.target.value)}
                  placeholder="e.g. CERT-APAAR-2026-001"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="button-primary" disabled={employerBusy}>
                {employerBusy ? 'Verifying with student consent...' : 'Submit Purpose-Bound Query'}
              </button>
            </div>
          </form>

          {employerResult && (
            <div style={{ marginTop: '22px', padding: '18px', borderRadius: '12px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <StatusBadge
                  label={employerResult.status === 'VALID' ? 'CONSENT VERIFIED & AUTHENTIC' : 'VERIFICATION DECLINED'}
                  tone={employerResult.status === 'VALID' ? 'green' : 'amber'}
                />
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '13.5px' }}>{employerResult.message}</p>
              {employerResult.details && (
                <pre className="code-preview">{JSON.stringify(employerResult.details, null, 2)}</pre>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Accredited Verifiers Registry */}
      {activeTab === 'orgs' && (
        <section className="panel table-panel">
          <div className="panel-heading" style={{ padding: '0 0 16px' }}>
            <div>
              <h2>Accredited Verification Organizations</h2>
              <p>Registered enterprise employers and regulatory examination cells with auditing access</p>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Organization ID</th>
                  <th>Organization Name</th>
                  <th>Classification</th>
                  <th>Contact Email</th>
                  <th>Accreditation Status</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="mono font-semibold">{org.id}</td>
                    <td><strong>{org.org_name}</strong></td>
                    <td>
                      <span className="badge-outline">{org.org_type}</span>
                    </td>
                    <td>{org.contact_email}</td>
                    <td>
                      <span className="badge-verified">
                        <CheckCircle2 size={12} /> Approved Registry Member
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {/* Tab 4: Verification Audit Logs */}
      {activeTab === 'logs' && (
        <section className="panel table-panel">
          <div className="panel-heading" style={{ padding: '0 0 16px' }}>
            <div>
              <h2>Employer & External Query Audit Logs</h2>
              <p>Tamper-evident record of BGV queries, purpose declarations, and compliance disclosures</p>
            </div>
          </div>

          {loadingLogs ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>Loading verification logs...</div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No verification query logs found"
              message="No external employer or regulatory background checks have been recorded in this ledger session."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Verifier Organization</th>
                    <th>Student Ref</th>
                    <th>APAAR ID</th>
                    <th>Certificate ID</th>
                    <th>Outcome</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono">LOG-{log.id}</td>
                      <td><strong>{log.verifier_org_name || log.verifier_org_id}</strong></td>
                      <td className="mono">{log.query_student_ref || '—'}</td>
                      <td>{log.query_apaar_id ? maskId(log.query_apaar_id) : 'Protected'}</td>
                      <td className="mono">{log.certificate_id || '—'}</td>
                      <td>
                        <StatusBadge
                          label={log.verification_outcome}
                          tone={log.verification_outcome === 'VALID' ? 'green' : 'amber'}
                        />
                      </td>
                      <td>{formatDateTime(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
