import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { db } from '../db/database.js';

async function exportQrAssets() {
  const org = db.getPrimaryOrganization();
  if (!org) {
    console.error('No organization found in database.');
    return;
  }

  const outputDir = path.resolve(process.cwd(), '..');

  // 1. High-Resolution PNG (1024x1024)
  const pngBuffer = await QRCode.toBuffer(org.masterQrPayload, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
  const pngPath = path.join(outputDir, 'DRP-Technology-Master-QR.png');
  fs.writeFileSync(pngPath, pngBuffer);

  // 2. Scalable Vector SVG
  const svgString = await QRCode.toString(org.masterQrPayload, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
  const svgPath = path.join(outputDir, 'DRP-Technology-Master-QR.svg');
  fs.writeFileSync(svgPath, svgString);

  // 3. Standalone Printable A4 Poster HTML
  const posterHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DRP Technology - Office Attendance Station Poster</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; display: flex; justify-content: center; }
    .card { background: white; border: 4px solid #16a34a; border-radius: 20px; padding: 36px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .header { background: #0f172a; color: white; margin: -36px -36px 24px -36px; padding: 16px 24px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 6px 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .qr-frame { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; display: inline-block; margin-bottom: 24px; }
    .qr-svg svg { width: 260px; height: 260px; }
    .steps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; background: #f1f5f9; padding: 14px; border-radius: 12px; font-size: 11px; text-align: left; margin-bottom: 20px; }
    .step-title { font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .footer { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="text-align: left;">
        <div style="font-weight: 800; font-size: 14px; text-transform: uppercase;">${org.name}</div>
        <div style="font-size: 11px; color: #94a3b8;">Touchless Multi-Factor Verification</div>
      </div>
      <div style="background: rgba(34,197,94,0.2); color: #4ade80; font-family: monospace; font-size: 12px; padding: 4px 8px; border-radius: 6px;">${org.code}</div>
    </div>
    <h1 class="title">OFFICE ATTENDANCE STATION</h1>
    <p class="subtitle">Scan with your smartphone app to verify presence</p>
    <div class="qr-frame">
      <div class="qr-svg">${svgString}</div>
      <div style="font-size: 10px; font-family: monospace; color: #94a3b8; margin-top: 8px;">Encrypted AES-256 Signature &bull; Active</div>
    </div>
    <div class="steps">
      <div>
        <div class="step-title">1. Position</div>
        <div style="color: #64748b;">Stand in front of wall and open app.</div>
      </div>
      <div>
        <div class="step-title">2. Align</div>
        <div style="color: #64748b;">Include face and wall QR in selfie.</div>
      </div>
      <div>
        <div class="step-title">3. Done</div>
        <div style="color: #64748b;">Instant triple-factor check.</div>
      </div>
    </div>
    <div class="footer">
      <span>📍 Geofence Radius: ${org.geofenceRadiusMeters}m</span>
      <span>Mount Height: 1.4m - 1.6m</span>
    </div>
  </div>
</body>
</html>`;
  const htmlPath = path.join(outputDir, 'DRP-Technology-Attendance-Poster.html');
  fs.writeFileSync(htmlPath, posterHtml);

  console.log('✅ Export completed successfully!');
  console.log(`1. High-Res PNG:   ${pngPath}`);
  console.log(`2. Vector SVG:     ${svgPath}`);
  console.log(`3. Printable Poster HTML: ${htmlPath}`);
}

exportQrAssets().catch(console.error);
