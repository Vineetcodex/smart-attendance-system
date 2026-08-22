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
  const [latitude, setLatitude] = useState(org?.latitude?.toString() || '37.774929');
  const [longitude, setLongitude] = useState(org?.longitude?.toString() || '-122.419416');
  const [radius, setRadius] = useState(org?.geofenceRadiusMeters || 50);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          setSuccessMsg('Coordinates updated from your device GPS!');
          setTimeout(() => setSuccessMsg(''), 4000);
        },
        (err) => {
          alert('Could not access current location: ' + err.message);
        }
      );
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const updated = await api.updateOrganization({
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        geofenceRadiusMeters: Number(radius),
      });
      onOrgUpdated(updated);
      setSuccessMsg('Organization settings and Geofence updated. Master QR signature refreshed!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Error updating settings: ' + err.message);
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
      alert('Error regenerating QR: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <QrCode className="w-6 h-6 text-emerald-400" />
          Organization Geofence & Master QR Studio
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Configure the physical office boundaries and export the encrypted Master QR Code for wall mounting.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Geofence (7 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveSettings} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building className="w-4 h-4 text-emerald-400" />
              Office Premises Configuration
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 500 Tech Boulevard, San Francisco, CA"
              />
            </div>

            {/* GPS Coordinates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Office GPS Coordinates (WGS84)
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                >
                  <LocateFixed className="w-3 h-3" />
                  Use My Current GPS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
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
                max="250"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Employees must be within {radius} meters of this coordinate to successfully verify attendance.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleRegenerateQr}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate Token
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-600/20 transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save & Update Master QR'}
              </button>
            </div>
          </form>

          {/* Cryptographic Info Box */}
          <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Info className="w-4 h-4 text-cyan-400" />
              Cryptographic Anti-Tampering Engine
            </div>
            <p className="leading-relaxed">
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
