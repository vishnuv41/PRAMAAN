import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setAuthToken, getErrorMessage } from '../api'

interface PortalConfig {
  key: string
  name: string
  shortName: string
  title: string
  label: string
  placeholder: string
  demoUser: string
  demoPass: string
  backendRole: string
  color: string
  bg: string
  iconSvg: React.ReactNode
}

// Exactly ordered with AICTE National Portal on top as requested
export const PORTALS: PortalConfig[] = [
  {
    key: 'aicte',
    name: 'AICTE National Portal',
    shortName: 'AICTE',
    title: 'Apex regulatory oversight',
    label: 'Official national directorate username',
    placeholder: 'e.g. admin_demo',
    demoUser: 'admin_demo',
    demoPass: 'Password@2026',
    backendRole: 'administrator',
    color: '#c2650a',
    bg: '#fff1e0',
    iconSvg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="M8.5 12l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
  {
    key: 'student',
    name: 'Student Portal',
    shortName: 'Student',
    title: 'Academic ledger and verification',
    label: 'Student registration, roll no. or APAAR',
    placeholder: 'e.g. STU-DEMO-001 or aarav_sharma',
    demoUser: 'aarav_sharma',
    demoPass: 'Password@2026',
    backendRole: 'student',
    color: '#4f5fe0',
    bg: '#eef0ff',
    iconSvg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9l10-5 10 5-10 5z" />
        <path d="M6 11v5c3 2.5 9 2.5 12 0v-5" />
      </svg>
    ),
  },
  {
    key: 'college',
    name: 'College Portal',
    shortName: 'College',
    title: 'Institution registrar console',
    label: 'Official username or institutional ID',
    placeholder: 'e.g. st_joseph_demo or registrar_sjc',
    demoUser: 'st_joseph_demo',
    demoPass: 'Password@2026',
    backendRole: 'institution_officer',
    color: '#0b7fc4',
    bg: '#e4f3fc',
    iconSvg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4" />
      </svg>
    ),
  },
  {
    key: 'state',
    name: 'State Directorate Portal',
    shortName: 'State Directorate',
    title: 'State technical education authority',
    label: 'Official directorate username',
    placeholder: 'e.g. tn_state_officer or state_demo',
    demoUser: 'tn_state_officer',
    demoPass: 'Password@2026',
    backendRole: 'state_officer',
    color: '#14804f',
    bg: '#e4f6ec',
    iconSvg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [selectedPortal, setSelectedPortal] = useState<PortalConfig | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  // Auto-select portal from URL parameters e.g. /login?portal=student or ?portal=college
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const portalKey = params.get('portal')
      if (portalKey) {
        const match = PORTALS.find(
          (p) =>
            p.key.toLowerCase() === portalKey.toLowerCase() ||
            p.shortName.toLowerCase() === portalKey.toLowerCase()
        )
        if (match) {
          setSelectedPortal(match)
          const auto = params.get('auto')
          if (auto === '1' || auto === 'true') {
            setUsername(match.demoUser)
            setPassword(match.demoPass)
          }
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [])

  const handleSelectPortal = (portal: PortalConfig) => {
    setSelectedPortal(portal)
    setUsername('')
    setPassword('')
    setMsg('')
    setIsError(false)
  }

  const handleBack = () => {
    setSelectedPortal(null)
    setMsg('')
    setIsError(false)
  }

  const handleFillDemo = () => {
    if (!selectedPortal) return
    setUsername(selectedPortal.demoUser)
    setPassword(selectedPortal.demoPass)
    setIsError(false)
    setMsg(`Demo credentials filled for ${selectedPortal.name}. Click Sign in to authenticate.`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPortal) {
      setIsError(true)
      setMsg('Please select a portal to proceed.')
      return
    }

    if (!username.trim() || !password.trim()) {
      setIsError(true)
      setMsg('Please enter both username and password.')
      return
    }

    setLoading(true)
    setIsError(false)
    setMsg('Authenticating against AICTE Sentinel Security Grid...')

    try {
      const payload = {
        username: username.trim(),
        password: password.trim(),
        requested_role: selectedPortal.backendRole,
      }

      const res = await api.post('/auth/login', payload)
      const data = res.data
      const token = data.access_token || data.token
      const userObj = data.user || {}
      const backendRole = userObj.role || data.role || selectedPortal.backendRole

      if (!token) {
        setIsError(true)
        setMsg('Authentication response did not contain an access token.')
        setLoading(false)
        return
      }

      // Validate portal matches authorized permissions
      const isAuthorized =
        backendRole === selectedPortal.backendRole ||
        (backendRole === 'administrator' && ['administrator', 'reviewer', 'institution_officer', 'state_officer'].includes(selectedPortal.backendRole)) ||
        backendRole === 'prototype_admin'

      if (!isAuthorized) {
        setIsError(true)
        setMsg(`Access Denied: Authenticated role '${backendRole.replace('_', ' ')}' is not permitted for ${selectedPortal.name}.`)
        setLoading(false)
        return
      }

      // Store actual JWT in session
      setAuthToken(token)

      const sessionData = {
        id: userObj.id,
        subject: userObj.username || data.subject || username.trim(),
        username: userObj.username || username.trim(),
        role: backendRole,
        title: selectedPortal.name,
        jurisdiction: userObj.institution_id || data.institution_id || selectedPortal.title,
        institution_id: userObj.institution_id || data.institution_id,
        student_ref: userObj.student_ref || (backendRole === 'student' ? 'STU-IND-081' : null),
        apaar_id: userObj.apaar_id || (backendRole === 'student' ? '9876-2026-0081' : null),
        email: userObj.email,
        full_name: userObj.full_name,
        is_demo: false,
      }

      sessionStorage.setItem('pramaan_session_user', JSON.stringify(sessionData))
      window.dispatchEvent(new Event('pramaan:auth_changed'))

      // Destination routing based on authoritative authenticated role
      const destination =
        backendRole === 'student'
          ? '/student-dashboard'
          : backendRole === 'institution_officer'
          ? '/institution-dashboard'
          : backendRole === 'state_officer'
          ? '/state-dashboard'
          : '/admin-dashboard'

      navigate(destination)
    } catch (err: unknown) {
      // Display actual backend error and never navigate on failed authentication
      setIsError(true)
      setMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const currentColor = selectedPortal ? selectedPortal.color : '#4f5fe0'
  const currentBg = selectedPortal ? selectedPortal.bg : '#eef0ff'

  return (
    <div
      className="pramaan-login-root"
      style={
        {
          '--ink': '#0f1830',
          '--ink2': '#17234a',
          '--g': '#0b8773',
          '--g2': '#12a58e',
          '--mut': '#59647f',
          '--line': '#e1e6f0',
          '--bg': '#f5f7fb',
          '--d': "'Bricolage Grotesque', 'Figtree', sans-serif",
          '--c': currentColor,
          '--cb': currentBg,
          fontFamily: "'Figtree', system-ui, sans-serif",
          color: 'var(--ink)',
          background: 'var(--bg)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        } as React.CSSProperties
      }
    >
      <style>{`
        .pramaan-login-root * { box-sizing: border-box; }
        .pramaan-shell { display: grid; grid-template-columns: 1.05fr .95fr; min-height: 100vh; }
        .pramaan-side {
          position: relative; overflow: hidden; color: #e7edfb; padding: 56px 64px; display: flex; flex-direction: column; justify-content: space-between;
          background: radial-gradient(520px 380px at 90% 0, rgba(45,196,170,.42), transparent 70%), radial-gradient(520px 420px at 10% 105%, rgba(79,95,224,.5), transparent 70%), linear-gradient(150deg, var(--ink2), var(--ink));
        }
        .pramaan-side::before {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 44px 44px; mask-image: radial-gradient(ellipse at 70% 30%, #000, transparent 70%);
        }
        .pramaan-side > * { position: relative; }
        .pramaan-brand { display: flex; align-items: center; gap: 14px; font: 800 1.5rem var(--d); color: #fff; }
        .pramaan-brand i { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; background: linear-gradient(135deg, #1c3f8f, var(--g)); box-shadow: 0 10px 24px -8px rgba(18,165,142,.7); }
        .pramaan-brand b { color: #5fe0c6; }
        .pramaan-hero h1 { margin: 0 0 16px; font: 700 clamp(2.2rem,3.6vw,3.4rem)/1.05 var(--d); letter-spacing: -.03em; color: #fff; max-width: 30rem; }
        .pramaan-hero p { max-width: 28rem; margin: 0; color: #aebbdc; font-size: 1.05rem; line-height: 1.5; }
        .pramaan-vis { position: relative; height: 210px; margin: 34px 0 0; }
        .pramaan-sh { position: absolute; left: 0; top: 10px; width: 150px; height: 150px; }
        .pramaan-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(95,224,198,.5); animation: pramaan-rg 3.2s ease-out infinite; }
        .pramaan-ring:nth-child(2) { animation-delay: 1.1s; }
        .pramaan-ring:nth-child(3) { animation-delay: 2.2s; }
        @keyframes pramaan-rg { 0% { transform: scale(.55); opacity: .9; } 100% { transform: scale(1.25); opacity: 0; } }
        .pramaan-core {
          position: absolute; inset: 34px; border-radius: 26px; display: grid; place-items: center; color: #fff;
          background: linear-gradient(135deg, #1c3f8f, var(--g)); box-shadow: 0 20px 40px -12px rgba(0,0,0,.6); animation: pramaan-fl 5s ease-in-out infinite;
        }
        @keyframes pramaan-fl { 50% { transform: translateY(-8px); } }
        .pramaan-idc {
          position: absolute; left: 140px; top: 20px; width: 250px; transform: rotate(6deg);
          filter: drop-shadow(0 24px 28px rgba(0,0,0,.45)); animation: pramaan-fl2 6s ease-in-out infinite;
        }
        @keyframes pramaan-fl2 { 50% { transform: rotate(3deg) translateY(-10px); } }
        .pramaan-shn { animation: pramaan-sw 4.5s ease-in-out infinite; }
        @keyframes pramaan-sw { 0%, 55% { transform: translateX(-260px) skewX(-18deg); } 100% { transform: translateX(300px) skewX(-18deg); } }
        .pramaan-pts { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; color: #c9d3ea; font-size: .95rem; }
        .pramaan-pts li { display: flex; gap: 12px; align-items: center; }
        .pramaan-pts i { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: rgba(95,224,198,.16); color: #5fe0c6; font-style: normal; font-weight: 700; flex: 0 0 26px; }
        .pramaan-main { display: flex; align-items: center; justify-content: center; padding: 40px 28px; }
        .pramaan-box { width: 100%; max-width: 520px; }
        .pramaan-badge { display: inline-flex; align-items: center; gap: 10px; padding: 7px 14px; border: 1px solid var(--line); border-radius: 99px; background: #fff; font-size: .74rem; font-weight: 700; letter-spacing: .06em; color: var(--ink); }
        .pramaan-badge i { width: 9px; height: 9px; border-radius: 50%; background: #1fb877; box-shadow: 0 0 0 0 rgba(31,184,119,.6); animation: pramaan-pl 2.2s infinite; }
        @keyframes pramaan-pl { 70% { box-shadow: 0 0 0 8px rgba(31,184,119,0); } }
        .pramaan-title { margin: 22px 0 6px; font: 700 2rem/1.1 var(--d); letter-spacing: -.03em; color: var(--ink); }
        .pramaan-sub { margin: 0 0 24px; color: var(--mut); font-size: 1rem; }
        .pramaan-view { animation: pramaan-in .45s cubic-bezier(.2,.8,.2,1); }
        @keyframes pramaan-in { from { opacity: 0; transform: translateY(14px); } }
        .pramaan-pg { display: grid; gap: 12px; }
        .pramaan-pc {
          all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 16px; padding: 16px 18px;
          border: 1.5px solid var(--line); border-radius: 16px; background: #fff; cursor: pointer; transition: .2s;
        }
        .pramaan-pc:hover, .pramaan-pc:focus-visible { border-color: var(--pc-c); transform: translateY(-3px); box-shadow: 0 18px 30px -18px var(--pc-c); }
        .pramaan-pc:focus-visible { outline: 3px solid color-mix(in srgb, var(--pc-c) 40%, transparent); }
        .pramaan-ic { flex: 0 0 50px; height: 50px; border-radius: 14px; display: grid; place-items: center; background: var(--pc-cb); color: var(--pc-c); }
        .pramaan-pc b { display: block; font: 700 1.08rem var(--d); color: var(--ink); }
        .pramaan-pc small { display: block; color: var(--mut); font-size: .85rem; margin-top: 2px; }
        .pramaan-pc em { margin-left: auto; font-style: normal; color: var(--pc-c); font-weight: 700; font-size: 1.2rem; transition: transform .2s; }
        .pramaan-pc:hover em { transform: translateX(5px); }
        .pramaan-sel { margin-top: 22px; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 16px; background: var(--cb); border: 1px solid color-mix(in srgb, var(--c) 30%, #fff); }
        .pramaan-sel .pramaan-ic { background: #fff; flex-basis: 44px; height: 44px; }
        .pramaan-sel b { display: block; font: 700 1.05rem var(--d); color: var(--ink); }
        .pramaan-sel small { color: var(--mut); font-size: .84rem; display: block; }
        .pramaan-back { all: unset; margin-left: auto; cursor: pointer; padding: 9px 14px; border: 1px solid var(--line); border-radius: 10px; background: #fff; font-weight: 600; font-size: .88rem; color: var(--ink); }
        .pramaan-back:hover { background: var(--bg); }
        .pramaan-back:focus-visible, .pramaan-btn:focus-visible, .pramaan-demo:focus-visible { outline: 3px solid color-mix(in srgb, var(--c) 45%, transparent); outline-offset: 2px; }
        .pramaan-label { display: flex; justify-content: space-between; margin: 20px 0 8px; font-weight: 600; font-size: .92rem; color: var(--ink); }
        .pramaan-label span { font-weight: 500; color: var(--mut); font-size: .8rem; }
        .pramaan-f { position: relative; }
        .pramaan-f input { width: 100%; height: 52px; padding: 0 48px 0 46px; border: 1.5px solid var(--line); border-radius: 13px; font: inherit; background: #fff; transition: .15s; color: var(--ink); }
        .pramaan-f input:focus { outline: 0; border-color: var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 18%, transparent); }
        .pramaan-f svg.field-icon { position: absolute; left: 15px; top: 16px; color: #8b95ad; }
        .pramaan-f .eye { all: unset; position: absolute; right: 8px; top: 8px; width: 36px; height: 36px; display: grid; place-items: center; cursor: pointer; color: #8b95ad; border-radius: 10px; }
        .pramaan-f .eye:hover { background: var(--bg); color: var(--ink); }
        .pramaan-dm { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0; padding: 12px 14px; border: 1px dashed #c9d3ea; border-radius: 13px; background: #fafbfe; font-size: .9rem; color: var(--ink); }
        .pramaan-demo { all: unset; cursor: pointer; padding: 8px 14px; border: 1px solid var(--line); border-radius: 10px; background: #fff; font-weight: 700; font-size: .85rem; color: var(--ink); }
        .pramaan-demo:hover { border-color: var(--c); color: var(--c); }
        .pramaan-btn {
          all: unset; box-sizing: border-box; width: 100%; height: 54px; display: flex; align-items: center; justify-content: center; gap: 10px;
          border-radius: 14px; color: #fff; background: var(--c); font-weight: 700; cursor: pointer; box-shadow: 0 14px 26px -12px var(--c); transition: .2s;
        }
        .pramaan-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .pramaan-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .pramaan-msg { min-height: 22px; margin: 12px 0 0; font-size: .88rem; color: var(--mut); line-height: 1.4; }
        .pramaan-msg.err { color: #dc2626; font-weight: 600; }
        .pramaan-note { margin-top: 26px; text-align: center; color: var(--mut); font-size: .8rem; line-height: 1.5; }
        @media(max-width: 960px) {
          .pramaan-shell { grid-template-columns: 1fr; }
          .pramaan-side { padding: 32px 28px; gap: 24px; }
          .pramaan-vis, .pramaan-pts { display: none; }
          .pramaan-hero h1 { font-size: 2rem; }
        }
        @media(prefers-reduced-motion: reduce) {
          .pramaan-login-root * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Main Two-Column Shell */}
      <div className="pramaan-shell">
        {/* Left Informational & Interactive Hero Sidebar */}
        <aside className="pramaan-side">
          <div className="pramaan-brand">
            <i>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M8.5 12l2.5 2.5L16 9.5" />
              </svg>
            </i>
            <span>
              PRA<b>MAAN</b> Sentinel
            </span>
          </div>

          <div className="pramaan-hero">
            <h1>One student. One identity. One verified record.</h1>
            <p>
              National student academic identity, temporal enrolment integrity and institutional transfer registry.
            </p>

            {/* Glowing Shield & 3D Interactive Floating ID Card */}
            <div className="pramaan-vis" aria-hidden="true">
              <div className="pramaan-sh">
                <div className="pramaan-ring" />
                <div className="pramaan-ring" />
                <div className="pramaan-ring" />
                <div className="pramaan-core">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                    <path d="M8.5 12l2.5 2.5L16 9.5" />
                  </svg>
                </div>
              </div>

              {/* Tilted Card */}
              <svg className="pramaan-idc" viewBox="0 0 230 144">
                <defs>
                  <linearGradient id="pramaan-ig" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#e3f6f1" />
                  </linearGradient>
                  <linearGradient id="pramaan-sg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#12a58e" stopOpacity="0" />
                    <stop offset=".5" stopColor="#12a58e" stopOpacity=".25" />
                    <stop offset="1" stopColor="#12a58e" stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="pramaan-cc">
                    <rect width="230" height="144" rx="14" />
                  </clipPath>
                </defs>
                <rect width="230" height="144" rx="14" fill="url(#pramaan-ig)" />
                <g clipPath="url(#pramaan-cc)">
                  <rect width="230" height="5" fill="#ff9933" />
                  <rect y="8" width="230" height="5" fill="#138808" />
                  <circle cx="52" cy="76" r="26" fill="#cfe9e3" />
                  <circle cx="52" cy="68" r="10" fill="#17234a" />
                  <path d="M32 98c4-14 36-14 40 0z" fill="#17234a" />
                  <text x="92" y="48" fill="#59647f" fontSize="9" fontFamily="Figtree,sans-serif">
                    SAMPLE STUDENT ID
                  </text>
                  <text x="92" y="68" fill="#0f1830" fontSize="15" fontWeight="700" fontFamily="Bricolage Grotesque,sans-serif">
                    Aarav Menon
                  </text>
                  <text x="92" y="86" fill="#59647f" fontSize="10" fontFamily="Figtree,sans-serif">
                    XXXX XXXX 4521
                  </text>
                  <rect x="92" y="96" width="58" height="16" rx="8" fill="#12a58e" />
                  <text x="121" y="107" fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="Figtree,sans-serif">
                    VERIFIED
                  </text>
                  <rect className="pramaan-shn" x="0" y="0" width="90" height="144" fill="url(#pramaan-sg)" />
                </g>
              </svg>
            </div>
          </div>

          <ul className="pramaan-pts">
            <li>
              <i>✓</i>Role-based access, decided by the server
            </li>
            <li>
              <i>✓</i>APAAR IDs masked by default
            </li>
            <li>
              <i>✓</i>Every sign-in and action is logged
            </li>
          </ul>
        </aside>

        {/* Right Authentication Area */}
        <main className="pramaan-main">
          <div className="pramaan-box">
            <span className="pramaan-badge">
              <i />
              PROTOTYPE GATEWAY · SMART INDIA HACKATHON 2026
            </span>

            {/* View 1: 4 Portal Cards with AICTE National Portal on Top */}
            {!selectedPortal ? (
              <section className="pramaan-view">
                <h2 className="pramaan-title">Select your portal</h2>
                <p className="pramaan-sub">Choose your role to open the matching sign-in.</p>
                <div className="pramaan-pg">
                  {PORTALS.map((p) => (
                    <button
                      key={p.key}
                      className="pramaan-pc"
                      onClick={() => handleSelectPortal(p)}
                      style={
                        {
                          '--pc-c': p.color,
                          '--pc-cb': p.bg,
                        } as React.CSSProperties
                      }
                    >
                      <span className="pramaan-ic">{p.iconSvg}</span>
                      <span>
                        <b>{p.name}</b>
                        <small>{p.title}</small>
                      </span>
                      <em>→</em>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              /* View 2: Form with Selected Portal Header Pill and Back Button */
              <section className="pramaan-view">
                <div className="pramaan-sel">
                  <span className="pramaan-ic">{selectedPortal.iconSvg}</span>
                  <span>
                    <b>{selectedPortal.name}</b>
                    <small>{selectedPortal.title}</small>
                  </span>
                  <button
                    type="button"
                    className="pramaan-back"
                    onClick={handleBack}
                  >
                    Change portal
                  </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <label htmlFor="pramaan-u" className="pramaan-label">
                    <b>{selectedPortal.label}</b>
                  </label>
                  <div className="pramaan-f">
                    <svg className="field-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c1-5 15-5 16 0" />
                    </svg>
                    <input
                      id="pramaan-u"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={selectedPortal.placeholder}
                      required
                      autoFocus
                    />
                  </div>

                  <label htmlFor="pramaan-p" className="pramaan-label">
                    <b>Password or passphrase</b>
                    <span>Standard Sentinel security</span>
                  </label>
                  <div className="pramaan-f">
                    <svg className="field-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 018 0v3" />
                    </svg>
                    <input
                      id="pramaan-p"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter security password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="pramaan-dm">
                    <span>Evaluation and demo environment</span>
                    <button
                      type="button"
                      className="pramaan-demo"
                      onClick={handleFillDemo}
                    >
                      Fill demo account
                    </button>
                  </div>

                  <button className="pramaan-btn" type="submit" disabled={loading}>
                    <span>
                      {loading
                        ? 'Signing in...'
                        : `Sign in to ${selectedPortal.shortName} Portal`}
                    </span>{' '}
                    →
                  </button>

                  <p
                    className={`pramaan-msg ${isError ? 'err' : ''}`}
                    role="status"
                    aria-live="polite"
                  >
                    {msg}
                  </p>
                </form>
              </section>
            )}

            <p className="pramaan-note">
              Protected under the DPDP Act 2023 and AICTE statutory rules. This is a prototype, not an official government portal.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
