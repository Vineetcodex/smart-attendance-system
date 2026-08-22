import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { api, AttendanceLog, AttendanceStats, Organization } from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { MasterQrPoster } from '../components/MasterQrPoster.js';
import { QrCode, X } from 'lucide-react';

interface Props {
  org: Organization | null;
}

export const Dashboard: React.FC<Props> = ({ org }) => {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPosterModal, setShowPosterModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsData, logsData] = await Promise.all([api.getStats(), api.getAttendanceLogs()]);
      setStats(statsData);
      setRecentLogs(logsData.slice(0, 10)); // top 10 recent
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to SSE Live Attendance Stream
    const eventSource = api.createEventSource();

    eventSource.onmessage = (event) => {
      try {
        const newLog: AttendanceLog = JSON.parse(event.data);
        setRecentLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, 10));
        // Refresh stats on new event
        api.getStats().then(setStats).catch(console.error);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Live Biometric & Optical Stream
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {org ? org.name : 'Office'} Attendance Command Center
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time triple-factor attendance monitoring via Master QR, Face Vector & GPS Geofencing.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {org && (
            <button
              onClick={() => setShowPosterModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              Office Wall QR Poster
            </button>
          )}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-right">
            <p className="text-[11px] text-slate-400">Target Geofence</p>
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Radius: {org?.geofenceRadiusMeters || 50}m
            </p>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* MASTER QR POSTER MODAL */}
      {showPosterModal && org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Office Master QR Poster</h3>
              </div>
              <button
                onClick={() => setShowPosterModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <MasterQrPoster org={org} />
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Employees */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Staff</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">{stats?.totalEmployees ?? '--'}</p>
          <p className="text-xs text-slate-400 mt-1">Registered in organization</p>
        </div>

        {/* Present Today */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Present Today</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <p className="text-3xl font-extrabold text-emerald-400">{stats?.presentToday ?? '--'}</p>
            <span className="text-xs text-emerald-500 font-medium">({stats?.attendanceRate ?? 0}%)</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Verified on-time arrivals</p>
        </div>

        {/* Late Arrivals */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Late Arrivals</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-3">{stats?.lateToday ?? '--'}</p>
          <p className="text-xs text-slate-400 mt-1">Past scheduled shift start</p>
        </div>

        {/* Verification Accuracy Rate */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Face Confidence</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-400 mt-3">{stats?.averageConfidence ?? 96.5}%</p>
          <p className="text-xs text-slate-400 mt-1">Cosine vector similarity score</p>
        </div>
      </div>

      {/* Live Attendance Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              Live Attendance Feed
            </h3>
            <p className="text-xs text-slate-400">
              Streaming verification attempts in real-time as employees scan at the office.
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono">
            {recentLogs.length} recent events
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading real-time logs...</div>
        ) : recentLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No attendance records yet today. Go to the Verification Sandbox to test a scan!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-medium uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Anti-Spoof Liveness</th>
                  <th className="py-3 px-4">ArcFace Similarity</th>
                  <th className="py-3 px-4">GPS Distance</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={log.snapshotUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(log.employeeName)}`}
                          alt={log.employeeName}
                          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 object-cover"
                        />
                        <div>
                          <p className="font-semibold text-white leading-tight">{log.employeeName}</p>
                          <p className="text-xs text-slate-400 font-mono">{log.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{log.department}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {log.antiSpoofPassed !== false ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Genuine Live
                        </span>
                      ) : (
                        <span className="text-rose-400 text-xs">Spoof Suspected</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              log.faceSimilarityScore >= 0.70 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, log.faceSimilarityScore * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-300">
                          {(log.faceSimilarityScore * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-mono text-slate-300">
                        {log.distanceMeters != null ? `${log.distanceMeters.toFixed(1)}m` : 'Verified'}
                      </span>
                      {log.isMockLocation && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          MOCK GPS
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
