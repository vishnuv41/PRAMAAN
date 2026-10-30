import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Search,
  CheckCircle2,
  Flame,
} from 'lucide-react'
import { api, getErrorMessage, CertificateItem } from '../api'
import {
  PageHeader,
  StateMessage,
  EmptyState,
  StatusBadge,
  MetricCard,
  maskId,
} from '../components/Common'

export default function CredentialsPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([])
  const [search, setSearch] = useState('')
  const [tamperingId, setTamperingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api
      .get<{ items: CertificateItem[] }>('/certificates')
      .then((res) => setCertificates(res.data.items || []))
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const simulateTamper = async (certId: string) => {
    if (
      !window.confirm(
        `Simulate tampering with ${certId}? This will deliberately mutate the payload in the backend to demonstrate that the cryptographic verification catches unauthorized edits.`,
      )
    )
      return
    setTamperingId(certId)
    try {
      const res = await api.post(`/certificates/${encodeURIComponent(certId)}/simulate-tamper`)
      alert(
        `Tamper simulation active: ${res.data.message || 'Payload mutated'}. When verified, signature will fail!`,
      )
      load()
    } catch (e) {
      alert(getErrorMessage(e))
    } finally {
      setTamperingId(null)
    }
  }

  const filtered = certificates.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        c.certificate_id.toLowerCase().includes(q) ||
        c.student_name.toLowerCase().includes(q) ||
        c.student_ref.toLowerCase().includes(q) ||
        c.institution_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <>
      <PageHeader
        eyebrow="CRYPTOGRAPHIC LEDGER"
        title="Digital Educational Credentials"
        description="Tamper-evident student record certificates sealed with HMAC-SHA256 institutional signatures and verifiable across institutions."
      />

      <div className="metric-grid">
        <MetricCard
          label="Certificates on File"
          value={certificates.length}
          caption="Issued student record credentials"
          icon={FileCheck2}
          tone="blue"
        />
        <MetricCard
          label="Signing Algorithm"
          value="HMAC-SHA256"
          caption="Sealed against Sentinel root key (Prototype mode)"
          icon={Fingerprint}
          tone="green"
        />
        <MetricCard
          label="Tamper Detection"
          value="Payload Hash"
          caption="Any byte alteration triggers signature invalidation"
          icon={ShieldCheck}
          tone="slate"
        />
        <MetricCard
          label="Verification Gateway"
          value="Instant API"
          caption="Public & Employer verification available"
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search by certificate reference, student, college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Showing {filtered.length} of {certificates.length} certificates
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
                  <th>Certificate Reference</th>
                  <th>Student Name</th>
                  <th>Student Ref & APAAR</th>
                  <th>Institution</th>
                  <th>Programme</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th>Cryptographic Integrity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert) => (
                  <tr key={cert.certificate_id}>
                    <td className="mono font-semibold">{cert.certificate_id}</td>
                    <td><strong>{cert.student_name}</strong></td>
                    <td className="mono">
                      {cert.student_ref}
                      <small className="table-sub">{maskId(cert.apaar_id)}</small>
                    </td>
                    <td>{cert.institution_name}</td>
                    <td>{cert.programme_name}</td>
                    <td>{cert.issue_date}</td>
                    <td>
                      <StatusBadge label={cert.status} tone="blue" />
                    </td>
                    <td>
                      {cert.is_tampered ? (
                        <span className="status-badge red">
                          <AlertTriangle size={12} /> TAMPERED (SIMULATED)
                        </span>
                      ) : (
                        <span className="status-badge green">
                          <ShieldCheck size={12} /> Authentic
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          to={`/verification?ref=${encodeURIComponent(cert.certificate_id)}`}
                          className="button-small"
                        >
                          Verify Certificate
                        </Link>
                        <button
                          className="button-small button-outline"
                          title="Deliberately mutate payload to demonstrate tamper detection"
                          disabled={tamperingId === cert.certificate_id}
                          onClick={() => simulateTamper(cert.certificate_id)}
                        >
                          <Flame size={13} color="#DC2626" /> Tamper Test
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No certificates found"
            message="No credentials matched the specified criteria."
          />
        )}
      </section>
    </>
  )
}
