import React, { useState, useEffect } from 'react';
import {
  MapPin,
  QrCode,
  Save,
  RefreshCw,
  LocateFixed,
  Building,
  Check,
  Info,
  ExternalLink,
  Navigation,
  Compass,
  Zap,
} from 'lucide-react';
import { api, Organization } from '../services/api.js';
import { MasterQrPoster } from '../components/MasterQrPoster.js';

interface Props {
  org: Organization | null;
  onOrgUpdated: (org: Organization) => void;
}

// Haversine distance calculator in meters
function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const OrgSettings: React.FC<Props> = ({ org, onOrgUpdated }) => {
  const [name, setName] = useState(org?.name || 'Main Office HQ');
  const [address, setAddress] = useState(org?.address || '');
  const [latitude, setLatitude] = useState(org?.latitude?.toString() || '20.278757');
  const [longitude, setLongitude] = useState(org?.longitude?.toString() || '85.864144');
  const [radius, setRadius] = useState(org?.geofenceRadiusMeters || 100);
  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize state when org prop updates
  useEffect(() => {
    if (org) {
      setName(org.name || 'Main Office HQ');
      setAddress(org.address || '');
      if (org.latitude !== undefined && org.latitude !== null) {
        setLatitude(org.latitude.toString());
      }
      if (org.longitude !== undefined && org.longitude !== null) {
        setLongitude(org.longitude.toString());
      }
      if (org.geofenceRadiusMeters) {
        setRadius(org.geofenceRadiusMeters);
      }
    }
  }, [org]);

  // Robust Geolocation helper with fallback for PCs/laptops without GPS chips
  const acquireCurrentPosition = async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser or device.');
    }

    return new Promise((resolve, reject) => {
      // First attempt: High Accuracy (GPS hardware)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
          });
        },
        (err) => {
          // If high accuracy times out (common on PCs), retry with standard network location
          console.warn('High accuracy geolocation failed, falling back to standard accuracy:', err.message);
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              resolve({
                lat: fallbackPos.coords.latitude,
                lng: fallbackPos.coords.longitude,
                accuracy: Math.round(fallbackPos.coords.accuracy || 0),
              });
            },
            (fallbackErr) => {
              let msg = fallbackErr.message;
              if (fallbackErr.code === 1) {
                msg = 'Permission denied. Please allow Location access in your browser.';
              } else if (fallbackErr.code === 2) {
                msg = 'Location unavailable. Ensure your device location service is turned ON.';
              } else if (fallbackErr.code === 3) {
                msg = 'Location request timed out. Please try again.';
              }
              reject(new Error(msg));
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // 🛰️ 1. Acquire Current GPS Coordinates & Fill Form
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const pos = await acquireCurrentPosition();
      const latStr = pos.lat.toFixed(6);
      const lngStr = pos.lng.toFixed(6);

      setLatitude(latStr);
      setLongitude(lngStr);
      setGpsAccuracy(pos.accuracy);

      // Check distance from currently configured office
      const orgLat = parseFloat(latitude);
      const orgLng = parseFloat(longitude);
      if (!isNaN(orgLat) && !isNaN(orgLng)) {
        const dist = calculateHaversineDistanceMeters(pos.lat, pos.lng, orgLat, orgLng);
        setUserDistance(dist);
      }

      setSuccessMsg(
        `📍 Current GPS Acquired! Latitude: ${latStr}, Longitude: ${lngStr} (Accuracy: ±${pos.accuracy}m). Click "Save & Generate Master QR" to activate attendance at this location.`
      );
    } catch (err: any) {
      setErrorMsg(`Could not acquire GPS: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  // ⚡ 2. 1-Click: Acquire GPS + Auto-Save + Instant Master QR Generation
  const handleInstantAutoDetectAndSave = async () => {
    setIsAutoSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const pos = await acquireCurrentPosition();
      const latNum = parseFloat(pos.lat.toFixed(6));
      const lngNum = parseFloat(pos.lng.toFixed(6));
      const radiusNum = Number(radius) || 100;

      setLatitude(latNum.toFixed(6));
      setLongitude(lngNum.toFixed(6));
      setGpsAccuracy(pos.accuracy);
      setUserDistance(0);

      // Automatically save to backend and regenerate encrypted Master QR
      const updated = await api.updateOrganization({
        name: name.trim() || org?.name || 'Main Office HQ',
        address: address.trim() || org?.address || '',
        latitude: latNum,
        longitude: lngNum,
        geofenceRadiusMeters: radiusNum,
      });

      onOrgUpdated(updated);
      setSuccessMsg(
        `🚀 Instant Geofence Activated! Saved GPS: ${latNum.toFixed(6)}, ${lngNum.toFixed(6)} (Radius: ${radiusNum}m). Master QR re-encrypted and ready for scanning!`
      );
    } catch (err: any) {
      setErrorMsg(`Auto-detect & save failed: ${err.message}`);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // 💾 3. Manual Save & Master QR Generation
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const radiusNum = Number(radius) || 50;

    if (isNaN(latNum) || isNaN(lngNum)) {
      setErrorMsg('Please enter valid numerical Latitude and Longitude coordinates.');
      setSaving(false);
      return;
    }

    try {
      const updated = await api.updateOrganization({
        name: name.trim() || org?.name || 'Main Office HQ',
        address: address.trim() || org?.address || '',
        latitude: latNum,
        longitude: lngNum,
        geofenceRadiusMeters: radiusNum,
      });

      onOrgUpdated(updated);
      setSuccessMsg(
        `🎉 Office Location & Master QR Generated Successfully! Saved Latitude: ${latNum.toFixed(6)}, Longitude: ${lngNum.toFixed(6)} (Allowed Radius: ${radiusNum}m). Employees can now scan & verify attendance at this location.`
      );
    } catch (err: any) {
      setErrorMsg('Error updating settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!window.confirm('Regenerating will revoke previous QR code printouts. Continue?')) {
      return;
    }
    try {
      const updated = await api.regenerateMasterQr();
      if (org) {
        onOrgUpdated({
          ...org,
          masterQrPayload: updated.masterQrPayload,
          masterQrCodeDataUrl: updated.masterQrCodeDataUrl,
          updatedAt: updated.updatedAt,
        });
      }
      setSuccessMsg('New Cryptographic Master QR generated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Error regenerating QR: ' + err.message);
    }
  };

  const currentLatNum = parseFloat(latitude);
  const currentLngNum = parseFloat(longitude);
  const isCoordinatesValid = !isNaN(currentLatNum) && !isNaN(currentLngNum);
  const googleMapsUrl = isCoordinatesValid
    ? `https://www.google.com/maps?q=${currentLatNum},${currentLngNum}`
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
          Organization Geofence & Master QR Studio
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Configure physical office GPS coordinates and generate the encrypted Master QR Code for employee attendance verification.
        </p>
      </div>

      {/* 1-Click Fast Action Hero Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              1-Click Live Location Auto-Capture
            </h3>
            <p className="text-xs text-slate-300">
              Standing at the office right now? Instantly acquire your device GPS & generate the Master QR.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isAutoSaving || isLocating}
          onClick={handleInstantAutoDetectAndSave}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
        >
          <LocateFixed className={`w-4 h-4 ${isAutoSaving ? 'animate-spin' : ''}`} />
          <span>{isAutoSaving ? 'Acquiring & Saving...' : '⚡ Auto-Capture & Generate Master QR'}</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-start gap-3 shadow-xl backdrop-blur-md animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start gap-3 shadow-xl backdrop-blur-md animate-fadeIn">
          <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Form & Geofence (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveSettings} className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4 sm:space-y-5">
            <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building className="w-4 h-4 text-emerald-400" />
              Office Location & Geofence Coordinates
            </h3>

            {/* Org Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Organization / Branch Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Office Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 100 Innovation Way, Tech Park, City"
              />
            </div>

            {/* GPS Coordinates Section */}
            <div className="space-y-3 p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    Office GPS Coordinates (WGS84)
                  </label>
                  <p className="text-[11px] text-slate-400">Used to validate attendance check-in radius</p>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="text-xs text-emerald-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 px-3 py-1.5 rounded-xl border border-emerald-500/40 transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>{isLocating ? 'Acquiring GPS...' : 'Fill Current GPS'}</span>
                </button>
              </div>

              {gpsAccuracy !== null && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GPS Precision: ±{gpsAccuracy}m</span>
                  {userDistance !== null && (
                    <span className="text-slate-300 font-sans ml-2">
                      (Distance to saved pin: <strong>{userDistance}m</strong>)
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 20.278757"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 85.864144"
                    required
                  />
                </div>
              </div>

              {/* Google Maps Preview Link */}
              {googleMapsUrl && (
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>View pin on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {currentLatNum.toFixed(4)}, {currentLngNum.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* Geofence Radius Slider & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Allowable Geofence Radius
                </label>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {radius} meters
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
                {[
                  { label: '50m (Room)', val: 50 },
                  { label: '100m (Standard)', val: 100 },
                  { label: '250m (Building)', val: 250 },
                  { label: '500m (Campus)', val: 500 },
                  { label: '1000m (Zone)', val: 1000 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setRadius(p.val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                      radius === p.val
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 mt-1">
                Employees must be within <strong>{radius} meters</strong> of these coordinates to verify and mark attendance.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRegenerateQr}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition w-full sm:w-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate Salt
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 transition w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Generating...' : 'Save & Generate Master QR'}
              </button>
            </div>
          </form>

          {/* Cryptographic Info Box */}
          <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              Cryptographic Anti-Tampering Engine
            </div>
            <p className="leading-relaxed text-[11px] sm:text-xs">
              The Master QR incorporates an <strong>AES-256-GCM cipher</strong> with a unique branch salt. Even if a QR code is photographed, verification will be rejected unless the employee’s smartphone is physically inside the designated {radius}m GPS radius.
            </p>
            <div className="p-2 bg-slate-950 rounded font-mono text-[10px] text-slate-400 truncate">
              Payload: {org?.masterQrPayload || 'Generating payload...'}
            </div>
          </div>
        </div>

        {/* Right Column: Printable Wall Poster Studio (6 cols) */}
        <div className="lg:col-span-6">
          {org ? (
            <MasterQrPoster org={org} />
          ) : (
            <div className="p-8 text-center text-slate-400">Loading organization settings...</div>
          )}
        </div>
      </div>
    </div>
  );
};
