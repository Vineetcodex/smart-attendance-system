import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { OrgController } from '../controllers/orgController.js';
import { EmployeeController } from '../controllers/employeeController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { authenticateJwt, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

import os from 'os';

// Health Check & Version Info
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'Attendance Verification API' });
});

router.get('/network-info', (req, res) => {
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
  res.json({
    status: 'healthy',
    port: process.env.PORT || 5000,
    localIps,
    recommendedEndpoints: localIps.map((ip) => `http://${ip}:${process.env.PORT || 5000}/api/v1`),
  });
});

router.get('/app/version', (req, res) => {
  res.json({
    success: true,
    latestVersion: '2.0.0',
    versionCode: 2,
    minSupportedVersion: '2.0.0',
    releaseNotes: '• Real-time Office Geofence Perimeter Verification\n• Mandatory Device GPS & Continuous Location Watcher\n• Duplicate Punch Flood Protection & Performance Optimizations',
    downloadUrl: 'https://github.com/Vineetcodex/smart-attendance-system/releases/latest/download/app-debug.apk',
    releasesPageUrl: 'https://github.com/Vineetcodex/smart-attendance-system/releases/latest',
    mandatory: false,
    updatedAt: new Date().toISOString(),
  });
});

// Authentication Routes
router.post('/auth/admin-login', AuthController.adminLogin);
router.post('/auth/login', AuthController.adminLogin);
router.post('/auth/employee-login', AuthController.employeeLogin);
router.post('/auth/employee-signup', AuthController.employeeSignup);
router.post('/auth/check-face-duplicate', AuthController.checkFaceDuplicate);
router.get('/auth/employee-status/:idOrCode', AuthController.checkApprovalStatus);
router.get('/auth/me', authenticateJwt, AuthController.getMe);

// Organization & Master QR Routes
router.get('/org', OrgController.getOrganization);
router.put('/org', authenticateJwt, requireAdmin, OrgController.updateOrganization);
router.post('/org/regenerate-qr', authenticateJwt, requireAdmin, OrgController.regenerateMasterQr);
router.get('/org/qr-svg', OrgController.getPrintableSvg);

// Employee Management Routes
router.get('/employees', authenticateJwt, EmployeeController.getEmployees);
router.get('/employees/:id', authenticateJwt, EmployeeController.getEmployeeById);
router.post('/employees', authenticateJwt, requireAdmin, EmployeeController.createEmployee);
router.post('/employees/:id/approve', authenticateJwt, requireAdmin, EmployeeController.approveEmployee);
router.put('/employees/:id/approve', authenticateJwt, requireAdmin, EmployeeController.approveEmployee);
router.post('/employees/:id/reject', authenticateJwt, requireAdmin, EmployeeController.rejectEmployee);
router.put('/employees/:id', authenticateJwt, requireAdmin, EmployeeController.updateEmployee);
router.delete('/employees/:id', authenticateJwt, requireAdmin, EmployeeController.deleteEmployee);

// Attendance & Verification Routes
router.post('/attendance/verify', AttendanceController.verifyTripleFactor);
router.get('/attendance/logs', authenticateJwt, AttendanceController.getLogs);
router.get('/attendance/stats', authenticateJwt, AttendanceController.getStats);
router.get('/attendance/export/csv', AttendanceController.exportCsv);
router.get('/attendance/stream', AttendanceController.streamAttendanceEvents);

export default router;
