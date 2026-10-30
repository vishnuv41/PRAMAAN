import { useState, useEffect, useRef } from 'react'
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom'
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileClock,
  FileText,
  FileUp,
  Fingerprint,
  Gauge,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'

import { api, getAuthToken, setAuthToken } from './api'
import { EmptyState } from './components/Common'

// Pages
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentDetailPage from './pages/StudentDetailPage'
import ImportsPage from './pages/ImportsPage'
import IdentityPage from './pages/IdentityPage'
import EnrolmentsPage from './pages/EnrolmentsPage'
import IntakePage from './pages/IntakePage'
import AnomaliesPage from './pages/AnomaliesPage'
import AlertsPage from './pages/AlertsPage'
import InstitutionsPage from './pages/InstitutionsPage'
import ReportsPage from './pages/ReportsPage'
import CredentialsPage from './pages/CredentialsPage'
import VerificationPage from './pages/VerificationPage'
import AuditPage from './pages/AuditPage'
import LoginPage from './pages/LoginPage'
import InstitutionDashboardPage from './pages/InstitutionDashboardPage'
import TransfersPage from './pages/TransfersPage'
import StateDashboardPage from './pages/StateDashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'

export interface NavItem {
  label: string
  path: string
  icon: any
  hasDot?: boolean
}

export const ROLE_NAVIGATION: Record<string, NavItem[]> = {
  administrator: [
    { label: 'Admin Dashboard', path: '/admin-dashboard', icon: Gauge },
    { label: 'Student Records', path: '/students', icon: Users },
    { label: 'CSV Batch Imports', path: '/imports', icon: FileUp },
    { label: 'Enrolment Monitoring', path: '/enrolments', icon: ShieldCheck },
    { label: 'Academic Transfers', path: '/transfers', icon: ArrowRightLeft },
    { label: 'Intake Compliance', path: '/intake', icon: BookOpenCheck },
    { label: 'Anomaly Detection', path: '/anomalies', icon: Activity },
    { label: 'Alerts & Reviews', path: '/reviews', icon: ClipboardList, hasDot: true },
    { label: 'Institutions', path: '/institutions', icon: Building2 },
    { label: 'State Oversight', path: '/state-dashboard', icon: MapPin },
    { label: 'Reports & Analytics', path: '/reports', icon: FileText },
    { label: 'Digital Credentials', path: '/credentials', icon: FileCheck2 },
    { label: 'Credential Verification', path: '/verification', icon: BadgeCheck },
    { label: 'Audit History', path: '/audit', icon: FileClock },
  ],
  reviewer: [
    { label: 'Regional Reviewer Console', path: '/aicte-dashboard', icon: Gauge },
    { label: 'AICTE Institutions', path: '/institutions', icon: Building2 },
    { label: 'Enrolment Ledger', path: '/enrolments', icon: ShieldCheck },
    { label: 'Transfer Review', path: '/transfers', icon: ArrowRightLeft },
    { label: 'Intake Monitoring', path: '/intake', icon: BookOpenCheck },
    { label: 'Anomaly Detection', path: '/anomalies', icon: Activity },
    { label: 'Exceptions & Alerts', path: '/reviews', icon: ClipboardList, hasDot: true },
    { label: 'Compliance Reports', path: '/reports', icon: FileText },
    { label: 'Audit Trail', path: '/audit', icon: FileClock },
  ],
  institution_officer: [
    { label: 'Campus Overview', path: '/institution-dashboard', icon: Gauge },
    { label: 'Enrolled Students', path: '/students', icon: Users },
    { label: 'Campus Enrolments', path: '/enrolments', icon: ShieldCheck },
    { label: 'Batch CSV Upload', path: '/imports', icon: FileUp },
    { label: 'Approved Intake', path: '/intake', icon: BookOpenCheck },
    { label: 'Transfers & Mobility', path: '/transfers', icon: ArrowRightLeft },
  ],
  external_verifier: [
    { label: 'Verification Console', path: '/employer-portal', icon: BadgeCheck },
    { label: 'Digital Credentials', path: '/credentials', icon: FileCheck2 },
    { label: 'Audit Log', path: '/audit', icon: FileClock },
  ],
  read_only_auditor: [
    { label: 'Compliance Audit Console', path: '/auditor-dashboard', icon: Gauge },
    { label: 'System Audit Trail', path: '/audit', icon: FileClock },
    { label: 'Student Enrolments', path: '/enrolments', icon: ShieldCheck },
    { label: 'Academic Transfers', path: '/transfers', icon: ArrowRightLeft },
    { label: 'Intake Compliance', path: '/intake', icon: BookOpenCheck },
    { label: 'Compliance Alerts', path: '/reviews', icon: ClipboardList, hasDot: true },
    { label: 'Audit Reports', path: '/reports', icon: FileText },
  ],
  state_officer: [
    { label: 'State Overview', path: '/state-dashboard', icon: Gauge },
    { label: 'Institutions in State', path: '/institutions', icon: Building2 },
    { label: 'State Enrolments', path: '/enrolments', icon: ShieldCheck },
    { label: 'Interstate Transfers', path: '/transfers', icon: ArrowRightLeft },
    { label: 'State Intake Compliance', path: '/intake', icon: BookOpenCheck },
    { label: 'Compliance Alerts', path: '/reviews', icon: ClipboardList, hasDot: true },
    { label: 'State Reports', path: '/reports', icon: FileText },
  ],
  student: [
    { label: 'Student Profile & ERP', path: '/student-dashboard', icon: Gauge },
  ],
}

