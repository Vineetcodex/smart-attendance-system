import React from 'react';
import { MapPin, Radio, LogOut, Building } from 'lucide-react';
import { Organization } from '../services/api.js';

interface Props {
  org: Organization | null;
  onLogout: () => void;
}

export const Navbar: React.FC<Props> = ({ org, onLogout }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Organization breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Building className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">{org?.name || 'Organization'}</span>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            {org ? `${org.latitude.toFixed(4)}, ${org.longitude.toFixed(4)} (${org.geofenceRadiusMeters}m)` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Right: Live Connection Indicator & Mobile App Link & Admin User */}
      <div className="flex items-center gap-3">
        <a
          href="/mobile"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
          title="Open Employee Mobile Camera App"
        >
          <span>📱</span>
          <span>Open Employee Mobile App</span>
        </a>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-400">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span className="font-medium">Live Feed Connected</span>
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-200">HR Administrator</p>
            <p className="text-[11px] text-slate-400">admin@drptech.com</p>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
