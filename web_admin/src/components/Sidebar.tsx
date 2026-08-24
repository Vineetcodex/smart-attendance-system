import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Cpu,
  ShieldCheck,
  Building2,
  Smartphone,
  ScanLine,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navItems = [
    { to: '/admin', label: 'Live Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/employees', label: 'Employee Directory', icon: Users },
    { to: '/admin/reports', label: 'Attendance Reports', icon: FileSpreadsheet },
    { to: '/admin/org-settings', label: 'Master QR & Geofence', icon: Building2 },
    { to: '/admin/simulator', label: 'Biometric AI Lab', icon: Cpu },
    { to: '/mobile', label: '📱 Open Employee App', icon: Smartphone },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-slate-900/95 lg:bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between p-4 min-h-screen transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl shadow-emerald-950/50' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white tracking-tight leading-tight">DRP Technology</h1>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Biometric Attendance
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System Status Footer Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs mt-6 lg:mt-0">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <ScanLine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              SCRFD + ArcFace
            </span>
            <span className="text-emerald-400 font-semibold text-[10px] uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            5-Landmarks Alignment • Anti-Spoofing • 512-D Cosine Sim.
          </p>
        </div>
      </aside>
    </>
  );
};
