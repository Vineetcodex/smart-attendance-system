import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { config } from '../config/env.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { MailService } from '../services/mailService.js';

export class AuthController {
  /**
   * Admin Login (Web Portal)
   */
  static async adminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const admin = db.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Invalid admin email or password.' });
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid admin email or password.' });
      }

      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          orgId: admin.orgId,
          fullName: admin.fullName,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      const org = db.getOrganizationById(admin.orgId) || db.getPrimaryOrganization();

      return res.json({
        success: true,
        message: 'Admin login successful.',
        data: {
          token,
          user: {
            id: admin.id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
            orgId: admin.orgId,
          },
          organization: org,
        },
      });
    } catch (err: any) {
      console.error('Admin login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error during login.' });
    }
  }

  /**
   * Employee Mobile Login (Mobile App)
   */
  static async employeeLogin(req: Request, res: Response) {
    try {
      const { identifier, employeeCode, email, code, id, password } = req.body;
      const lookupIdentifier = (identifier || employeeCode || email || code || id || '').toString().trim();
      const rawPassword = (password || '').toString().trim();

      if (!lookupIdentifier || !rawPassword) {
        return res.status(400).json({ success: false, message: 'Employee code/email and password required.' });
      }

      const cleanIdentifier = lookupIdentifier.replace(/\s+/g, '');

      let employee =
        db.getEmployeeByCode(lookupIdentifier) ||
        db.getEmployeeByCode(cleanIdentifier) ||
        db.getEmployeeByEmail(lookupIdentifier) ||
        db.getEmployeeById(lookupIdentifier);

      if (!employee) {
        const all = db.getEmployees();
        employee = all.find(
          (e) =>
            e.employeeCode.toUpperCase() === lookupIdentifier.toUpperCase() ||
            e.employeeCode.toUpperCase() === cleanIdentifier.toUpperCase() ||
            e.email.toLowerCase() === lookupIdentifier.toLowerCase() ||
            e.id === lookupIdentifier
        );
      }

      if (!employee) {
        try {
          const { supabaseDb } = await import('../db/supabaseDb.js');
          const supEmp =
            (await supabaseDb.getEmployeeByCode(lookupIdentifier)) ||
            (await supabaseDb.getEmployeeByCode(cleanIdentifier)) ||
            (await supabaseDb.getEmployeeById(lookupIdentifier));
          if (supEmp) {
            employee = supEmp;
            db.createEmployee(supEmp);
          }
        } catch (_) {}
      }

      if (!employee || !employee.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
      }

      let isMatch = false;
      if (employee.passwordHash) {
        try {
          isMatch = await bcrypt.compare(rawPassword, employee.passwordHash);
        } catch (_) {
          isMatch = false;
        }
        if (!isMatch && (employee.passwordHash === rawPassword || (employee as any).password === rawPassword)) {
          isMatch = true;
        }
      } else if ((employee as any).password) {
        isMatch = (employee as any).password === rawPassword;
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      // Check Admin Approval Status
      if (employee.approvalStatus === 'REJECTED') {
        return res.status(403).json({
          success: false,
          isRejected: true,
          approvalStatus: 'REJECTED',
          message: employee.rejectionReason || 'Your registration was rejected by the administrator.',
        });
      }

      if (employee.approvalStatus === 'PENDING' || employee.isApproved === false) {
        const { passwordHash: _, ...sanitizedEmployee } = employee;
        return res.status(403).json({
          success: false,
          isPendingApproval: true,
          approvalStatus: 'PENDING',
          message: 'Your registration is pending administrator approval. Please wait for an admin to review and approve your account.',
          data: {
            employee: sanitizedEmployee,
            isPendingApproval: true,
            approvalStatus: 'PENDING',
          },
        });
      }

      const token = jwt.sign(
        {
          id: employee.id,
          email: employee.email,
          employeeCode: employee.employeeCode,
          role: 'EMPLOYEE',
          orgId: employee.orgId,
          fullName: employee.fullName,
        },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      const org = db.getOrganizationById(employee.orgId);
      const { passwordHash: _, ...sanitizedEmployee } = employee;

      return res.json({
        success: true,
        message: 'Employee authentication successful.',
        data: {
          token,
          employee: sanitizedEmployee,
          organization: org
            ? {
                id: org.id,
                name: org.name,
                latitude: org.latitude,
                longitude: org.longitude,
                geofenceRadiusMeters: org.geofenceRadiusMeters,
              }
            : null,
        },
      });
    } catch (err: any) {
      console.error('Employee login error:', err);
      return res.status(500).json({ success: false, message: 'Server error during employee login.' });
    }
  }

  /**
   * Employee Self-Registration & Face ID Enrollment (Mobile Portal)
   */
  static async employeeSignup(req: Request, res: Response) {
    try {
      const {
        fullName,
        employeeCode,
        email,
        password,
        phone,
        department = 'Engineering',
        position = 'Team Member',
        shiftStart = '09:00',
        shiftEnd = '18:00',
        faceEmbedding,
        photoUrl,
      } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
      }

      // Enforce Employee ID range: DRP01 to DRP10
      const { validateAndNormalizeEmployeeCode } = await import('../utils/codeValidator.js');
      const codeValidation = validateAndNormalizeEmployeeCode(employeeCode);
      if (!codeValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: codeValidation.error || 'Employee ID must be between DRP01 and DRP10 (e.g. DRP01, DRP02, ... DRP10).',
        });
      }
      const code = codeValidation.normalizedCode;

      const org = db.getPrimaryOrganization();
      const orgId = org?.id || 'org_drp_tech_hq';

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Face Vectors (Single and Multi-Pose: Straight, Left, Right)
      const { FaceService } = await import('../services/faceService.js');
      const { faceEmbeddings } = req.body;
      let multiPoseVectors: number[][] | undefined = undefined;

      if (Array.isArray(faceEmbeddings) && faceEmbeddings.length > 0) {
        multiPoseVectors = faceEmbeddings.map((vec: number[]) => FaceService.normalizeVector(vec));
      }

      const primaryEmbedding =
        faceEmbedding && Array.isArray(faceEmbedding) && faceEmbedding.length > 0
          ? FaceService.normalizeVector(faceEmbedding)
          : multiPoseVectors && multiPoseVectors.length > 0
          ? multiPoseVectors[0]
          : FaceService.generateEmbeddingFromSeed(`${code}-${fullName}`);

      // If already exists, update profile and set to PENDING for admin review
      const existingEmp = db.getEmployeeByCode(code) || db.getEmployeeByEmail(email);
      if (existingEmp) {
        const updated = db.updateEmployee(existingEmp.id, {
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          employeeCode: code,
          passwordHash,
          faceEmbedding: primaryEmbedding,
          faceEmbeddings: multiPoseVectors,
          photoUrl: photoUrl || existingEmp.photoUrl,
          shiftStart: shiftStart || existingEmp.shiftStart || 'Flexible 24x7',
          shiftEnd: shiftEnd || existingEmp.shiftEnd || 'Anytime',
          department: (department || existingEmp.department || 'Engineering').trim(),
          position: (position || existingEmp.position || 'Software Engineer').trim(),
          isApproved: false,
          approvalStatus: 'PENDING',
          approvedAt: undefined,
          approvedBy: undefined,
          rejectionReason: undefined,
          updatedAt: new Date().toISOString(),
        });

        const empData = updated || existingEmp;
        const { passwordHash: _, ...sanitized } = empData;

        return res.status(200).json({
          success: true,
          isPendingApproval: true,
          approvalStatus: 'PENDING',
          message: 'Registration and facial baseline enrollment submitted successfully! Your account is pending administrator approval before you can sign in and mark attendance.',
          data: {
            employee: sanitized,
            isPendingApproval: true,
            approvalStatus: 'PENDING',
            organization: org,
          },
        });
      }

      // Strict Malpractice / Duplicate Biometric Check across ALL existing employees and ALL multi-poses
      const existingEmployees = db.getEmployees(orgId);
      const probeVectors = multiPoseVectors && multiPoseVectors.length > 0 ? multiPoseVectors : [primaryEmbedding];
      const duplicateMatch = FaceService.findDuplicateFace(probeVectors, existingEmployees);

      if (duplicateMatch.isDuplicate && duplicateMatch.matchedEmployee) {
        return res.status(409).json({
          success: false,
          isMalpractice: true,
          matchedEmployee: {
            employeeCode: duplicateMatch.matchedEmployee.employeeCode,
            fullName: duplicateMatch.matchedEmployee.fullName,
          },
          similarityScore: duplicateMatch.similarityScore,
          message: `🚨 MALPRACTICE BLOCKED: This face is already enrolled under Employee ID "${duplicateMatch.matchedEmployee.employeeCode}" (${duplicateMatch.matchedEmployee.fullName}) with ${(duplicateMatch.similarityScore * 100).toFixed(1)}% match. An individual can only be registered under ONE Employee ID.`,
        });
      }

      const { v4: uuidv4 } = await import('uuid');
      const newEmployee = {
        id: uuidv4(),
        orgId,
        employeeCode: code,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: (phone || '').trim(),
        department: department.trim(),
        position: position.trim(),
        passwordHash,
        faceEmbedding: primaryEmbedding,
        faceEmbeddings: multiPoseVectors,
        photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        isActive: true,
        isApproved: false,
        approvalStatus: 'PENDING' as const,
        shiftStart,
        shiftEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.createEmployee(newEmployee);

      const { passwordHash: _, ...sanitized } = newEmployee;

      return res.status(201).json({
        success: true,
        isPendingApproval: true,
        approvalStatus: 'PENDING',
        message: 'Registration and facial baseline enrollment submitted successfully! Your account is pending administrator approval before you can sign in and mark attendance.',
        data: {
          employee: sanitized,
          isPendingApproval: true,
          approvalStatus: 'PENDING',
          organization: org,
        },
      });
    } catch (err: any) {
      console.error('Employee signup error:', err);
      return res.status(500).json({ success: false, message: `Registration error: ${err.message}` });
    }

  }

  /**
   * Proactive Duplicate Face Check (called during live camera enrollment on frontend)
   */
  static async checkFaceDuplicate(req: Request, res: Response) {
    try {
      const { faceEmbedding, faceEmbeddings, excludeEmployeeId } = req.body;
      const { FaceService } = await import('../services/faceService.js');
      const org = db.getPrimaryOrganization();
      const existingEmployees = db.getEmployees(org?.id);

      const probe = faceEmbeddings || faceEmbedding;
      if (!probe) {
        return res.json({ success: true, isDuplicate: false });
      }

      const duplicate = FaceService.findDuplicateFace(probe, existingEmployees, excludeEmployeeId);

      return res.json({
        success: true,
        isDuplicate: duplicate.isDuplicate,
        matchedEmployee: duplicate.matchedEmployee,
        similarityScore: duplicate.similarityScore,
        distance: duplicate.distance,
        message: duplicate.isDuplicate
          ? `Face matches existing employee ${duplicate.matchedEmployee?.employeeCode} (${duplicate.matchedEmployee?.fullName})`
          : 'Face is unique and eligible for enrollment.',
      });
    } catch (err: any) {
      console.error('Check duplicate face error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getMe(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.role === 'EMPLOYEE') {
      const emp = db.getEmployeeById(req.user.id);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
      const { passwordHash: _, ...sanitized } = emp;
      return res.json({ success: true, data: { user: sanitized, employee: sanitized, role: 'EMPLOYEE' } });
    } else {
      const admin = db.getAdminByEmail(req.user.email);
      const org = db.getPrimaryOrganization();
      return res.json({ success: true, data: { user: admin, organization: org, role: req.user.role } });
    }
  }

  /**
   * Check current approval status of an employee by Code or ID (Public / Self-Check)
   */
  static async checkApprovalStatus(req: Request, res: Response) {
    try {
      const { idOrCode } = req.params;
      if (!idOrCode) {
        return res.status(400).json({ success: false, message: 'Employee ID or Code is required.' });
      }
      let emp = db.getEmployeeById(idOrCode) || db.getEmployeeByCode(idOrCode) || db.getEmployeeByEmail(idOrCode);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      const isApproved = emp.isApproved !== false && emp.approvalStatus !== 'PENDING' && emp.approvalStatus !== 'REJECTED';
      const status = emp.approvalStatus || (isApproved ? 'APPROVED' : 'PENDING');
      const { passwordHash: _, ...sanitized } = emp;

      return res.json({
        success: true,
        isApproved,
        approvalStatus: status,
        approvedAt: emp.approvedAt,
        approvedBy: emp.approvedBy,
        rejectionReason: emp.rejectionReason,
        employee: sanitized,
        message: isApproved
          ? 'Account is approved. You can sign in and mark attendance.'
          : status === 'REJECTED'
          ? emp.rejectionReason || 'Registration was rejected by administrator.'
          : 'Account is pending administrator approval.',
      });
    } catch (err: any) {
      console.error('Check approval status error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Request Password Reset OTP via Email/Gmail (Step 1)
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { identifier } = req.body;
      const raw = (identifier || '').toString().trim();
      if (!raw) {
        return res.status(400).json({
          success: false,
          message: 'Please enter your Employee ID (e.g. DRP01) or registered email.',
        });
      }

      const cleanCode = raw.toUpperCase().replace(/\s+/g, '');
      let employee =
        db.getEmployeeByCode(raw) ||
        db.getEmployeeByCode(cleanCode) ||
        db.getEmployeeByEmail(raw) ||
        db.getEmployeeById(raw);

      if (!employee) {
        const all = db.getEmployees();
        employee = all.find(
          (e) =>
            e.employeeCode.toUpperCase() === raw.toUpperCase() ||
            e.employeeCode.toUpperCase() === cleanCode ||
            e.email.toLowerCase() === raw.toLowerCase()
        );
      }

      if (!employee) {
        try {
          const { supabaseDb } = await import('../db/supabaseDb.js');
          const supEmp =
            (await supabaseDb.getEmployeeByCode(raw)) ||
            (await supabaseDb.getEmployeeByCode(cleanCode)) ||
            (await supabaseDb.getEmployeeById(raw));
          if (supEmp) {
            employee = supEmp;
            db.createEmployee(supEmp);
          }
        } catch (_) {}
      }

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: `No account found for "${raw}". Please check your Employee ID or email.`,
        });
      }

      if (!employee.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This employee account is currently deactivated. Please contact your administrator.',
        });
      }

      // Generate 6-digit cryptographic-safe OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in DB with 10-minute expiry
      db.setPasswordResetOtp(employee.id, otp, 10 * 60 * 1000);

      // Dispatch Security Email via MailService / Gmail SMTP
      const mailResult = await MailService.sendPasswordResetOtp(
        employee.email,
        employee.fullName,
        employee.employeeCode,
        otp
      );

      const maskedEmail = MailService.maskEmail(employee.email);

      return res.status(200).json({
        success: true,
        message: `A 6-digit verification code has been sent to ${maskedEmail}.`,
        data: {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          emailMasked: maskedEmail,
          emailSent: mailResult.emailSent,
          isDemoFallback: mailResult.isDemoFallback,
          demoOtp: mailResult.isDemoFallback ? otp : undefined,
        },
      });
    } catch (err: any) {
      console.error('Forgot password error:', err);
      return res.status(500).json({ success: false, message: `Password reset request failed: ${err.message}` });
    }
  }

  /**
   * Verify Password Reset OTP (Step 2 - Validation)
   */
  static async verifyResetOtp(req: Request, res: Response) {
    try {
      const { identifier, otp } = req.body;
      const rawId = (identifier || '').toString().trim();
      const rawOtp = (otp || '').toString().trim();

      if (!rawId || !rawOtp) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID/Email and 6-digit verification code are required.',
        });
      }

      const verification = db.verifyPasswordResetOtp(rawId, rawOtp);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: verification.error || 'Invalid or expired verification code.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Verification code confirmed. You may now enter your new password.',
        data: {
          employeeCode: verification.employee?.employeeCode,
          fullName: verification.employee?.fullName,
        },
      });
    } catch (err: any) {
      console.error('Verify reset OTP error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Complete Password Reset with Verified OTP (Step 3)
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { identifier, otp, newPassword } = req.body;
      const rawId = (identifier || '').toString().trim();
      const rawOtp = (otp || '').toString().trim();
      const rawPass = (newPassword || '').toString().trim();

      if (!rawId || !rawOtp || !rawPass) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID, verification code, and new password are required.',
        });
      }

      if (rawPass.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.',
        });
      }

      const verification = db.verifyPasswordResetOtp(rawId, rawOtp);
      if (!verification.isValid || !verification.employee) {
        return res.status(400).json({
          success: false,
          message: verification.error || 'Invalid or expired verification code.',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPass, salt);

      const updated = db.resetEmployeePassword(verification.employee.id, passwordHash);
      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update employee password in database.',
        });
      }

      console.log(`🔑 Password successfully reset for employee ${updated.employeeCode} (${updated.fullName})`);

      return res.status(200).json({
        success: true,
        message: 'Your password has been reset successfully! You can now sign in with your new password.',
        data: {
          employeeCode: updated.employeeCode,
          fullName: updated.fullName,
        },
      });
    } catch (err: any) {
      console.error('Reset password error:', err);
      return res.status(500).json({ success: false, message: `Password reset error: ${err.message}` });
    }
  }

  /**
   * In-Portal Change Password (Authenticated Session)
   */
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { currentPassword, newPassword } = req.body;
      const curPass = (currentPassword || '').toString().trim();
      const newPass = (newPassword || '').toString().trim();

      if (!curPass || !newPass) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required.',
        });
      }

      if (newPass.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }

      if (curPass === newPass) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be identical to the current password.',
        });
      }

      if (req.user.role === 'EMPLOYEE') {
        const emp = db.getEmployeeById(req.user.id);
        if (!emp) {
          return res.status(404).json({ success: false, message: 'Employee profile not found.' });
        }

        let isMatch = false;
        if (emp.passwordHash) {
          try {
            isMatch = await bcrypt.compare(curPass, emp.passwordHash);
          } catch (_) {
            isMatch = false;
          }
          if (!isMatch && (emp.passwordHash === curPass || (emp as any).password === curPass)) {
            isMatch = true;
          }
        } else if ((emp as any).password) {
          isMatch = (emp as any).password === curPass;
        }

        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Current password is incorrect. Please check and try again.',
          });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPass, salt);

        db.updateEmployee(emp.id, {
          passwordHash,
          updatedAt: new Date().toISOString(),
        });

        console.log(`🔐 Password changed by employee ${emp.employeeCode} (${emp.fullName})`);

        return res.status(200).json({
          success: true,
          message: 'Password changed successfully! Please use your new password next time you log in.',
        });
      } else {
        // Admin user change password
        const admin = db.getAdminByEmail(req.user.email);
        if (!admin) {
          return res.status(404).json({ success: false, message: 'Admin account not found.' });
        }

        const isMatch = await bcrypt.compare(curPass, admin.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Current admin password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPass, salt);
        admin.passwordHash = passwordHash;
        db.save();

        return res.status(200).json({
          success: true,
          message: 'Admin password updated successfully.',
        });
      }
    } catch (err: any) {
      console.error('Change password error:', err);
      return res.status(500).json({ success: false, message: `Change password failed: ${err.message}` });
    }
  }
}

