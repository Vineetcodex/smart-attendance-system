import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { api, AttendanceLog } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.js';

export const Reports: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const departments = ['ALL', 'Engineering', 'Product', 'Marketing', 'Sales', 'Human Resources'];

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAttendanceLogs({
        department: deptFilter === 'ALL' ? undefined : deptFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, deptFilter, startDate, endDate]);

  const handleExportCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      log.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            Attendance Audit Logs & Reports
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Historical attendance records with multi-factor confidence scores, entry/exit tracking, and CSV export.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition w-full sm:w-auto self-stretch sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Spreadsheet (CSV)
        </button>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
          {/* Search */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Search Employee</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Name or Code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Attendance Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present (Entry)</option>
              <option value="CHECKED_OUT">Checked Out (Departure)</option>
              <option value="LATE">Late Arrival</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Filter Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 text-xs">
          <span className="text-slate-400">
            Showing <strong className="text-white">{filteredLogs.length}</strong> records
          </span>
          {startDate && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-emerald-400 hover:underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-medium uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Work Duration</th>
                  <th className="py-3 px-4">Anti-Spoof Liveness</th>
                  <th className="py-3 px-4">ArcFace Match</th>
                  <th className="py-3 px-4">Failure Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            log.snapshotUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(log.employeeName)}`
                          }
                          alt=""
                          className="w-7 h-7 rounded-full bg-slate-800 object-cover"
                        />
                        <div>
                          <p className="font-semibold text-white">{log.employeeName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{log.employeeCode} • {log.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.punchType === 'CHECK_OUT' || log.status === 'CHECKED_OUT' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <LogOut className="w-3 h-3" />
                          Departure
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <LogIn className="w-3 h-3" />
                          Entry
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={log.status} punchType={log.punchType} />
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {log.workDurationMinutes ? (
                        <span className="text-purple-300 font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                          {Math.floor(log.workDurationMinutes / 60)}h {log.workDurationMinutes % 60}m
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.antiSpoofPassed !== false ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Genuine Live
                        </span>
                      ) : (
                        <span className="text-rose-400 text-xs font-medium">Spoof Alert</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={
                          log.faceSimilarityScore >= 0.85 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {(log.faceSimilarityScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {log.failureReason || <span className="text-slate-600">None (Passed)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
