import React from 'react';
import { MapPin, Radio, LogOut, Building, Menu } from 'lucide-react';
import { Organization } from '../services/api.js';

interface Props {
  org: Organization | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<Props> = ({ org, onLogout, onToggleSidebar }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 w-full">
      {/* Left: Mobile hamburger + Organization breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger Toggle on Mobile */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-300 min-w-0">
          <Building className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-[200px]">
            {org?.name || 'Organization'}
          </span>
          <span className="text-slate-600 hidden xs:inline">/</span>
          <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">
              {org ? `${org.latitude.toFixed(4)}, ${org.longitude.toFixed(4)} (${org.geofenceRadiusMeters}m)` : 'Loading...'}
            </span>
          </span>
        </div>
      </div>

      {/* Right: Live Connection Indicator & Mobile App Link & Admin User */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <a
          href="/mobile"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
          title="Open Employee Mobile Camera App"
        >
          <span>📱</span>
          <span className="hidden md:inline">Open Employee Mobile App</span>
          <span className="md:hidden">App</span>
        </a>

        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-400">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400 shrink-0" />
          <span className="font-medium">Live Feed</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="text-right hidden md:block">
            <p className="text-xs font-medium text-slate-200">HR Administrator</p>
            <p className="text-[11px] text-slate-400">admin@drptech.com</p>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
