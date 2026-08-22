import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { OrgController } from '../controllers/orgController.js';
import { EmployeeController } from '../controllers/employeeController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { authenticateJwt, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'Attendance Verification API' });
});

// Authentication Routes
router.post('/auth/admin-login', AuthController.adminLogin);
router.post('/auth/employee-login', AuthController.employeeLogin);
router.post('/auth/employee-signup', AuthController.employeeSignup);
router.post('/auth/check-face-duplicate', AuthController.checkFaceDuplicate);
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
router.put('/employees/:id', authenticateJwt, requireAdmin, EmployeeController.updateEmployee);
router.delete('/employees/:id', authenticateJwt, requireAdmin, EmployeeController.deleteEmployee);

// Attendance & Verification Routes
router.post('/attendance/verify', AttendanceController.verifyTripleFactor);
router.get('/attendance/logs', authenticateJwt, AttendanceController.getLogs);
router.get('/attendance/stats', authenticateJwt, AttendanceController.getStats);
router.get('/attendance/export/csv', AttendanceController.exportCsv);
router.get('/attendance/stream', AttendanceController.streamAttendanceEvents);

export default router;
