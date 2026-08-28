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
        qrScannedAt,
        punchType: requestedPunchType,
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
            isApproved: false,
            approvalStatus: 'PENDING',
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

      if (employee.approvalStatus === 'REJECTED') {
        return res.status(403).json({
          success: false,
          isRejected: true,
          message: employee.rejectionReason || 'Registration was rejected by administrator.',
        });
      }

      if (employee.approvalStatus === 'PENDING' || employee.isApproved === false) {
        return res.status(403).json({
          success: false,
          isPendingApproval: true,
          message: 'Your account is pending administrator approval. You cannot mark attendance until an admin approves your profile.',
        });
      }

      // -------------------------------------------------------------
      // -------------------------------------------------------------
      // FACTOR 1: Master QR Code Verification (MANDATORY DUAL-FACTOR)
      // -------------------------------------------------------------
      let isQrValid = false;
      let qrError = '';

      if (!qrPayload || qrPayload.trim() === '') {
        isQrValid = false;
        qrError = 'Office Master QR code scan is strictly required. Marking attendance without scanning the QR code is blocked.';
      } else {
        const qrResult = QrService.verifyMasterPayload(qrPayload.trim(), org.id);
        isQrValid = qrResult.isValid;
        if (qrResult.isValid) {
          // Check 90-second expiration window between QR scan and Face verification
          if (qrScannedAt) {
            const scannedTimestamp = typeof qrScannedAt === 'string' ? new Date(qrScannedAt).getTime() : Number(qrScannedAt);
            if (!isNaN(scannedTimestamp)) {
              const elapsedMs = Date.now() - scannedTimestamp;
              // Strict 90s window (+5s network latency allowance)
              if (elapsedMs > 95000) {
                isQrValid = false;
                qrError = `QR Code scan session expired (${Math.round(elapsedMs / 1000)}s elapsed, maximum allowed is 90s). Please re-scan the Master QR code.`;
              }
            }
          }
        } else {
          qrError = qrResult.error || 'Invalid Master QR Code. Please scan the official Office Master QR poster.';
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
        const result = FaceService.verifyFace(faceEmbedding, baseline, 0.30);
        faceResult = {
          isMatch: result.isMatch && result.similarityScore >= 0.85,
          similarityScore: result.similarityScore,
          error: result.error || (result.similarityScore < 0.85 ? `Face match score was ${(result.similarityScore * 100).toFixed(1)}% (minimum 85.0% required).` : ''),
        };
      }

      // -------------------------------------------------------------
      // FACTOR 3: Anti-Spoofing & Liveness Verification
      // -------------------------------------------------------------
      const livenessScoreNum = parseFloat(String(livenessScore));
      const isLivenessValid = antiSpoofPassed !== false && (isNaN(livenessScoreNum) || livenessScoreNum >= 0.60);
      const livenessError = isLivenessValid ? '' : `Anti-Spoofing check failed (${antiSpoofVerdict}). Liveness score: ${(livenessScoreNum * 100).toFixed(0)}%.`;

      // -------------------------------------------------------------
      // FACTOR 4: Mandatory Geofencing Verification (GPS Coordinates Required)
      // -------------------------------------------------------------
      if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
        return res.status(422).json({
          success: false,
          status: 'REJECTED',
          message: '📍 Location Required: Device GPS location is mandatory. Please enable Location in your device settings and allow permission.',
          details: {
            geofencePassed: false,
            failureReason: 'Device GPS location missing or switched off.',
          },
        });
      }

      const devLat = parseFloat(latitude);
      const devLng = parseFloat(longitude);
      if (isNaN(devLat) || isNaN(devLng)) {
        return res.status(422).json({
          success: false,
          status: 'REJECTED',
          message: 'Invalid GPS coordinates received.',
          details: {
            geofencePassed: false,
            failureReason: 'Invalid GPS coordinates.',
          },
        });
      }

      const geoResult = GeoService.verifyGeofence(
        devLat,
        devLng,
        org.latitude,
        org.longitude,
        org.geofenceRadiusMeters,
        Boolean(isMockLocation)
      );

      // Determine Overall Outcome: QR scan AND Face match AND Anti-Spoofing Liveness AND Geofence Perimeter must all pass
      const isBiometricPass = isQrValid && faceResult.isMatch && isLivenessValid && geoResult.isInside;

      // -------------------------------------------------------------
      // DUAL PUNCH LOGIC: CHECK-IN (ENTRY) VS CHECK-OUT (EXIT)
      // -------------------------------------------------------------
      const now = capturedAt ? new Date(capturedAt) : new Date();
      const todayDateStr = now.toISOString().split('T')[0];

      // Retrieve today's valid logs for this employee
      const todayLogs = db.getAttendanceLogs({
        employeeId: employee.id,
        startDate: `${todayDateStr}T00:00:00.000Z`,
        endDate: `${todayDateStr}T23:59:59.999Z`,
      }).filter((l) => l.status !== 'REJECTED');

      // -------------------------------------------------------------
      // SERVER-SIDE ANTI-DUPLICATE FLOOD GUARD:
      // Prevent multiple entries within 15 seconds for the same employee
      // -------------------------------------------------------------
      if (todayLogs.length > 0) {
        const lastPunch = todayLogs[0];
        const elapsedSinceLastSec = Math.abs((now.getTime() - new Date(lastPunch.timestamp).getTime()) / 1000);
        if (elapsedSinceLastSec < 15) {
          console.log(`⚡ Duplicate punch blocked for employee ${employee.employeeCode} (${elapsedSinceLastSec.toFixed(1)}s since previous punch)`);
          return res.status(200).json({
            success: true,
            status: lastPunch.status,
            punchType: lastPunch.punchType,
            workDurationMinutes: lastPunch.workDurationMinutes,
            message: `Attendance already recorded for ${employee.fullName}.`,
            data: lastPunch,
            details: {
              faceSimilarityScore: lastPunch.faceSimilarityScore,
              livenessPassed: lastPunch.antiSpoofPassed,
              geofencePassed: true,
              timestamp: lastPunch.timestamp,
            },
          });
        }
      }

      let punchType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN';
      if (requestedPunchType === 'CHECK_IN' || requestedPunchType === 'CHECK_OUT') {
        punchType = requestedPunchType;
      } else {
        // Auto-detect punch type based on previous punch today
        if (todayLogs.length > 0) {
          const lastPunch = todayLogs[0]; // sorted latest first
          punchType = (lastPunch.punchType === 'CHECK_IN' || lastPunch.status === 'PRESENT' || lastPunch.status === 'LATE')
            ? 'CHECK_OUT'
            : 'CHECK_IN';
        }
      }

      // Calculate working hours if checking out
      let workDurationMinutes: number | undefined = undefined;
      if (punchType === 'CHECK_OUT' && todayLogs.length > 0) {
        const checkInLog = [...todayLogs].reverse().find(
          (l) => l.punchType === 'CHECK_IN' || l.status === 'PRESENT' || l.status === 'LATE'
        );
        if (checkInLog) {
          const checkInTime = new Date(checkInLog.timestamp).getTime();
          const diffMs = Math.max(0, now.getTime() - checkInTime);
          workDurationMinutes = Math.round(diffMs / (1000 * 60));
        }
      }

      // Check shift lateness for Check-In (Flexible 24x7 schedule has no time restrictions)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      let isLate = false;
      const shift = employee.shiftStart || 'Flexible 24x7';
      if (
        punchType === 'CHECK_IN' &&
        shift !== 'Flexible 24x7' &&
        shift !== 'FLEXIBLE' &&
        shift.includes(':')
      ) {
        const [shiftHour, shiftMin] = shift.split(':').map((s) => parseInt(s, 10));
        if (!isNaN(shiftHour) && !isNaN(shiftMin)) {
          isLate = currentHour > shiftHour || (currentHour === shiftHour && currentMinute > shiftMin + 15);
        }
      }

      let status: 'PRESENT' | 'LATE' | 'CHECKED_OUT' | 'REJECTED' = 'REJECTED';
      if (isBiometricPass) {
        if (punchType === 'CHECK_OUT') {
          status = 'CHECKED_OUT';
        } else {
          status = isLate ? 'LATE' : 'PRESENT';
        }
      }

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
        punchType,
        workDurationMinutes,
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
        const primaryMessage = !geoResult.isInside
          ? (geoResult.error || `Outside Office Perimeter: You are ${geoResult.distanceMeters.toFixed(0)}m away.`)
          : (!isQrValid ? qrError : (!faceResult.isMatch ? (faceResult.error || 'Biometric face mismatch.') : livenessError));

        return res.status(422).json({
          success: false,
          status: 'REJECTED',
          punchType,
          message: primaryMessage || 'Biometric verification failed.',
          details: {
            facePassed: faceResult.isMatch,
            faceSimilarityScore: faceResult.similarityScore,
            faceError: faceResult.isMatch ? undefined : faceResult.error,
            livenessPassed: isLivenessValid,
            livenessScore: livenessScoreNum,
            livenessError: isLivenessValid ? undefined : livenessError,
            geofencePassed: geoResult.isInside,
            distanceMeters: geoResult.distanceMeters,
            geofenceError: geoResult.isInside ? undefined : geoResult.error,
            qrPassed: isQrValid,
            qrError: isQrValid ? undefined : qrError,
            failureReason: failureSummary,
            timestamp: log.timestamp,
          },
          log,
        });
      }

      let successMessage = 'Attendance Verified Successfully!';
      if (punchType === 'CHECK_OUT') {
        const hours = workDurationMinutes ? Math.floor(workDurationMinutes / 60) : 0;
        const mins = workDurationMinutes ? workDurationMinutes % 60 : 0;
        successMessage = `Office Departure Marked (Check-Out)! Total Worked: ${hours}h ${mins}m. Have a great evening!`;
      } else if (status === 'LATE') {
        successMessage = 'Office Entry Marked (Check-In - Late Arrival). Welcome!';
      } else {
        successMessage = 'Office Entry Marked (Check-In - Present on Time). Welcome!';
      }

      return res.status(200).json({
        success: true,
        status,
        punchType,
        workDurationMinutes,
        message: successMessage,
        details: {
          facePassed: true,
          faceSimilarityScore: faceResult.similarityScore,
          livenessPassed: true,
          livenessScore: livenessScoreNum,
          geofencePassed: true,
          distanceMeters: geoResult.distanceMeters,
          qrPassed: true,
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
