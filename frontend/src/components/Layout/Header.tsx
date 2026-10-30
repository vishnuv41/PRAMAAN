import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, UserCheck, Info } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing = false }) => {
  const navigate = useNavigate();

  const handleRoleChange = (role: string) => {
    if (role === 'INSTITUTION') {
      navigate('/institution-dashboard');
    } else if (role === 'AICTE') {
      navigate('/aicte-dashboard');
    } else if (role === 'VERIFIER') {
      navigate('/employer-portal');
    } else if (role === 'AUDITOR') {
      navigate('/audit');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Info className="w-3.5 h-3.5" />
          Prototype Verification Sandbox
        </span>

        {/* Perspective / Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-slate-500 font-medium">Active Role:</span>
          <select
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            defaultValue="ALL"
          >
            <option value="ALL">Administrator (Full Access)</option>
            <option value="AICTE">AICTE Regional Officer</option>
            <option value="INSTITUTION">Institution Operator / Principal</option>
            <option value="VERIFIER">Approved Employer / Verifier</option>
            <option value="AUDITOR">Read-Only Compliance Auditor</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
          title="Re-run temporal engine evaluation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Engine'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Backend Live
          </span>
        </div>
      </div>
    </header>
  );
};
