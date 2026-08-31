import React, { useState } from 'react';
import {
  MapPin,
  QrCode,
  Save,
  RefreshCw,
  LocateFixed,
  Building,
  Check,
  Info,
} from 'lucide-react';
import { api, Organization } from '../services/api.js';
import { MasterQrPoster } from '../components/MasterQrPoster.js';

interface Props {
  org: Organization | null;
  onOrgUpdated: (org: Organization) => void;
}

export const OrgSettings: React.FC<Props> = ({ org, onOrgUpdated }) => {
  const [name, setName] = useState(org?.name || '');
  const [address, setAddress] = useState(org?.address || '');
  const [latitude, setLatitude] = useState(org?.latitude?.toString() || '20.278757');
  const [longitude, setLongitude] = useState(org?.longitude?.toString() || '85.864144');
  const [radius, setRadius] = useState(org?.geofenceRadiusMeters || 300);
  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 🛰️ Acquire Current High-Precision GPS Coordinates
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsLocating(true);
    setErrorMsg('');
    setSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latStr = pos.coords.latitude.toFixed(6);
        const lngStr = pos.coords.longitude.toFixed(6);
        const accuracyMeters = Math.round(pos.coords.accuracy || 0);

        setLatitude(latStr);
        setLongitude(lngStr);
        setGpsAccuracy(accuracyMeters);
        setIsLocating(false);
        setSuccessMsg(
          `📍 Current GPS Acquired! Latitude: ${latStr}, Longitude: ${lngStr} (Accuracy: ±${accuracyMeters}m). Click "Save & Generate Master QR" below to save and activate attendance at this location.`
        );
      },
      (err) => {
        setIsLocating(false);
        let errorDetail = err.message;
        if (err.code === 1) {
          errorDetail = 'Permission denied. Please allow Location access in your browser or device settings.';
        } else if (err.code === 2) {
          errorDetail = 'Location unavailable. Ensure your device GPS/Location service is turned ON.';
        } else if (err.code === 3) {
          errorDetail = 'Location request timed out. Please try clicking again.';
        }
        setErrorMsg('Could not acquire GPS: ' + errorDetail);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // 💾 Save Organization Coordinates & Generate Encrypted Master QR
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
          Organization Geofence & Master QR Studio
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Configure the physical office GPS coordinates and generate the encrypted Master QR Code for employee attendance verification.
        </p>
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
                placeholder="e.g. 500 Tech Boulevard, San Francisco, CA"
              />
            </div>

            {/* GPS Coordinates Section */}
            <div className="space-y-2.5 p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800">
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
                  <span>{isLocating ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
                </button>
              </div>

              {gpsAccuracy !== null && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span>✓</span> GPS Accuracy: ±{gpsAccuracy} meters
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
            </div>

            {/* Geofence Radius Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
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
                max="500"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Employees must be within <strong>{radius} meters</strong> of these coordinates to successfully verify and mark attendance.
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
                Regenerate Token
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
