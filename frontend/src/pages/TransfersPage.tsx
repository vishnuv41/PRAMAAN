import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  PlusCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import { api, getErrorMessage } from '../api'
import { PageHeader } from '../components/Common'

export interface TransferRecord {
  id: number
  transfer_id: string
  student_ref: string
  apaar_id: string
  student_name: string
  source_institution_id: string
  source_institution_name: string
  source_state: string
  destination_institution_id: string
  destination_institution_name: string
  destination_state: string
  is_interstate: boolean
  programme_id: string
  programme_name: string
  academic_year: string
  status: string
  stage: number
  reason: string
  initiated_by: string
  created_at: string
  released_at?: string
  admitted_at?: string
  completed_at?: string
  timeline?: Array<{
    stage: number
    status: string
    timestamp: string
    actor: string
    comment: string
  }>
}

const INSTITUTIONS = [
  { id: 'INST-CHENNAI-SJC', name: "St. Joseph's College of Engineering (Tamil Nadu)" },
  { id: 'INST-DELHI-DTU', name: 'Delhi Technological University (Delhi)' },
  { id: 'INST-DELHI-IIITD', name: 'Indraprastha Institute of IT Delhi (Delhi)' },
  { id: 'INST-DELHI-NSUT', name: 'Netaji Subhas University of Technology (Delhi)' },
  { id: 'INST-MUMBAI-IITB', name: 'IIT Bombay External Extension (Maharashtra)' },
  { id: 'INST-PUNE-COEP', name: 'COEP Technological University (Maharashtra)' },
  { id: 'INST-TRICHY-NITT', name: 'National Institute of Technology Trichy (Tamil Nadu)' },
]

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null)

  // Initiate Modal State
  const [initiateModalOpen, setInitiateModalOpen] = useState(false)
  const [initiateStudentRef, setInitiateStudentRef] = useState('')
  const [initiateDestInst, setInitiateDestInst] = useState('INST-DELHI-NSUT')
  const [initiateReason, setInitiateReason] = useState('')
  const [submittingInitiate, setSubmittingInitiate] = useState(false)

  // Action states
  const [actionLoading, setActionLoading] = useState(false)

  const session = JSON.parse(sessionStorage.getItem('pramaan_session_user') || '{}')
  const isInstitutionOfficer = session.role === 'institution_officer'
  const isAdministrator = session.role === 'administrator' || session.role === 'prototype_admin'
  const myInstitutionId = session.institution_id || 'INST-DELHI-DTU'

  const loadTransfers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/transfers')
      const raw = res.data.items || []
      const items: TransferRecord[] = raw.map((item: any, idx: number) => {
        const id = item.transfer_id || item.id || `TRF-${idx + 1}`
        let stage = item.stage
        if (typeof stage !== 'number' || stage < 1 || stage > 6) {
          const st = (item.status || '').toUpperCase()
          if (st === 'INITIATED') stage = 1
          else if (st === 'SOURCE_REVIEW' || st === 'PENDING_SOURCE' || st === 'TRANSFER_REQUESTED') stage = 2
          else if (st === 'SOURCE_RELEASED' || st === 'RELEASED') stage = 3
          else if (st === 'DESTINATION_REVIEW' || st === 'PENDING_DESTINATION' || st === 'PENDING_ADMISSION') stage = 4
          else if (st === 'SEAT_ALLOCATED' || st === 'SEAT_VERIFIED') stage = 5
          else if (st === 'ADMITTED' || st === 'COMPLETED') stage = 6
          else stage = 2
        }

        const isInterstate = item.is_interstate !== undefined
          ? Boolean(item.is_interstate)
          : Boolean(item.source_state && item.destination_state && item.source_state !== item.destination_state)

        const timeline = item.timeline && item.timeline.length ? item.timeline : [
          {
            stage: 1,
            status: 'INITIATED',
            timestamp: item.created_at || item.initiation_date || '2026-06-01T10:00:00Z',
            actor: item.created_by || 'Student Registration Portal',
            comment: item.reason || 'Transfer application submitted for review',
          },
          ...(stage >= 3 ? [{
            stage: 3,
            status: 'RELEASED',
            timestamp: item.source_decision_at || item.released_at || '2026-07-10T14:00:00Z',
            actor: item.source_decision_by || 'Source Institute Registrar',
            comment: item.source_decision_reason || `NOC issued: ${item.noc_certificate_ref || 'Clearance granted'}`,
          }] : []),
          ...(stage >= 6 ? [{
            stage: 6,
            status: 'ADMITTED',
            timestamp: item.destination_decision_at || item.admitted_at || '2026-07-28T11:00:00Z',
            actor: item.destination_decision_by || 'Destination Institute Registrar',
            comment: item.destination_decision_reason || 'Credit transfer verified and student matriculated',
          }] : []),
        ]

        return {
          ...item,
          id: item.id || id,
          transfer_id: id,
          student_ref: item.student_ref || 'STU-IND-081',
          apaar_id: item.apaar_id || '9876-2026-0081',
          student_name: item.student_name || item.student_ref || 'Student',
          source_institution_name: item.source_institution_name || item.source_institution_id || 'Source Campus',
          destination_institution_name: item.destination_institution_name || item.destination_institution_id || 'Destination Campus',
          source_state: item.source_state || 'DELHI',
          destination_state: item.destination_state || 'KARNATAKA',
          is_interstate: isInterstate,
          stage,
          status: item.status || 'PENDING',
          timeline,
        }
      })
      setTransfers(items)
      if (selectedTransfer) {
        const selId = selectedTransfer.transfer_id || (selectedTransfer as any).id
        const updated = items.find((t: TransferRecord) => (t.transfer_id || (t as any).id) === selId)
        if (updated) setSelectedTransfer(updated)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransfers()
  }, [])

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initiateStudentRef.trim()) return
    setSubmittingInitiate(true)
    setError('')
    try {
      await api.post('/transfers/initiate', {
        student_ref: initiateStudentRef.trim(),
        destination_institution_id: initiateDestInst,
        reason: initiateReason.trim() || 'Academic transfer requested',
      })
      setActionSuccess('Student transfer initiated successfully and logged to audit ledger.')
      setInitiateModalOpen(false)
      setInitiateStudentRef('')
      setInitiateReason('')
      window.dispatchEvent(new Event('pramaan:records_updated'))
      await loadTransfers()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setSubmittingInitiate(false)
      setTimeout(() => setActionSuccess(''), 4000)
    }
  }

  const handleReleaseStudent = async (transferId: string) => {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/transfers/${transferId}/release`, {
        comment: `NOC issued by Registrar (${session.subject || 'Registrar'}). Prior enrolment withdrawn.`
      })
      setActionSuccess(`Student released successfully with No-Objection Certificate! Enrolment marked Withdrawn.`)
      window.dispatchEvent(new Event('pramaan:records_updated'))
      await loadTransfers()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionSuccess(''), 4000)
    }
  }

  const handleAdmitStudent = async (transferId: string) => {
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/transfers/${transferId}/admit`, {
        comment: `Admitted and confirmed by Registrar (${session.subject || 'Registrar'}). Enrolment activated.`
      })
      setActionSuccess(`Student admitted successfully! Enrolment activated and transfer completed across AICTE registry.`)
      window.dispatchEvent(new Event('pramaan:records_updated'))
      await loadTransfers()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionSuccess(''), 4000)
    }
  }

  const handleCancelTransfer = async (transferId: string) => {
    if (!window.confirm('Are you sure you want to cancel this transfer request?')) return
    setActionLoading(true)
    setError('')
    try {
      await api.post(`/transfers/${transferId}/cancel`, {
        comment: 'Transfer cancelled by authorized officer'
      })
      setActionSuccess('Transfer cancelled.')
      window.dispatchEvent(new Event('pramaan:records_updated'))
      await loadTransfers()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionSuccess(''), 4000)
    }
  }

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    const s = search.toLowerCase().trim()
    if (s) {
      const matchesSearch =
        (t.student_name || '').toLowerCase().includes(s) ||
        (t.student_ref || '').toLowerCase().includes(s) ||
        (t.transfer_id || '').toLowerCase().includes(s) ||
        (t.source_institution_name || '').toLowerCase().includes(s) ||
        (t.destination_institution_name || '').toLowerCase().includes(s)

      if (!matchesSearch) return false
    }

    if (statusFilter === 'PENDING') {
      return t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    }
    if (statusFilter === 'SOURCE_REVIEW') {
      return t.status === 'SOURCE_REVIEW' || t.status === 'TRANSFER_REQUESTED' || t.status === 'PENDING_SOURCE'
    }
    if (statusFilter === 'DESTINATION_REVIEW') {
      return (
        t.status === 'DESTINATION_REVIEW' ||
        t.status === 'SOURCE_RELEASED' ||
        t.status === 'RELEASED' ||
        t.status === 'PENDING_ADMISSION'
      )
    }
    if (statusFilter === 'COMPLETED') {
      return t.status === 'COMPLETED' || t.status === 'ADMITTED'
    }
    if (statusFilter === 'INTERSTATE') {
      return Boolean(t.is_interstate)
    }

    return true
  })

  // Metric counts
  const totalTransfers = transfers.length
  const completedTransfers = transfers.filter((t) => t.status === 'COMPLETED').length
  const pendingSource = transfers.filter((t) => t.stage <= 2).length
  const pendingDest = transfers.filter((t) => t.stage >= 3 && t.stage < 6).length
  const interstateCount = transfers.filter((t) => t.is_interstate).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        eyebrow="ACADEMIC MOBILITY & INTEGRITY"
        title="Student Transfer Lifecycle Ledger"
        description="Authoritative multi-stage credit transfer management, institution release & admission workflows, and temporal integrity verification."
      />

      {/* Action alerts */}
      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '10px', color: '#065f46', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '10px', color: '#b91c1c', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Metric Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TOTAL TRANSFERS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{totalTransfers}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>Recorded in Sentinel registry</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>PENDING SOURCE RELEASE</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{pendingSource}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>Awaiting source institution NOC</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>PENDING ADMISSION</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>{pendingDest}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>Released; awaiting campus admission</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>COMPLETED LIFECYCLES</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{completedTransfers}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>Fully synchronized & verified</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>INTERSTATE MIGRATIONS</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#6d28d9', marginTop: '4px' }}>{interstateCount}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>Cross-state mobility cases</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '280px', maxWidth: '440px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by student, APAAR ID, transfer ID, college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[
            { id: 'ALL', label: 'All Transfers' },
            { id: 'PENDING', label: 'In-Flight' },
            { id: 'SOURCE_REVIEW', label: 'Needs Release' },
            { id: 'DESTINATION_REVIEW', label: 'Needs Admission' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'INTERSTATE', label: 'Interstate' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: statusFilter === tab.id ? '1px solid #0d9488' : '1px solid #e2e8f0',
                background: statusFilter === tab.id ? '#f0fdfa' : '#fff',
                color: statusFilter === tab.id ? '#0d9488' : '#475569',
                fontSize: '12.5px',
                fontWeight: statusFilter === tab.id ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadTransfers}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontWeight: 600,
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} /> {loading ? 'Syncing...' : 'Refresh'}
          </button>
          {(isInstitutionOfficer || isAdministrator) && (
            <button
              onClick={() => setInitiateModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#0d9488',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
              }}
            >
              <PlusCircle size={16} /> Initiate Transfer
            </button>
          )}
        </div>
      </div>

      {/* Main Transfers Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 18px' }}>Transfer ID / Student</th>
                <th style={{ padding: '14px 18px' }}>Source Institution</th>
                <th style={{ padding: '14px 18px' }}>Destination Institution</th>
                <th style={{ padding: '14px 18px' }}>Lifecycle Stage</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No matching transfers found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const isSourceParty = isAdministrator || (isInstitutionOfficer && t.source_institution_id === myInstitutionId)
                  const isDestParty = isAdministrator || (isInstitutionOfficer && t.destination_institution_id === myInstitutionId)
                  const canRelease = isSourceParty && (t.stage === 1 || t.stage === 2)
                  const canAdmit = isDestParty && (t.stage === 3 || t.stage === 4 || t.stage === 5)
                  const isDone = t.stage === 6

                  return (
                    <tr
                      key={t.transfer_id}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => setSelectedTransfer(t)}
                    >
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.student_name}</div>
                        <div style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'monospace', marginTop: '2px' }}>
                          {t.transfer_id} · {t.student_ref}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>APAAR: {t.apaar_id}</div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.source_institution_name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>State: {t.source_state}</div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.destination_institution_name}</div>
                        <div style={{ fontSize: '11.5px', color: t.is_interstate ? '#7c3aed' : '#64748b', fontWeight: t.is_interstate ? 600 : 400 }}>
                          State: {t.destination_state} {t.is_interstate && '★ Interstate'}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isDone ? '#15803d' : '#0f172a' }}>
                            Stage {t.stage} of 6
                          </span>
                        </div>
                        {/* Mini Stepper Bar */}
                        <div style={{ display: 'flex', gap: '3px', width: '120px' }}>
                          {[1, 2, 3, 4, 5, 6].map((s) => (
                            <div
                              key={s}
                              style={{
                                height: '5px',
                                flex: 1,
                                borderRadius: '2px',
                                background: t.stage >= s ? (isDone ? '#10b981' : '#6366f1') : '#e2e8f0',
                              }}
                            />
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isDone ? '#dcfce7' : t.status.includes('RELEASE') ? '#e0f2fe' : '#fef3c7',
                          color: isDone ? '#15803d' : t.status.includes('RELEASE') ? '#0369a1' : '#b45309',
                          display: 'inline-block',
                        }}>
                          {t.status}
                        </span>
                      </td>

                      <td style={{ padding: '16px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {canRelease && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleReleaseStudent(t.transfer_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Release (Issue NOC)
                            </button>
                          )}

                          {canAdmit && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleAdmitStudent(t.transfer_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Admit Student
                            </button>
                          )}

                          {isDone && (
                            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Completed
                            </span>
                          )}

                          <button
                            onClick={() => setSelectedTransfer(t)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Timeline Modal / Drawer */}
      {selectedTransfer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TRANSFER DOSSIER
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedTransfer.student_name} ({selectedTransfer.transfer_id})
                </h2>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>SOURCE INSTITUTION</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{selectedTransfer.source_institution_name}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>State: {selectedTransfer.source_state}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>DESTINATION INSTITUTION</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{selectedTransfer.destination_institution_name}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>State: {selectedTransfer.destination_state}</div>
              </div>
            </div>

            {/* Complete 6-Stage Timeline */}
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              Chronological Audit Trail & Stepper
            </h3>

            <div style={{ position: 'relative', paddingLeft: '24px', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: '#e2e8f0' }} />

              {(selectedTransfer.timeline || []).map((event, idx) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '16px' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '3px solid #fff',
                    boxShadow: '0 0 0 1px #cbd5e1',
                  }} />
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        Stage {event.stage}: {event.status}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>{event.comment}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Actor: <b>{event.actor}</b></div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedTransfer.stage < 6 && (isInstitutionOfficer || isAdministrator) && (
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    handleCancelTransfer(selectedTransfer.transfer_id)
                    setSelectedTransfer(null)
                  }}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel Transfer
                </button>
              )}
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initiate Transfer Modal */}
      {initiateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Initiate Student Transfer
              </h2>
              <button
                onClick={() => setInitiateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInitiateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Student Reference ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-DEMO-004 or STU-DEMO-006"
                  value={initiateStudentRef}
                  onChange={(e) => setInitiateStudentRef(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Destination Institution
                </label>
                <select
                  value={initiateDestInst}
                  onChange={(e) => setInitiateDestInst(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                >
                  {INSTITUTIONS.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Transfer Justification / Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Relocation, special academic credit transfer, dual degree"
                  value={initiateReason}
                  onChange={(e) => setInitiateReason(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setInitiateModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInitiate}
                  style={{ padding: '9px 18px', borderRadius: '8px', background: '#0d9488', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submittingInitiate ? 'Initiating...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
