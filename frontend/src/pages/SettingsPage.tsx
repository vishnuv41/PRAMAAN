import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  BookOpenCheck,
  CheckCircle2,
  User,
  Lock,
} from 'lucide-react'
import { getErrorMessage } from '../api'
import {
  PageHeader,
  StatusBadge,
  InfoField,
  PendingBadge,
} from '../components/Common'

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null)
  const [error, setError] = useState('')

  const session = JSON.parse(sessionStorage.getItem('pramaan_session_user') || '{}')

  const rootUrl = (
    import.meta.env.VITE_API_BASE_URL || '/api/v1'
  ).replace(/\/api\/v1\/?$/, '')

  useEffect(() => {
    fetch(`${rootUrl}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`)
        setHealth(await res.json())
      })
      .catch((e: unknown) => setError(getErrorMessage(e)))
  }, [rootUrl])

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM GOVERNANCE"
        title="Settings & System Configuration"
        description="Verify backend server connectivity, examine authenticated session context, review privacy postures, and inspect external integration gateways."
      />

      <div className="settings-grid">
        {/* Section 1: API Connection */}
        <section className="panel setting-section">
          <div className="panel-heading">
            <div>
              <h2>API Connection & Health Status</h2>
              <p>FastAPI authoritative backend service</p>
            </div>
            <span
              className={`connection-tag ${
                health ? 'connected' : error ? 'disconnected' : ''
              }`}
            >
              <i />
              {health ? 'Connected & Healthy' : error ? 'Connection Error' : 'Checking'}
            </span>
          </div>

          <div className="field-list">
            <InfoField label="Authoritative Backend URL" value={rootUrl} />
            <InfoField label="Service Name" value={health?.service ?? '—'} />
            <InfoField label="Version" value={health?.version ?? '—'} />
            <InfoField label="Environment" value={health?.environment ?? 'Unknown'} />
            {error && <p className="error-hint">{error}</p>}
          </div>
        </section>

        {/* Section 2: Authenticated Session Context (Read-Only Security Ledger) */}
        <section className="panel setting-section">
          <div className="panel-heading">
            <div>
              <h2>Authenticated Security Context</h2>
              <p>Active cryptographic bearer session verified by Sentinel backend</p>
            </div>
            <Lock size={19} className="heading-icon" />
          </div>

          <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--workspace)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: '14px' }}>{session.subject || 'Authenticated User'}</strong>
              </div>
              <StatusBadge label={(session.role || 'GUEST').toUpperCase()} tone="green" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>ROLE TITLE</span>
                <b>{session.title || 'Official Role'}</b>
              </div>
              <div>
                <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>JURISDICTION / INSTITUTION</span>
                <b>{session.institution_id || session.jurisdiction || 'National Authority'}</b>
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)', fontSize: '12px', color: 'var(--muted)' }}>
              🔒 Session claims are cryptographically bound to your backend token. Role switching requires authenticating through the appropriate portal gateway.
            </div>
          </div>
        </section>

        {/* Section 3: Integrations */}
        <section className="panel setting-section">
          <div className="panel-heading">
            <div>
              <h2>External System Integrations</h2>
              <p>Inter-agency data exchange and registry connectors</p>
            </div>
            <BookOpenCheck size={19} className="heading-icon" />
          </div>

          <div className="integration-list">
            <div>
              <div>
                <strong>APAAR / ABC Academic Bank of Credits</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  National student registry identity gateway
                </p>
              </div>
              <PendingBadge label="PROTOTYPE SANDBOX" note="Live UIDAI/DigiLocker gateway pending regional deployment" />
            </div>

            <div>
              <div>
                <strong>AICTE Approval Process Handbook (APH)</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  Sanctioned capacity formulas and quota compliance
                </p>
              </div>
              <span className="badge-verified"><CheckCircle2 size={12} /> Connected</span>
            </div>

            <div>
              <div>
                <strong>Cryptographic Signing Engine</strong>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  Tamper-evident HMAC-SHA256 test root signature
                </p>
              </div>
              <span className="badge-verified"><CheckCircle2 size={12} /> Active</span>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy Posture */}
        <section className="panel setting-section">
          <div className="panel-heading">
            <div>
              <h2>Privacy and Data Safeguards</h2>
              <p>Architectural constraints protecting student data</p>
            </div>
            <ShieldCheck size={19} className="heading-icon" />
          </div>

          <ul className="privacy-list">
            <li>
              <strong>Identifier Masking:</strong> 12-digit APAAR identifiers are masked across all student tables, certificate previews, and export screens to protect privacy.
            </li>
            <li>
              <strong>Purpose-Bound Consent:</strong> Third-party employer background checks fail closed unless an active, student-granted verification consent exists.
            </li>
            <li>
              <strong>Investigative Signal Principle:</strong> Temporal overlap alerts are investigative cues for human review, never automatic assertions of fraud.
            </li>
            <li>
              <strong>Append-Only Audit:</strong> Critical system actions, dismissals, and approvals write to an immutable audit ledger with zero overwrite capability.
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
