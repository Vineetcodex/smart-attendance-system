import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Camera,
  ShieldCheck,
  Activity,
  ScanLine,
} from 'lucide-react';
import { api, Employee, Organization } from '../services/api.js';

interface Props {
  org: Organization | null;
}

export const Simulator: React.FC<Props> = ({ org }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  // Simulator test parameters
  const [livenessMode, setLivenessMode] = useState<'GENUINE' | 'SCREEN_ATTACK' | 'PRINT_ATTACK'>('GENUINE');
  const [faceMatchMode, setFaceMatchMode] = useState<'MATCH' | 'SLIGHT_VARIATION' | 'MISMATCH'>('MATCH');
  const [locationPreset, setLocationPreset] = useState<'INSIDE' | 'OUTSIDE' | 'MOCK_GPS'>('INSIDE');
  const [simulatedLat, setSimulatedLat] = useState<string>('');
  const [simulatedLng, setSimulatedLng] = useState<string>('');

  // Simulation execution result
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    api.getEmployees().then((data) => {
      setEmployees(data);
      if (data.length > 0) setSelectedEmpId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!org) return;
    if (locationPreset === 'INSIDE') {
      // 8 meters from office
      setSimulatedLat((org.latitude + 0.00007).toFixed(6));
      setSimulatedLng((org.longitude + 0.00005).toFixed(6));
    } else if (locationPreset === 'OUTSIDE') {
      // ~450 meters away
      setSimulatedLat((org.latitude + 0.004).toFixed(6));
      setSimulatedLng((org.longitude + 0.004).toFixed(6));
    } else if (locationPreset === 'MOCK_GPS') {
      setSimulatedLat(org.latitude.toFixed(6));
      setSimulatedLng(org.longitude.toFixed(6));
    }
  }, [locationPreset, org]);

  const handleRunSimulation = async () => {
    if (!selectedEmpId) {
      alert('Please select an employee profile');
      return;
    }
    setTesting(true);
    setResult(null);

    try {
      const selectedEmp = employees.find((e) => e.id === selectedEmpId);
      if (!selectedEmp) return;

      // 1. Determine Face Vector (ArcFace 512-D)
      let testFaceVector: number[] = [];
      const baseVector =
        selectedEmp.faceEmbedding && selectedEmp.faceEmbedding.length > 0
          ? selectedEmp.faceEmbedding
          : Array.from({ length: 512 }, () => Math.random() - 0.5);

      if (faceMatchMode === 'MATCH') {
        // Subtle micro-noise for realistic 94-98% match
        testFaceVector = baseVector.map((v) => v + (Math.random() - 0.5) * 0.05);
      } else if (faceMatchMode === 'SLIGHT_VARIATION') {
        // Moderate variation ~72-76% match
        testFaceVector = baseVector.map((v) => v + (Math.random() - 0.5) * 0.25);
      } else {
        // Complete random mismatch (< 30%)
        testFaceVector = Array.from({ length: 512 }, () => Math.random() - 0.5);
      }

      // Normalize vector
      const norm = Math.sqrt(testFaceVector.reduce((a, b) => a + b * b, 0)) || 1;
      testFaceVector = testFaceVector.map((v) => v / norm);

      // 2. Determine Anti-Spoofing parameters
      let livenessScore = 0.96;
      let antiSpoofPassed = true;
      let antiSpoofVerdict = 'GENUINE_LIVE';

      if (livenessMode === 'SCREEN_ATTACK') {
        livenessScore = 0.42;
        antiSpoofPassed = false;
        antiSpoofVerdict = 'SCREEN_REPLAY';
      } else if (livenessMode === 'PRINT_ATTACK') {
        livenessScore = 0.31;
        antiSpoofPassed = false;
        antiSpoofVerdict = 'PRINT_ATTACK';
      }

      // 3. Trigger Backend Biometric Verification Endpoint
      const response = await api.verifyAttendance({
        employeeId: selectedEmp.id,
        faceEmbedding: testFaceVector,
        livenessScore,
        antiSpoofPassed,
        antiSpoofVerdict,
        latitude: parseFloat(simulatedLat),
        longitude: parseFloat(simulatedLng),
        isMockLocation: locationPreset === 'MOCK_GPS',
        snapshotUrl: selectedEmp.photoUrl,
        capturedAt: new Date().toISOString(),
      });

      setResult({
        success: true,
        status: response.status,
        message: response.message,
        details: response.details,
      });
    } catch (err: any) {
      const errResponse = err.response?.data;
      setResult({
        success: false,
        status: 'REJECTED',
        message: errResponse?.message || err.message,
        details: errResponse?.details || {},
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Cpu className="w-6 h-6 text-emerald-400" />
          Biometric Facial Recognition & Liveness Diagnostic Lab
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Stress-test SCRFD 5-landmark alignment, ArcFace 512-D cosine similarity, anti-spoofing liveness, and geofencing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Parameter Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Employee Selection */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              1. Select Target Employee
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {employees.slice(0, 4).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    selectedEmpId === emp.id
                      ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={emp.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                    alt={emp.fullName}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-white truncate">{emp.fullName}</p>
                    <p className="text-[10px] text-emerald-400 font-mono">{emp.employeeCode}</p>
                    <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Biometric Face Matching Simulation */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-emerald-400" />
              2. ArcFace 512-D Cosine Similarity Parameter
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFaceMatchMode('MATCH')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  faceMatchMode === 'MATCH'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                High Match (96%)
              </button>
              <button
                type="button"
                onClick={() => setFaceMatchMode('SLIGHT_VARIATION')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  faceMatchMode === 'SLIGHT_VARIATION'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Borderline (~74%)
              </button>
              <button
                type="button"
                onClick={() => setFaceMatchMode('MISMATCH')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  faceMatchMode === 'MISMATCH'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Mismatch (&lt;30%)
              </button>
            </div>
          </div>

          {/* Anti-Spoofing & Liveness Parameter */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              3. Anti-Spoofing & Liveness State
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setLivenessMode('GENUINE')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  livenessMode === 'GENUINE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Genuine Live Face
              </button>
              <button
                type="button"
                onClick={() => setLivenessMode('SCREEN_ATTACK')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  livenessMode === 'SCREEN_ATTACK'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Screen Replay Attack
              </button>
              <button
                type="button"
                onClick={() => setLivenessMode('PRINT_ATTACK')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  livenessMode === 'PRINT_ATTACK'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Printed Photo Attack
              </button>
            </div>
          </div>

          {/* Geofence Preset */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              4. GPS Geofencing Condition
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setLocationPreset('INSIDE')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  locationPreset === 'INSIDE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Inside Office (&lt;10m)
              </button>
              <button
                type="button"
                onClick={() => setLocationPreset('OUTSIDE')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  locationPreset === 'OUTSIDE'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Outside Geofence (450m)
              </button>
              <button
                type="button"
                onClick={() => setLocationPreset('MOCK_GPS')}
                className={`p-3 rounded-xl border text-xs font-semibold transition ${
                  locationPreset === 'MOCK_GPS'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Mock GPS Emulator
              </button>
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={handleRunSimulation}
            disabled={testing}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                Executing Biometric Verification Pipeline...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Execute Biometric Verification
              </>
            )}
          </button>
        </div>

        {/* Right Panel: Real-time Live Diagnostic Output */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 sticky top-24">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Pipeline Diagnostic Report
            </h3>

            {result ? (
              <div className="space-y-5 animate-fadeIn">
                {/* Status Badge */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    result.success
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-sm">{result.status || (result.success ? 'PRESENT' : 'REJECTED')}</p>
                    <p className="text-xs opacity-90">{result.message}</p>
                  </div>
                </div>

                {/* Biometric Factors Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Verification Metrics
                  </h4>

                  {/* Factor 1: ArcFace Cosine Match */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-medium text-white">ArcFace 512-D Similarity</p>
                        <p className="text-[10px] text-slate-400">Cosine Hypersphere Dot Product</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {result.details?.faceSimilarityScore != null
                        ? `${(result.details.faceSimilarityScore * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>

                  {/* Factor 2: Anti-Spoofing Liveness */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-medium text-white">Anti-Spoofing Liveness</p>
                        <p className="text-[10px] text-slate-400">Texture FFT + EAR Dynamics</p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        result.details?.livenessPassed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.details?.livenessPassed ? '✅ Verified Live' : '❌ Failed'}
                    </span>
                  </div>

                  {/* Factor 3: Geofence */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-medium text-white">Geofence Compliance</p>
                        <p className="text-[10px] text-slate-400">
                          {result.details?.distanceMeters != null
                            ? `${result.details.distanceMeters.toFixed(1)}m from HQ`
                            : 'Verified'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        result.details?.geofencePassed !== false ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {result.details?.geofencePassed !== false ? '✅ In Perimeter' : '❌ Out of Bounds'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-500 text-xs space-y-2 bg-slate-900/40 rounded-xl border border-slate-900">
                <Cpu className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                <p>Click "Execute Biometric Verification" to run diagnostic simulation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
