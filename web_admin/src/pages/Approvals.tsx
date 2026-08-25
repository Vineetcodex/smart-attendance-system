import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Check,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  Briefcase,
  Mail,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api, Employee } from '../services/api.js';

export const Approvals: React.FC = () => {
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingEmployees();
      setPendingEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pending employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (emp: Employee) => {
    try {
      setProcessingId(emp.id);
      await api.approveEmployee(emp.id || emp.employeeCode);
      setPendingEmployees((prev) => prev.filter((e) => e.id !== emp.id && e.employeeCode !== emp.employeeCode));
      setToastMessage({
        message: `🎉 ${emp.fullName} (${emp.employeeCode}) was approved! They can now sign in and mark attendance.`,
        type: 'SUCCESS',
      });
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage({
        message: 'Error approving employee: ' + (err.response?.data?.message || err.message),
        type: 'ERROR',
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (emp: Employee) => {
    const reason = window.prompt(
      `Enter reason for rejecting ${emp.fullName}'s registration (optional):`,
      'Registration details could not be verified'
    );
    if (reason === null) return;

    try {
      setProcessingId(emp.id);
      await api.rejectEmployee(emp.id || emp.employeeCode, reason);
      setPendingEmployees((prev) => prev.filter((e) => e.id !== emp.id && e.employeeCode !== emp.employeeCode));
      setToastMessage({
        message: `❌ ${emp.fullName}'s registration has been rejected.`,
        type: 'SUCCESS',
      });
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage({
        message: 'Error rejecting employee: ' + (err.response?.data?.message || err.message),
        type: 'ERROR',
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = pendingEmployees.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-bounce ${
            toastMessage.type === 'SUCCESS'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/50 text-rose-200'
          }`}
        >
          {toastMessage.type === 'SUCCESS' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-amber-400 shrink-0" />
              Registration Approvals
            </h2>
            {pendingEmployees.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                {pendingEmployees.length} Pending
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review new employee registrations, verify facial biometrics, and approve or reject access requests.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Requests
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pending applicants by name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          Total Queue: <span className="text-amber-400 font-bold">{pendingEmployees.length}</span>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm glass-panel rounded-3xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-400" />
          Loading pending registrations...
        </div>
      ) : pendingEmployees.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800 max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">All Registrations Up To Date</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              No employee registrations are currently waiting for admin approval. New registrations from the employee portal will appear here in real time.
            </p>
          </div>
          <a
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            View Active Employee Directory ➔
          </a>
        </div>
      ) : (
        /* Pending Applications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="glass-card p-5 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 shadow-xl flex flex-col justify-between hover:border-amber-500/70 transition space-y-4"
            >
              <div className="space-y-3">
                {/* Header with Photo & Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        emp.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.fullName)}`
                      }
                      alt={emp.fullName}
                      className="w-13 h-13 rounded-2xl bg-slate-800 border-2 border-amber-400/60 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{emp.fullName}</h4>
                      <p className="text-xs font-mono text-amber-400 font-semibold">{emp.employeeCode}</p>
                      <p className="text-[11px] text-slate-400 truncate">{emp.department} • {emp.position}</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    Pending
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Shift: {emp.shiftStart || '09:00'} - {emp.shiftEnd || '18:00'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">Face ID 3-Pose Baseline Enrolled</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleApprove(emp)}
                  disabled={processingId === emp.id}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{processingId === emp.id ? 'Approving...' : 'Approve & Grant Access'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReject(emp)}
                  disabled={processingId === emp.id}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
