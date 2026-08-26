import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import apiRoutes from './routes/api.js';
import { db } from './db/database.js';
import { seedDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(
  cors({
    origin: '*', // Allow all origins for mobile app & web admin development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory for snapshots & avatar assets
app.use('/uploads', express.static(config.uploadsDir));

// API Routes
app.use('/api/v1', apiRoutes);

// Locate web_admin dist directory if available
const candidateWebDistPaths = [
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'dist/public'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, 'public'),
  path.resolve(process.cwd(), '../web_admin/dist'),
  path.resolve(process.cwd(), 'web_admin/dist'),
  path.resolve(__dirname, '../../web_admin/dist'),
  path.resolve(__dirname, '../web_admin/dist'),
];

const webDistPath = candidateWebDistPaths.find(
  (p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))
);

if (webDistPath) {
  console.log(`📦 Serving Web Terminal & Admin Portal from: ${webDistPath}`);
  app.use(express.static(webDistPath));

  // SPA Catch-all Fallback (routes like /, /admin, /mobile, /approvals to index.html)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
} else {
  // Root Welcome & Health (Fallback when frontend is not built)
  app.get('/', (req, res) => {
    res.json({
      service: 'Automated QR & Facial Verification Office Attendance API',
      version: '1.0.0',
      status: 'ACTIVE',
      adminPortal: 'Deploy web_admin or navigate to /admin when static dist is present',
      documentation: {
        health: 'GET /api/v1/health',
        authAdmin: 'POST /api/v1/auth/admin-login',
        authEmployee: 'POST /api/v1/auth/employee-login',
        orgSettings: 'GET /api/v1/org',
        verifyAttendance: 'POST /api/v1/attendance/verify',
        liveStream: 'GET /api/v1/attendance/stream',
      },
    });
  });

  app.get('/admin*', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Admin Portal - DRP Technology</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f172a; border: 1px solid #1e293b; padding: 2rem; border-radius: 1rem; max-width: 480px; text-align: center; }
            h1 { color: #10b981; font-size: 1.5rem; }
            p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
            .badge { background: #1e293b; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>DRP Technology Admin Portal</h1>
            <p>The backend API is running on Render. Building frontend assets...</p>
            <p>Admin Login: <span class="badge">admin@drptech.com</span> / <span class="badge">admin123</span></p>
          </div>
        </body>
      </html>
    `);
  });
}

import os from 'os';

// Auto-seed if database is empty, has no employees, or lacks default admin
if (!db.getPrimaryOrganization() || db.getEmployees().length === 0 || !db.getAdminByEmail('admin@drptech.com')) {
  seedDatabase().catch((err) => console.error('Error auto-seeding database:', err));
}

// Find local IPv4 addresses
const networkInterfaces = os.networkInterfaces();
const localIps: string[] = [];
for (const iface of Object.values(networkInterfaces)) {
  if (!iface) continue;
  for (const alias of iface) {
    if (alias.family === 'IPv4' && !alias.internal) {
      localIps.push(alias.address);
    }
  }
}

// Start Server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 DRP Technology Attendance Server running on port ${config.port}`);
  console.log(`🌐 Local URL:      http://localhost:${config.port}`);
  for (const ip of localIps) {
    console.log(`📱 Mobile APK URL: http://${ip}:${config.port}/api/v1`);
  }
  console.log(`📡 SSE Stream:     http://localhost:${config.port}/api/v1/attendance/stream`);
  console.log(`🔑 Admin Login:    admin@drptech.com / admin123`);
  console.log(`👤 Emp Login:      EMP-1001 / password123`);
  console.log(`=======================================================`);
});

export default app;
