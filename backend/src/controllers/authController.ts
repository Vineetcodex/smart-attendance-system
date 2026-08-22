import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { config } from '../config/env.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

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
      const { identifier, password } = req.body; // identifier can be employeeCode or email
      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Employee code/email and password required.' });
      }

      let employee = db.getEmployeeByCode(identifier);
      if (!employee) {
        employee = db.getEmployeeByEmail(identifier);
      }

      if (!employee || !employee.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
      }

      const isMatch = await bcrypt.compare(password, employee.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
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

      // Auto-generate code if not provided
      const code = (employeeCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

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

      // If already exists, update & log in directly
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
          shiftStart: shiftStart || 'Flexible 24x7',
          shiftEnd: shiftEnd || 'Anytime',
          department: (department || 'Engineering').trim(),
          position: (position || 'Software Engineer').trim(),
        });

        const token = jwt.sign(
          {
            id: existingEmp.id,
            email: existingEmp.email,
            employeeCode: existingEmp.employeeCode,
            role: 'EMPLOYEE',
            orgId: existingEmp.orgId,
            fullName: existingEmp.fullName,
          },
          config.jwtSecret,
          { expiresIn: '30d' }
        );

        return res.status(200).json({
          success: true,
          message: 'Account and Face ID updated successfully!',
          data: {
            token,
            employee: updated || existingEmp,
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
        shiftStart,
        shiftEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.createEmployee(newEmployee);

      const token = jwt.sign(
        {
          id: newEmployee.id,
          email: newEmployee.email,
          employeeCode: newEmployee.employeeCode,
          role: 'EMPLOYEE',
          orgId: newEmployee.orgId,
          fullName: newEmployee.fullName,
        },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      const { passwordHash: _, ...sanitized } = newEmployee;

      return res.status(201).json({
        success: true,
        message: 'Face ID registered and account created successfully!',
        data: {
          token,
          employee: sanitized,
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
}
