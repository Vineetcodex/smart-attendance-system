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
  Trash2,
  RotateCcw,
  Ban,
  Clock,
} from 'lucide-react';
import { api, Employee } from '../services/api.js';

export const Approvals: React.FC = () => {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Rejection Dialog Modal
  const [rejectModalEmp, setRejectModalEmp] = useState<Employee | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Registration details could not be verified.');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees();
      setAllEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch approval list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'SUCCESS' | 'ERROR') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleApprove = async (emp: Employee) => {
    try {
      setProcessingId(emp.id);
      await api.approveEmployee(emp.id || emp.employeeCode);
      setAllEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id || e.employeeCode === emp.employeeCode
            ? { ...e, isApproved: true, approvalStatus: 'APPROVED' }
            : e
        )
      );
      showToast(
        `🎉 ${emp.fullName} (${emp.employeeCode}) was approved! They can now sign in and mark attendance.`,
        'SUCCESS'
      );
    } catch (err: any) {
      showToast('Error approving employee: ' + (err.response?.data?.message || err.message), 'ERROR');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (emp: Employee) => {
    setRejectModalEmp(emp);
    setRejectionReason('Registration details could not be verified.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalEmp) return;
    const emp = rejectModalEmp;
    try {
      setProcessingId(emp.id);
      await api.rejectEmployee(emp.id || emp.employeeCode, rejectionReason);
      setAllEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id || e.employeeCode === emp.employeeCode
            ? { ...e, isApproved: false, approvalStatus: 'REJECTED', rejectionReason }
            : e
        )
      );
      showToast(`❌ ${emp.fullName}'s registration has been rejected.`, 'SUCCESS');
      setRejectModalEmp(null);
    } catch (err: any) {
      showToast('Error rejecting employee: ' + (err.response?.data?.message || err.message), 'ERROR');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (emp: Employee) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${emp.fullName} (${emp.employeeCode}) from the system?`
    );
    if (!confirmDelete) return;

    try {
      setProcessingId(emp.id);
      await api.deleteEmployee(emp.id || emp.employeeCode);
      setAllEmployees((prev) =>
        prev.filter((e) => e.id !== emp.id && e.employeeCode !== emp.employeeCode)
      );
      showToast(`🗑️ ${emp.fullName} was permanently deleted.`, 'SUCCESS');
    } catch (err: any) {
      showToast('Error deleting employee: ' + (err.response?.data?.message || err.message), 'ERROR');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = allEmployees.filter(
    (e) => e.approvalStatus === 'PENDING' || e.isApproved === false && e.approvalStatus !== 'REJECTED'
  );
  const rejectedList = allEmployees.filter((e) => e.approvalStatus === 'REJECTED');

  const currentList = activeTab === 'PENDING' ? pendingList : rejectedList;

  const filtered = currentList.filter(
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
            {pendingList.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                {pendingList.length} Pending
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Review new employee registrations, verify facial biometrics, and approve, reject, or delete records.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Tabs & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Sub-tabs */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Review ({pendingList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Rejected Queue ({rejectedList.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search applicants by name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm glass-panel rounded-3xl border border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-400" />
          Loading registrations...
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800 max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {activeTab === 'PENDING' ? 'All Registrations Up To Date' : 'No Rejected Records'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {activeTab === 'PENDING'
                ? 'No employee registrations are currently waiting for admin approval. New signups from the mobile app will appear here in real time.'
                : 'There are no rejected employee registration records.'}
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
        /* Applications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((emp) => {
            const isPending = emp.approvalStatus === 'PENDING' || (emp.isApproved === false && emp.approvalStatus !== 'REJECTED');
            const isRejected = emp.approvalStatus === 'REJECTED';

            return (
              <div
                key={emp.id}
                className={`glass-card p-5 rounded-3xl border-2 shadow-xl flex flex-col justify-between transition space-y-4 ${
                  isPending
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 hover:border-amber-500/70'
                    : 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-slate-900 to-slate-950 hover:border-rose-500/70'
                }`}
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
                        className={`w-13 h-13 rounded-2xl bg-slate-800 border-2 object-cover shrink-0 ${
                          isPending ? 'border-amber-400/60' : 'border-rose-400/60'
                        }`}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{emp.fullName}</h4>
                        <p className={`text-xs font-mono font-semibold ${isPending ? 'text-amber-400' : 'text-rose-400'}`}>
                          {emp.employeeCode}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {emp.department} • {emp.position}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {isPending ? 'Pending' : 'Rejected'}
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
                      <span className="font-medium">Face ID Baseline Enrolled</span>
                    </div>

                    {isRejected && emp.rejectionReason && (
                      <div className="pt-2 mt-1 border-t border-slate-800/60 text-rose-300 text-[11px]">
                        <span className="font-semibold block text-slate-400 text-[10px]">Rejection Reason:</span>
                        {emp.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(emp)}
                        disabled={processingId === emp.id}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{processingId === emp.id ? 'Approving...' : 'Approve'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openRejectModal(emp)}
                        disabled={processingId === emp.id}
                        className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(emp)}
                        disabled={processingId === emp.id}
                        title="Delete permanently"
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(emp)}
                        disabled={processingId === emp.id}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Approve Access</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(emp)}
                        disabled={processingId === emp.id}
                        className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Record</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Reject Registration</h3>
                  <p className="text-[11px] text-slate-400">
                    {rejectModalEmp.fullName} ({rejectModalEmp.employeeCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalEmp(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Reason for Rejection</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this registration was rejected..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
              />
              <p className="text-[11px] text-slate-500">
                This reason will be visible to the employee when they attempt to sign in.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectModalEmp.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                <span>{processingId === rejectModalEmp.id ? 'Rejecting...' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
