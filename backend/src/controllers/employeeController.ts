import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, Employee } from '../db/database.js';
import { FaceService } from '../services/faceService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class EmployeeController {
  /**
   * List all employees
   */
  static async getEmployees(req: AuthRequest, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      const department = req.query.department as string;
      let employees = db.getEmployees(org?.id);

      if (department && department !== 'ALL') {
        employees = employees.filter((e) => e.department.toLowerCase() === department.toLowerCase());
      }

      // Hide passwordHash in listing
      const sanitized = employees.map(({ passwordHash, ...rest }) => rest);
      return res.json({ success: true, count: sanitized.length, data: sanitized });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get employee by ID
   */
  static async getEmployeeById(req: Request, res: Response) {
    try {
      const emp = db.getEmployeeById(req.params.id);
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      const { passwordHash, ...sanitized } = emp;
      return res.json({ success: true, data: sanitized });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Create & Onboard a new Employee
   */
  static async createEmployee(req: AuthRequest, res: Response) {
    try {
      const {
        employeeCode,
        fullName,
        email,
        phone,
        department,
        position,
        password,
        faceEmbedding,
        photoUrl,
        shiftStart,
        shiftEnd,
      } = req.body;

      if (!employeeCode || !fullName || !email) {
        return res.status(400).json({ success: false, message: 'Employee code, full name, and email are required.' });
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
      const normalizedCode = codeValidation.normalizedCode;

      const existingCode = db.getEmployeeByCode(normalizedCode);
      if (existingCode) {
        return res.status(400).json({ success: false, message: `Employee code ${normalizedCode} already in use.` });
      }

      const existingEmail = db.getEmployeeByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `Email ${email} is already registered.` });
      }

      const org = db.getPrimaryOrganization();
      const orgId = org?.id || 'org_default_hq_1';

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || 'password123', salt);

      // If faceEmbedding not provided, generate a deterministic baseline from employee code & name
      const embedding =
        faceEmbedding && Array.isArray(faceEmbedding) && faceEmbedding.length > 0
          ? FaceService.normalizeVector(faceEmbedding)
          : FaceService.generateEmbeddingFromSeed(`${normalizedCode}-${fullName}`);

      // Malpractice / Duplicate Biometric Check: Prevent duplicate enrollment of same face
      const existingEmployees = db.getEmployees(orgId);
      const duplicateMatch = FaceService.findDuplicateFace(embedding, existingEmployees);

      if (duplicateMatch.isDuplicate && duplicateMatch.matchedEmployee) {
        return res.status(409).json({
          success: false,
          isMalpractice: true,
          matchedEmployee: {
            employeeCode: duplicateMatch.matchedEmployee.employeeCode,
            fullName: duplicateMatch.matchedEmployee.fullName,
          },
          similarityScore: duplicateMatch.similarityScore,
          message: `🚨 MALPRACTICE BLOCKED: Face biometric matches existing registered employee "${duplicateMatch.matchedEmployee.employeeCode}" (${duplicateMatch.matchedEmployee.fullName}) with ${(duplicateMatch.similarityScore * 100).toFixed(1)}% match. Registration denied.`,
        });
      }

      const newEmployee: Employee = {
        id: uuidv4(),
        orgId,
        employeeCode: normalizedCode,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || '',
        department: department || 'Engineering',
        position: position || 'Team Member',
        passwordHash,
        faceEmbedding: embedding,
        photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
        isActive: true,
        shiftStart: shiftStart || '09:00',
        shiftEnd: shiftEnd || '18:00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.createEmployee(newEmployee);

      const { passwordHash: _, ...sanitized } = newEmployee;
      return res.status(201).json({
        success: true,
        message: 'Employee registered and facial baseline enrolled successfully.',
        data: sanitized,
      });
    } catch (err: any) {
      console.error('Create employee error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Update Employee
   */
  static async updateEmployee(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updates.passwordHash = await bcrypt.hash(updates.password, salt);
        delete updates.password;
      }

      if (updates.faceEmbedding && Array.isArray(updates.faceEmbedding)) {
        updates.faceEmbedding = FaceService.normalizeVector(updates.faceEmbedding);
      }

      const updated = db.updateEmployee(id, updates);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      const { passwordHash, ...sanitized } = updated;
      return res.json({ success: true, message: 'Employee updated.', data: sanitized });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Delete Employee
   */
  static async deleteEmployee(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const success = db.deleteEmployee(id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      return res.json({ success: true, message: 'Employee deleted.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
