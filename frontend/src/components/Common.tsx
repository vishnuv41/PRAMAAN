import React from 'react'
import { AlertTriangle, ArrowRight, Database, Users, X, Info } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow ?? 'INSTITUTIONAL OVERSIGHT'}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function StateMessage({ error, retry }: { error?: string; retry?: () => void }) {
  return (
    <div className={`state-message ${error ? 'state-error' : ''}`}>
      <div className="state-icon">{error ? <AlertTriangle size={19} /> : <Database size={19} />}</div>
      <div>
        <strong>{error ? 'Unable to load data' : 'Loading records'}</strong>
        <p>{error ?? 'Connecting to the PRAMAAN API...'}</p>
        {error && retry && (
          <button className="text-button" onClick={retry}>
            Retry request <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ title, message, icon: Icon = Database }: { title: string; message: string; icon?: any }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={20} /></div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon = Users,
  tone = 'blue',
}: {
  label: string
  value: string | number
  caption: string
  icon?: any
  tone?: string
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-caption">{caption}</div>
    </article>
  )
}

export function StatusBadge({
  label,
  tone = 'blue',
}: {
  label: string
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' | string
}) {
  return <span className={`status-badge ${tone}`}>{label}</span>
}

export function PendingBadge({ label = 'PENDING BACKEND', note }: { label?: string; note?: string }) {
  return (
    <span className="badge-pending" title={note || 'Feature specification defined; live API gateway pending external deployment'}>
      <Info size={12} /> {label}
    </span>
  )
}

export function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="info-field">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export function SubNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="sub-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`sub-nav-btn ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="count-chip">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="subheading" style={{ margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div style={{ marginTop: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function maskId(value?: string | null): string {
  if (!value) return 'Not supplied'
  const digits = value.replace(/\D/g, '')
  return digits.length < 5 ? '••••' : `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}

export function isIsoDate(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function downloadFile(content: string, name: string, type: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type }))
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

export const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e4e8f1',
  boxShadow: '0 12px 32px -8px rgba(15,24,48,.18)',
  fontSize: 13,
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  color: '#121a2e',
}
