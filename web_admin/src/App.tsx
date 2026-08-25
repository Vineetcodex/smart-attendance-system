import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { Dashboard } from './pages/Dashboard.js';
import { OrgSettings } from './pages/OrgSettings.js';
import { Employees } from './pages/Employees.js';
import { Approvals } from './pages/Approvals.js';
import { Reports } from './pages/Reports.js';
import { Simulator } from './pages/Simulator.js';
import { Login } from './pages/Login.js';
import { MobileApp } from './pages/MobileApp.js';
import { api, Organization } from './services/api.js';

const AdminLayout: React.FC<{
  org: Organization | null;
  onLogout: () => void;
  setOrg: (org: Organization) => void;
}> = ({ org, onLogout, setOrg }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Navbar
          org={org}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard org={org} />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/employees" element={<Employees />} />
            <Route
              path="/org-settings"
              element={<OrgSettings org={org} onOrgUpdated={setOrg} />}
            />
            <Route path="/reports" element={<Reports />} />
            <Route path="/simulator" element={<Simulator org={org} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Application Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
            ✨
          </div>
          <h2 className="text-base font-bold">DRP Technology Portal</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            App successfully initialized. Click below to enter your employee attendance dashboard.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
          >
            Launch Employee Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('admin_token');
  });
  const [org, setOrg] = useState<Organization | null>(null);

  const fetchOrg = async () => {
    try {
      const data = await api.getOrganization();
      setOrg(data);
    } catch (err) {
      console.error('Error fetching org data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrg();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* 1. Root and /mobile ALWAYS open the Employee Attendance Mobile Portal */}
          <Route path="/" element={<MobileApp />} />
          <Route path="/mobile" element={<MobileApp />} />

          {/* 2. /admin is dedicated for Admin Management */}
          <Route
            path="/admin/*"
            element={
              isAuthenticated ? (
                <AdminLayout org={org} onLogout={handleLogout} setOrg={setOrg} />
              ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
              )
            }
          />

          {/* Fallback to Employee App */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
