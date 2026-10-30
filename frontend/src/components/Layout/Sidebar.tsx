import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  CheckCircle2,
  Building2,
  TrendingUp,
  Award,
  History,
  Settings,
  ShieldCheck,
  Building,
  Landmark,
  KeyRound,
  Briefcase,
  FileBarChart
} from 'lucide-react';

interface SidebarProps {
  openAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ openAlertsCount = 0 }) => {
  const navSections = [
    {
      title: 'DASHBOARDS',
      items: [
        { name: 'National Overview', path: '/', icon: LayoutDashboard },
        { name: 'Institution Console', path: '/institution-dashboard', icon: Building },
        { name: 'AICTE Directorate', path: '/aicte-dashboard', icon: Landmark },
      ]
    },
    {
      title: 'INTEGRITY & COMPLIANCE',
      items: [
        { name: 'Student Records', path: '/students', icon: Users },
        { name: 'Enrolment Integrity', path: '/integrity', icon: ShieldAlert, badge: openAlertsCount > 0 ? openAlertsCount : undefined },
        { name: 'Validation Centre', path: '/validation', icon: CheckCircle2 },
        { name: 'Intake Compliance', path: '/intake', icon: Building2 },
      ]
    },
    {
      title: 'VERIFICATION & PRIVACY',
      items: [
        { name: 'Student Consent (DPDP)', path: '/consent', icon: KeyRound },
        { name: 'Employer Verifier Portal', path: '/employer-portal', icon: Briefcase },
        { name: 'Sample Certificate', path: '/certificates', icon: Award },
      ]
    },
    {
      title: 'INTELLIGENCE & AUDIT',
      items: [
        { name: 'Historical Analytics', path: '/analytics', icon: TrendingUp },
        { name: 'Executive Reports', path: '/reports', icon: FileBarChart },
        { name: 'Audit Trail', path: '/audit', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
          <ShieldCheck className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">APAAR Sentinel</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
              v1.2
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">AICTE Institutional Portal</p>
        </div>
      </div>

      {/* Trust & Governance Notice Pill */}
      <div className="px-4 py-2.5 border-b border-slate-800/60 bg-slate-950/20">
        <div className="p-2 rounded-md bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-300 leading-relaxed">
          <div className="font-semibold text-teal-400 flex items-center gap-1 mb-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
            Dual Console Governance
          </div>
          <span>Institution Principal & AICTE Regional Officer Portals</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined ? (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Reviewer Identity Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-xs">
            DO
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Demo Officer (AICTE-RO)</p>
            <p className="text-[10px] text-slate-400 truncate">Regional Directorate Delhi</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
