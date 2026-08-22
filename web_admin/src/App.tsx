import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { Dashboard } from './pages/Dashboard.js';
import { OrgSettings } from './pages/OrgSettings.js';
import { Employees } from './pages/Employees.js';
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
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar org={org} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard org={org} />} />
            <Route
              path="/org-settings"
              element={<OrgSettings org={org} onOrgUpdated={setOrg} />}
            />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/simulator" element={<Simulator org={org} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('admin_token');
  });
  const [org, setOrg] = useState<Organization | null>(null);

  // When running inside Android APK, default directly to Employee Mobile App
  const isNativeApp = Capacitor.isNativePlatform();

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
    <BrowserRouter>
      <Routes>
        {/* If installed as Android APK, always show the Employee Attendance App directly */}
        {isNativeApp ? (
          <>
            <Route path="*" element={<MobileApp />} />
          </>
        ) : (
          <>
            {/* Dedicated Public Mobile Employee App Route for browser users */}
            <Route path="/mobile" element={<MobileApp />} />

            {/* Admin Portal Routes for Web management */}
            <Route
              path="/*"
              element={
                isAuthenticated ? (
                  <AdminLayout org={org} onLogout={handleLogout} setOrg={setOrg} />
                ) : (
                  <Login onLoginSuccess={() => setIsAuthenticated(true)} />
                )
              }
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};
