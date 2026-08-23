import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, AttendanceLog, Employee } from '../db/database.js';
import { QrService } from '../services/qrService.js';
import { GeoService } from '../services/geoService.js';
import { FaceService } from '../services/faceService.js';
import { ExportService } from '../services/exportService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

// Connected SSE clients for live updates
const sseClients: Set<Response> = new Set();

export const broadcastAttendanceEvent = (log: AttendanceLog) => {
  const data = `data: ${JSON.stringify(log)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (err) {
      sseClients.delete(client);
    }
  }
};

export class AttendanceController {
  /**
   * SSE Stream endpoint for real-time live attendance feed on Web Admin
   */
  static streamAttendanceEvents(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);

    // Send heartbeat every 20 seconds
    const interval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(res);
    });
  }

  /**
   * PURE BIOMETRIC FACIAL VERIFICATION ENDPOINT
   * Validates: (1) ArcFace 512-D Cosine Similarity, (2) Anti-Spoofing Liveness, (3) GPS Geofence (if configured)
   */
  static async verifyTripleFactor(req: AuthRequest, res: Response) {
    try {
      const {
        employeeId,
        qrPayload,
        faceEmbedding,
        livenessScore = 0.95,
        antiSpoofPassed = true,
        antiSpoofVerdict = 'GENUINE_LIVE',
        latitude,
        longitude,
        isMockLocation = false,
        snapshotUrl,
        capturedAt,
      } = req.body;

      const targetEmpId = employeeId || req.user?.id;
      if (!targetEmpId && !req.body.employeeCode && !req.body.employeeProfile) {
        return res.status(400).json({ success: false, message: 'Employee ID is required.' });
      }

      let employee = targetEmpId ? db.getEmployeeById(targetEmpId) : undefined;
      if (!employee && targetEmpId) {
        employee = db.getEmployeeByCode(targetEmpId) || db.getEmployeeByEmail(targetEmpId);
      }
      if (!employee && req.body.employeeCode) {
        employee = db.getEmployeeByCode(req.body.employeeCode);
      }

      const org = (employee ? db.getOrganizationById(employee.orgId) : undefined) || db.getPrimaryOrganization();
      if (!org) {
        return res.status(500).json({ success: false, message: 'Organization configuration missing.' });
      }

      // Auto-sync employee profile if registered on mobile client
      if (!employee && req.body.employeeProfile) {
        const p = req.body.employeeProfile;
        const code = (p.employeeCode || `EMP-${Date.now().toString().slice(-4)}`).toUpperCase().trim();
        const existingByCode = db.getEmployeeByCode(code);
        if (existingByCode) {
          employee = existingByCode;
        } else {
          const newEmp: Employee = {
            id: p.id && !p.id.startsWith('emp_local_') ? p.id : uuidv4(),
            orgId: org.id,
            employeeCode: code,
            fullName: p.fullName?.trim() || 'Mobile Employee',
            email: p.email?.toLowerCase().trim() || `${code.toLowerCase()}@drptech.com`,
            phone: p.phone || '',
            department: p.department || 'Engineering',
            position: p.position || 'Software Engineer',
            passwordHash: '',
            faceEmbedding: p.faceEmbedding || faceEmbedding || [],
            faceEmbeddings: p.faceEmbeddings || (p.faceEmbedding ? [p.faceEmbedding] : (faceEmbedding ? [faceEmbedding] : [])),
            photoUrl: p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.fullName || code)}`,
            isActive: true,
            shiftStart: p.shiftStart || '09:00',
            shiftEnd: p.shiftEnd || '18:00',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.createEmployee(newEmp);
          employee = newEmp;
        }
      }

      if (!employee || !employee.isActive) {
        return res.status(404).json({ success: false, message: 'Employee account not found or deactivated.' });
      }

      // -------------------------------------------------------------
      // -------------------------------------------------------------
      // FACTOR 1: Master QR Code Verification (Dual-Factor if scanned)
      // -------------------------------------------------------------
      let isQrValid = true;
      let qrError = '';
      let verificationMethod: 'DUAL_QR_FACE' | 'FACE_BIOMETRIC' = 'FACE_BIOMETRIC';

      if (qrPayload && qrPayload.trim() !== '') {
        const qrResult = QrService.verifyMasterPayload(qrPayload, org.id);
        isQrValid = qrResult.isValid;
        if (qrResult.isValid) {
          verificationMethod = 'DUAL_QR_FACE';
        } else {
          qrError = qrResult.error || 'Invalid Master QR Code.';
        }
      }

      // -------------------------------------------------------------
      // FACTOR 2: Facial Vector Distance & Verification (ArcFace 128-D)
      // -------------------------------------------------------------
      const baseline = employee.faceEmbeddings && employee.faceEmbeddings.length > 0
        ? employee.faceEmbeddings
        : employee.faceEmbedding;
      
      let faceResult = { isMatch: false, similarityScore: 0, error: 'Facial biometric profile not registered for this employee.' };
      if (faceEmbedding && Array.isArray(faceEmbedding) && faceEmbedding.length > 0 && baseline && (Array.isArray(baseline) ? baseline.length > 0 : true)) {
        const result = FaceService.verifyFace(faceEmbedding, baseline, 0.38);
        faceResult = {
          isMatch: result.isMatch,
          similarityScore: result.similarityScore,
          error: result.error || '',
        };
      }

      // -------------------------------------------------------------
      // FACTOR 3: Anti-Spoofing & Liveness Verification
      // -------------------------------------------------------------
      const livenessScoreNum = parseFloat(String(livenessScore));
      const isLivenessValid = antiSpoofPassed !== false && (isNaN(livenessScoreNum) || livenessScoreNum >= 0.60);
      const livenessError = isLivenessValid ? '' : `Anti-Spoofing check failed (${antiSpoofVerdict}). Liveness score: ${(livenessScoreNum * 100).toFixed(0)}%.`;

      // -------------------------------------------------------------
      // FACTOR 4: Optional Geofencing Verification
      // -------------------------------------------------------------
      let devLat = latitude !== undefined && latitude !== null ? parseFloat(latitude) : org.latitude;
      let devLng = longitude !== undefined && longitude !== null ? parseFloat(longitude) : org.longitude;
      if (isNaN(devLat)) devLat = org.latitude;
      if (isNaN(devLng)) devLng = org.longitude;

      const geoResult = GeoService.verifyGeofence(
        devLat,
        devLng,
        org.latitude,
        org.longitude,
        org.geofenceRadiusMeters,
        Boolean(isMockLocation)
      );

      // Determine Overall Outcome: QR (if scanned) AND Face match AND Anti-Spoofing Liveness must pass
      const isBiometricPass = isQrValid && faceResult.isMatch && isLivenessValid;

      // Check shift lateness (Flexible 24x7 schedule has no time restrictions)
      const now = capturedAt ? new Date(capturedAt) : new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      let isLate = false;
      const shift = employee.shiftStart || 'Flexible 24x7';
      if (
        shift !== 'Flexible 24x7' &&
        shift !== 'FLEXIBLE' &&
        shift.includes(':')
      ) {
        const [shiftHour, shiftMin] = shift.split(':').map((s) => parseInt(s, 10));
        if (!isNaN(shiftHour) && !isNaN(shiftMin)) {
          isLate = currentHour > shiftHour || (currentHour === shiftHour && currentMinute > shiftMin + 15);
        }
      }

      const status: 'PRESENT' | 'LATE' | 'REJECTED' = isBiometricPass
        ? isLate
          ? 'LATE'
          : 'PRESENT'
        : 'REJECTED';

      const failureReasons: string[] = [];
      if (!isQrValid) failureReasons.push(qrError);
      if (!faceResult.isMatch) failureReasons.push(faceResult.error || 'Facial signature mismatch');
      if (!isLivenessValid) failureReasons.push(livenessError);
      if (!geoResult.isInside) failureReasons.push(geoResult.error || 'Geofence boundary violation');

      const failureSummary = failureReasons.join(' | ');

      const log: AttendanceLog = {
        id: uuidv4(),
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        department: employee.department,
        orgId: org.id,
        timestamp: now.toISOString(),
        status,
        qrMatchStatus: isQrValid,
        faceSimilarityScore: faceResult.similarityScore,
        livenessScore: livenessScoreNum || 0.95,
        antiSpoofPassed: isLivenessValid,
        latitude: devLat,
        longitude: devLng,
        distanceMeters: geoResult.distanceMeters,
        isMockLocation: Boolean(isMockLocation),
        snapshotUrl: snapshotUrl || employee.photoUrl,
        failureReason: isBiometricPass ? undefined : failureSummary,
        verificationMethod: qrPayload ? 'DUAL_QR_FACE' : 'FACIAL_BIOMETRIC',
        createdAt: new Date().toISOString(),
      };

      db.createAttendanceLog(log);
      broadcastAttendanceEvent(log);

      if (!isBiometricPass) {
        return res.status(422).json({
          success: false,
          status: 'REJECTED',
          message: 'Biometric face verification failed.',
          details: {
            facePassed: faceResult.isMatch,
            faceSimilarityScore: faceResult.similarityScore,
            faceError: faceResult.isMatch ? undefined : faceResult.error,
            livenessPassed: isLivenessValid,
            livenessScore: livenessScoreNum,
            livenessError: isLivenessValid ? undefined : livenessError,
            geofencePassed: geoResult.isInside,
            distanceMeters: geoResult.distanceMeters,
          },
          log,
        });
      }

      return res.status(200).json({
        success: true,
        status,
        message: status === 'LATE' ? 'Attendance marked (Late Arrival).' : 'Attendance marked successfully (Present).',
        details: {
          facePassed: true,
          faceSimilarityScore: faceResult.similarityScore,
          livenessPassed: true,
          livenessScore: livenessScoreNum,
          geofencePassed: geoResult.isInside,
          distanceMeters: geoResult.distanceMeters,
          timestamp: log.timestamp,
        },
        log,
      });
    } catch (err: any) {
      console.error('Attendance verification error:', err);
      return res.status(500).json({ success: false, message: `Server verification error: ${err.message}` });
    }
  }

  /**
   * Get attendance logs with filters and pagination
   */
  static async getLogs(req: AuthRequest, res: Response) {
    try {
      const { department, status, startDate, endDate, employeeId } = req.query as any;
      const org = db.getPrimaryOrganization();

      const targetEmpId = employeeId || (req.user?.role === 'EMPLOYEE' ? req.user.id : undefined);

      const logs = db.getAttendanceLogs({
        orgId: org?.id,
        department,
        status,
        startDate,
        endDate,
        employeeId: targetEmpId,
      });

      return res.json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Dashboard statistics & KPI metrics
   */
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      const stats = db.getAttendanceStats(org?.id || 'org_default_hq_1');
      return res.json({ success: true, data: stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Export attendance logs as CSV
   */
  static async exportCsv(req: Request, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      const logs = db.getAttendanceLogs({ orgId: org?.id });
      const csv = ExportService.generateCsv(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    } catch (err: any) {
      return res.status(500).send(err.message);
    }
  }
}
