import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Download,
  Sparkles,
  ShieldCheck,
  Camera,
  MapPin,
  CheckCircle,
  FileImage,
  Check,
} from 'lucide-react';
import { Organization } from '../services/api.js';

interface Props {
  org: Organization;
}

export const MasterQrPoster: React.FC<Props> = ({ org }) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string>('');

  const triggerToast = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(''), 4000);
  };

  /**
   * 1. Save Poster / Print as PDF
   */
  const handlePrintPdf = () => {
    window.print();
    triggerToast('Print / Save as PDF dialog opened.');
  };

  /**
   * 2. Download Master QR as High-Resolution PNG (1024x1024)
   */
  const handleDownloadPng = () => {
    try {
      const svgElement = document.getElementById('master-qr-svg-canvas') as SVGGraphicsElement | null;
      if (!svgElement) {
        alert('QR element not found');
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL_Obj = window.URL || window.webkitURL || window;
      const blobURL = URL_Obj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);

        // Draw QR
        ctx.drawImage(image, 64, 64, 896, 896);

        // Convert to PNG data
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.download = `DRP-Technology-Master-QR-${org.code || 'HQ'}.png`;
          a.href = URL_Obj.createObjectURL(blob);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          triggerToast('Downloaded high-resolution PNG image.');
        }, 'image/png');
      };

      image.src = blobURL;
    } catch (err: any) {
      console.error('PNG download error:', err);
      alert('Failed to generate PNG: ' + err.message);
    }
  };

  /**
   * 3. Download Vector SVG File
   */
  const handleDownloadSvg = () => {
    try {
      const svgElement = document.getElementById('master-qr-svg-canvas');
      if (!svgElement) {
        alert('QR element not found');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DRP-Technology-Master-QR-${org.code || 'HQ'}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast('Downloaded scalable vector SVG file.');
    } catch (err: any) {
      alert('Failed to download SVG: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h3 className="text-sm font-semibold text-white">Office Wall Poster Studio</h3>
          <p className="text-xs text-slate-400">
            Export Master QR in PDF, PNG, or SVG format for office entrance mounting.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="Download QR as high-res PNG image"
          >
            <FileImage className="w-3.5 h-3.5 text-cyan-400" />
            Download PNG
          </button>

          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="Download Vector SVG"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Download SVG
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
            title="Open Print Dialog (Select Save as PDF)"
          >
            <Printer className="w-3.5 h-3.5" />
            Save as PDF / Print
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg no-print">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          {downloadSuccess}
        </div>
      )}

      {/* Printable Poster Card */}
      <div
        ref={posterRef}
        id="printable-poster"
        className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-emerald-500 max-w-md mx-auto text-center relative overflow-hidden"
      >
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white py-3 px-4 -mx-8 -mt-8 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">{org.name}</p>
              <p className="text-[10px] text-slate-400">Touchless Multi-Factor Verification</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded">
            {org.code}
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-1">
          OFFICE ATTENDANCE STATION
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Scan with your registered smartphone app to verify presence
        </p>

        {/* Master QR Code Frame */}
        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 inline-block mb-6 shadow-inner relative group">
          <QRCodeSVG
            id="master-qr-svg-canvas"
            value={org.masterQrPayload}
            size={220}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2316a34a"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
              x: undefined,
              y: undefined,
              height: 36,
              width: 36,
              excavate: true,
            }}
          />
          <div className="mt-2 text-[10px] font-mono text-slate-400">
            Encrypted AES-256 Signature • Active
          </div>
        </div>

        {/* 3 Step Instruction Guide */}
        <div className="grid grid-cols-3 gap-2 text-left bg-slate-100 p-3 rounded-xl mb-4 text-[10px] text-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <Camera className="w-3 h-3 text-emerald-600" />
              1. Position
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Stand in front of wall & open app selfie camera.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              2. Align
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Include your face and this QR in the single frame.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              3. Done!
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Instant facial, QR & GPS verification.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200">
          <span className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            Geofence Radius: {org.geofenceRadiusMeters}m
          </span>
          <span>Mount height: 1.4m - 1.6m</span>
        </div>
      </div>
    </div>
  );
};
