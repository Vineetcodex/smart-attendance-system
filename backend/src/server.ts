import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.js';
import apiRoutes from './routes/api.js';
import { db } from './db/database.js';
import { seedDatabase } from './db/seed.js';

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

// Root Welcome & Health
app.get('/', (req, res) => {
  res.json({
    service: 'Automated QR & Facial Verification Office Attendance API',
    version: '1.0.0',
    status: 'ACTIVE',
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

// Auto-seed if database is empty
if (!db.getPrimaryOrganization()) {
  seedDatabase().catch((err) => console.error('Error auto-seeding database:', err));
}

// Start Server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 DRP Technology Attendance Server running on port ${config.port}`);
  console.log(`🌐 Local URL:   http://localhost:${config.port}`);
  console.log(`📡 SSE Stream:  http://localhost:${config.port}/api/v1/attendance/stream`);
  console.log(`🔑 Admin Login: admin@drptech.com / admin123`);
  console.log(`👤 Emp Login:   EMP-1001 / password123`);
  console.log(`=======================================================`);
});

export default app;