export const STUDENT_SUB_TABS = [
  { id: 'aicte', label: 'AICTE', badge: 'Accreditation' },
  { id: 'student-info', label: 'Student Info' },
  { id: 'academics', label: 'Academics' },
  { id: 'student-services', label: 'Student Services' },
  { id: 'apaar-transfers', label: 'APAAR & Transfers', badge: 'Stage 6' },
]

// Fallback for demo prototype admin
ROLE_NAVIGATION.prototype_admin = ROLE_NAVIGATION.administrator

// Route to primary dashboard per role
const ROLE_PRIMARY_DASHBOARD: Record<string, string> = {
  administrator: '/admin-dashboard',
  prototype_admin: '/admin-dashboard',
  reviewer: '/aicte-dashboard',
  institution_officer: '/institution-dashboard',
  external_verifier: '/employer-portal',
  read_only_auditor: '/auditor-dashboard',
  state_officer: '/state-dashboard',
  student: '/student-dashboard',
}

function RoleGuard({
  allowedRoles,
  currentRole,
  children,
}: {
  allowedRoles: string[]
  currentRole: string
  children: JSX.Element
}) {
  const isSuperUser = currentRole === 'administrator' || currentRole === 'prototype_admin'
  if (!allowedRoles.includes(currentRole) && !isSuperUser) {
    const fallback = ROLE_PRIMARY_DASHBOARD[currentRole] || '/student-dashboard'
    return <Navigate to={fallback} replace />
  }
  return children
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pramaan_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [search, setSearch] = useState('')
  const [openAlertCount, setOpenAlertCount] = useState<number>(0)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [studentProfileExpanded, setStudentProfileExpanded] = useState(true)
  const profileRef = useRef<HTMLDivElement>(null)

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pramaan_session_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const location = useLocation()
  const navigate = useNavigate()

  // Track session authentication state
  const isAuthenticated = Boolean(getAuthToken() && currentUser)

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const saved = sessionStorage.getItem('pramaan_session_user')
        if (saved) {
          setCurrentUser(JSON.parse(saved))
        } else {
          setCurrentUser(null)
        }
      } catch {
        setCurrentUser(null)
      }
    }

    const handleUnauthorized = () => {
      setAuthToken(null)
      sessionStorage.removeItem('pramaan_session_user')
      sessionStorage.removeItem('pramaan_session_token')
      setCurrentUser(null)
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
    }

    window.addEventListener('pramaan:auth_changed', handleAuthChange)
    window.addEventListener('pramaan:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('pramaan:auth_changed', handleAuthChange)
      window.removeEventListener('pramaan:unauthorized', handleUnauthorized)
    }
  }, [location.pathname, navigate])

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('pramaan_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Dynamic alert count query based on current role
  useEffect(() => {
    if (!isAuthenticated) return

    const role = currentUser?.role
    if (role === 'institution_officer') {
      api
        .get('/institution/dashboard-summary')
        .then((res) => {
          if (res.data?.open_integrity_signals !== undefined) {
            setOpenAlertCount(res.data.open_integrity_signals)
          }
        })
        .catch(() => {})
    } else if (role === 'administrator' || role === 'reviewer' || role === 'state_officer') {
      api
        .get('/dashboard/summary')
        .then((res) => {
          if (res.data?.open_alerts !== undefined) {
            setOpenAlertCount(res.data.open_alerts)
          }
        })
        .catch(() => {})
    }
  }, [location.pathname, isAuthenticated, currentUser?.role])

  // Sign out handler
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    setAuthToken(null)
    sessionStorage.removeItem('pramaan_session_token')
    sessionStorage.removeItem('pramaan_session_user')
    setCurrentUser(null)
    setProfileDropdownOpen(false)
    navigate('/login')
  }

  // If on /login page, display unified login interface with zero shell chrome
  if (location.pathname === '/login') {
    return <LoginPage />
  }

  // Route Guard: Redirect unauthenticated requests to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Active navigation items for the authenticated user's role
  const activeRole = currentUser?.role || 'administrator'
  const navItems = ROLE_NAVIGATION[activeRole] || ROLE_NAVIGATION.administrator

  const active =
    navItems.find((item) => item.path === location.pathname)?.label ??
    (location.pathname.startsWith('/students/')
      ? 'Student Profile'
      : location.pathname.startsWith('/certificates')
      ? 'Digital Credentials'
      : location.pathname === '/admin-dashboard'
      ? 'National Admin Dashboard'
      : location.pathname === '/aicte-dashboard'
      ? 'AICTE Reviewer Console'
      : location.pathname === '/institution-dashboard'
      ? 'Institution Registrar'
      : location.pathname === '/employer-portal'
      ? 'Employer Verification Portal'
      : location.pathname === '/auditor-dashboard'
      ? 'Compliance Auditor'
      : location.pathname === '/state-dashboard'
      ? 'State Directorate'
      : location.pathname === '/transfers'
      ? 'Academic Transfer Ledger'
      : 'Workspace')

  // Helper to render role-specific home page at `/`
  const renderHomeDashboard = () => {
    switch (activeRole) {
      case 'student':
        return <StudentDashboardPage />
      case 'reviewer':
        return <InstitutionsPage />
      case 'institution_officer':
        return <InstitutionDashboardPage />
      case 'external_verifier':
        return <VerificationPage />
      case 'read_only_auditor':
        return <AuditPage />
      case 'state_officer':
        return <StateDashboardPage />
      case 'administrator':
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="app-shell">
      {/* Responsive Collapsible Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}
        aria-label="Main sidebar"
      >
        <div
          className="brand"
          onClick={toggleCollapse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleCollapse()
            }
          }}
          title={
            collapsed
              ? 'Click PRAMAAN icon to expand sidebar (Ctrl+B)'
              : 'Click PRAMAAN icon to collapse sidebar (Ctrl+B)'
          }
        >
          <div className="brand-mark" aria-label="Toggle sidebar collapse">
            <Fingerprint size={23} />
          </div>
          <div className="brand-text">
            <strong>
              PRA<span>MAAN</span>
            </strong>
            <small>AICTE Sentinel Console</small>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={(e) => {
              e.stopPropagation()
              setMobileOpen(false)
            }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Designation Badge */}
        {!collapsed && (
          <div
            style={{
              padding: '6px 14px 10px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'inline-block',
              }}
            />
            {currentUser?.title || activeRole.replace('_', ' ')}
          </div>
        )}

        <div className="nav-caption">
          {collapsed ? '·' : activeRole === 'state_officer' ? 'STATE DIRECTORATE' : `${activeRole.toUpperCase().replace('_', ' ')} WORKSPACE`}
        </div>

        <nav className="side-nav">
          {activeRole === 'student' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {/* Expandable Student Profile & ERP Tree item */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (location.pathname !== '/student-dashboard') {
                      navigate('/student-dashboard')
                    }
                    setStudentProfileExpanded(!studentProfileExpanded)
                  }}
                  className={`nav-link ${location.pathname === '/student-dashboard' ? 'active' : ''}`}
                  style={{
                    width: '100%',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: location.pathname === '/student-dashboard'
                      ? 'linear-gradient(90deg, rgba(45, 196, 170, .22), rgba(45, 196, 170, .05))'
                      : 'transparent',
                    boxShadow: location.pathname === '/student-dashboard'
                      ? 'inset 0 0 0 1px rgba(45, 196, 170, .22)'
                      : 'none',
                  }}
                >
                  <Gauge size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span className="nav-label" style={{ flex: 1 }}>Student Profile & ERP</span>
                  {!collapsed && (
                    studentProfileExpanded ? <ChevronDown size={14} style={{ opacity: 0.7 }} /> : <ChevronRight size={14} style={{ opacity: 0.7 }} />
                  )}
                </button>

                {/* Sub-menu with vertical tree line like shadcn */}
                {studentProfileExpanded && !collapsed && (
                  <div className="nav-sub-menu">
                    {STUDENT_SUB_TABS.map((sub) => {
                      const currentTab = location.pathname === '/student-dashboard'
                        ? (new URLSearchParams(location.search).get('tab') || 'aicte')
                        : ''
                      const isSubActive = location.pathname === '/student-dashboard' && currentTab === sub.id
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            navigate(`/student-dashboard?tab=${sub.id}`)
                            setMobileOpen(false)
                          }}
                          className={`nav-sub-item ${isSubActive ? 'active' : ''}`}
                        >
                          <span>{sub.label}</span>
                          {sub.badge && <span className="sub-badge">{sub.badge}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            navItems.map(({ label, path, icon: Icon, hasDot }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                data-tooltip={label}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="nav-label">{label}</span>
                {hasDot && openAlertCount > 0 && <i className="nav-dot" />}
              </NavLink>
            ))
          )}
        </nav>

        <div className="sidebar-bottom">
          <div
            className="sidebar-user-pill"
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            title="Account Profile & Sign Out"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {currentUser?.subject ? currentUser.subject[0].toUpperCase() : 'A'}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.full_name || currentUser?.subject || 'Aarav Sharma'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3c6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.email || (activeRole === 'student' ? 'aarav.sharma@dtu.ac.in' : 'Official Portal')}
                </div>
              </div>
            )}
            {!collapsed && <ChevronDown size={14} style={{ color: '#94a3c6', flexShrink: 0 }} />}
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Workspace with collapsible dynamic margin */}
      <main className={`workspace ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile navigation"
            >
              <Menu size={20} />
            </button>
            <button
              className="icon-button desktop-sidebar-trigger"
              onClick={toggleCollapse}
              title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <span className="crumb-root">PRAMAAN</span>
            <ChevronRight size={14} />
            <strong>{active}</strong>
          </div>

          <div className="topbar-actions">
            {/* Global search (scoped for authorized roles) */}
            {activeRole !== 'external_verifier' && (
              <form
                className="global-search"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (search.trim()) {
                    navigate(`/students?search=${encodeURIComponent(search.trim())}`)
                  }
                }}
              >
                <Search size={16} />
                <input
                  aria-label="Search records by APAAR ID or reference"
                  placeholder="Search APAAR / Student Ref..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <kbd>↵</kbd>
              </form>
            )}

            {/* Notification Bell */}
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => {
                if (activeRole === 'institution_officer') {
                  navigate('/institution-dashboard')
                } else {
                  navigate('/reviews')
                }
              }}
              title={`${openAlertCount} active compliance alerts`}
            >
              <Bell size={18} />
              {openAlertCount > 0 && <i />}
            </button>

            {/* User Profile & Session Dropdown */}
            <div className="profile-wrapper" ref={profileRef} style={{ position: 'relative' }}>
              <div
                className="profile"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                style={{ cursor: 'pointer' }}
                title="View user credentials or sign out"
              >
                <div className="profile-avatar">
                  {(currentUser?.title || 'PR')
                    .split(' ')
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="profile-meta">
                  <strong>{currentUser?.title || 'PRAMAAN Officer'}</strong>
                  <small>{currentUser?.jurisdiction || activeRole}</small>
                </div>
                <ChevronDown size={15} />
              </div>

              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '260px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.12))',
                    padding: '12px',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      borderBottom: '1px solid var(--line)',
                      paddingBottom: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>
                      {currentUser?.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {currentUser?.email || 'Authorized Gov Credential'}
                    </div>
                    <div
                      style={{
                        marginTop: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--primary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {activeRole.replace('_', ' ')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        navigate(ROLE_PRIMARY_DASHBOARD[activeRole] || '/')
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--foreground)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--workspace)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <User size={15} /> My Primary Console
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--critical, #dc2626)',
                        marginTop: '4px',
                        borderTop: '1px solid var(--line)',
                        paddingTop: '10px',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <LogOut size={15} /> Sign Out Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Page Area */}
        <div className="page-area">
          <Routes>
            {/* Dynamic Role-Based Home Route */}
            <Route path="/" element={renderHomeDashboard()} />

            {/* Official Persona Dedicated Dashboards with Strict RoleGuard */}
            <Route
              path="/student-dashboard"
              element={
                <RoleGuard allowedRoles={['student']} currentRole={activeRole}>
                  <StudentDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <RoleGuard allowedRoles={['administrator', 'prototype_admin']} currentRole={activeRole}>
                  <DashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/aicte-dashboard"
              element={
                <RoleGuard allowedRoles={['reviewer', 'administrator', 'prototype_admin']} currentRole={activeRole}>
                  <InstitutionsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/institution-dashboard"
              element={
                <RoleGuard allowedRoles={['institution_officer']} currentRole={activeRole}>
                  <InstitutionDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/employer-portal"
              element={
                <RoleGuard allowedRoles={['external_verifier']} currentRole={activeRole}>
                  <VerificationPage />
                </RoleGuard>
              }
            />
            <Route
              path="/auditor-dashboard"
              element={
                <RoleGuard allowedRoles={['read_only_auditor']} currentRole={activeRole}>
                  <AuditPage />
                </RoleGuard>
              }
            />
            <Route
              path="/state-dashboard"
              element={
                <RoleGuard allowedRoles={['state_officer']} currentRole={activeRole}>
                  <StateDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/transfers"
              element={
                activeRole === 'student' ? (
                  <Navigate to="/student-dashboard?tab=apaar-transfers" replace />
                ) : (
                  <RoleGuard allowedRoles={['institution_officer', 'state_officer', 'reviewer', 'read_only_auditor']} currentRole={activeRole}>
                    <TransfersPage />
                  </RoleGuard>
                )
              }
            />

            {/* Standard Workspaces with Strict RoleGuard */}
            <Route
              path="/students"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'state_officer', 'reviewer']} currentRole={activeRole}>
                  <StudentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/students/:studentRef"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'state_officer', 'reviewer']} currentRole={activeRole}>
                  <StudentDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/imports"
              element={
                <RoleGuard allowedRoles={['institution_officer']} currentRole={activeRole}>
                  <ImportsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/identity"
              element={
                <RoleGuard allowedRoles={['reviewer', 'institution_officer']} currentRole={activeRole}>
                  <IdentityPage />
                </RoleGuard>
              }
            />
            <Route
              path="/enrolments"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'state_officer', 'reviewer', 'read_only_auditor']} currentRole={activeRole}>
                  <EnrolmentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/intake"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'state_officer', 'reviewer', 'read_only_auditor']} currentRole={activeRole}>
                  <IntakePage />
                </RoleGuard>
              }
            />
            <Route
              path="/anomalies"
              element={
                <RoleGuard allowedRoles={['reviewer']} currentRole={activeRole}>
                  <AnomaliesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/reviews"
              element={
                <RoleGuard allowedRoles={['reviewer', 'state_officer', 'read_only_auditor']} currentRole={activeRole}>
                  <AlertsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/institutions"
              element={
                <RoleGuard allowedRoles={['reviewer', 'state_officer']} currentRole={activeRole}>
                  <InstitutionsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard allowedRoles={['reviewer', 'state_officer', 'read_only_auditor']} currentRole={activeRole}>
                  <ReportsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/credentials"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'external_verifier']} currentRole={activeRole}>
                  <CredentialsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/certificates"
              element={
                <RoleGuard allowedRoles={['institution_officer', 'external_verifier']} currentRole={activeRole}>
                  <CredentialsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/verification"
              element={
                <RoleGuard allowedRoles={['external_verifier']} currentRole={activeRole}>
                  <VerificationPage />
                </RoleGuard>
              }
            />
            <Route
              path="/audit"
              element={
                <RoleGuard allowedRoles={['read_only_auditor', 'reviewer', 'external_verifier']} currentRole={activeRole}>
                  <AuditPage />
                </RoleGuard>
              }
            />
            <Route path="/settings" element={<Navigate to="/" replace />} />

            {/* Catch-all 404 */}
            <Route
              path="*"
              element={
                <EmptyState
                  title="Page Not Found"
                  message="The requested workspace or endpoint does not exist under your role scope."
                />
              }
            />
          </Routes>
        </div>

        {/* Official Footer with Synthetic Demonstration Notice */}
        <footer className="footer">
          <span>
            PRAMAAN <span className="footer-sep">/</span> APAAR Sentinel National Verification
            Framework
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            DEMO MODE · Synthetic Academic Records · Authenticated as {currentUser?.title}
          </span>
        </footer>
      </main>
    </div>
  )
}
