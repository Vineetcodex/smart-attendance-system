import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { supabaseDb } from './supabaseDb.js';

export interface Organization {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  masterQrPayload: string;
  masterQrCodeDataUrl: string;
  qrSecretSalt: string;
  updatedAt: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  orgId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  passwordHash: string;
  faceEmbedding: number[]; // 512-d normalized ArcFace float vector
  faceEmbeddings?: number[][]; // Multi-pose ArcFace vectors (Straight, Left, Right)
  photoUrl?: string;
  isActive: boolean;
  isApproved?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  shiftStart?: string; // e.g. "09:00"
  shiftEnd?: string;   // e.g. "18:00"
  resetOtp?: string;
  resetOtpExpiresAt?: string;
  resetOtpAttempts?: number;
  createdAt: string;
  updatedAt: string;
}


export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  orgId: string;
  timestamp: string;
  punchType?: 'CHECK_IN' | 'CHECK_OUT';
  workDurationMinutes?: number;
  status: 'PRESENT' | 'LATE' | 'CHECKED_OUT' | 'REJECTED';
  faceSimilarityScore: number; // e.g. 0.94 (94%)
  livenessScore?: number; // e.g. 0.98 (98%)
  antiSpoofPassed?: boolean;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  isMockLocation?: boolean;
  snapshotUrl?: string;
  qrMatchStatus?: boolean;
  failureReason?: string;
  verificationMethod: 'FACIAL_BIOMETRIC' | 'DUAL_QR_FACE' | 'TRIPLE_FACTOR' | 'MANUAL_OVERRIDE';
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'HR_MANAGER' | 'OFFICE_ADMIN';
  orgId: string;
  createdAt: string;
}

interface DatabaseSchema {
  organizations: Organization[];
  employees: Employee[];
  attendance_logs: AttendanceLog[];
  admin_users: AdminUser[];
  deleted_employee_ids?: string[];
}

class DatabaseManager {
  private dbPath: string;
  private data: DatabaseSchema = {
    organizations: [],
    employees: [],
    attendance_logs: [],
    admin_users: [],
  };
  private isCloudSyncing = false;

  constructor() {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
    if (!fs.existsSync(config.uploadsDir)) {
      fs.mkdirSync(config.uploadsDir, { recursive: true });
    }
    this.dbPath = path.join(config.dataDir, 'database.json');
    this.load();
  }

  private load(): void {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        // Default existing pre-seeded employees to approved
        if (Array.isArray(this.data.employees)) {
          let updated = false;
          for (const emp of this.data.employees) {
            if (emp.approvalStatus === undefined) {
              emp.isApproved = true;
              emp.approvalStatus = 'APPROVED';
              updated = true;
            }
          }
          if (updated) {
            this.save();
          }
        }
      } catch (err) {
        console.error('Error loading database file, initializing empty state:', err);
      }
    } else {
      this.save();
    }
  }

  public save(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  /**
   * Bidirectional cloud synchronization:
   * Restores latest cloud state from Supabase on boot and pushes any missing local logs/employees up to Supabase.
   */
  public async syncWithCloud(): Promise<boolean> {
    if (this.isCloudSyncing) return false;
    this.isCloudSyncing = true;
    try {
      const isConnected = await supabaseDb.checkConnection();
      if (!isConnected) {
        console.log('ℹ️ Supabase not reachable or credentials unconfigured. Running in local persistence mode.');
        this.isCloudSyncing = false;
        return false;
      }

      console.log('☁️ Syncing local database with Supabase Cloud...');

      // 1. Sync Organizations
      const cloudOrgs = await supabaseDb.getOrganizations();
      if (cloudOrgs.length > 0) {
        for (const cOrg of cloudOrgs) {
          const idx = this.data.organizations.findIndex((o) => o.id === cOrg.id);
          if (idx >= 0) {
            this.data.organizations[idx] = { ...this.data.organizations[idx], ...cOrg };
          } else {
            this.data.organizations.push(cOrg);
          }
        }
      } else if (this.data.organizations.length > 0) {
        for (const localOrg of this.data.organizations) {
          await supabaseDb.upsertOrganization(localOrg);
        }
      }

      // 2. Sync Employees (Cloud is master, but push unique local ones up)
      const cloudEmployees = await supabaseDb.getEmployees();
      const cloudEmpMap = new Map<string, Employee>();
      for (const ce of cloudEmployees) {
        cloudEmpMap.set(ce.id, ce);
        if (ce.employeeCode) cloudEmpMap.set(ce.employeeCode.toUpperCase(), ce);
      }

      // Merge Cloud employees into Local
      const deletedSet = new Set((this.data.deleted_employee_ids || []).map((s: string) => s.toUpperCase()));

      for (const ce of cloudEmployees) {
        // If employee was explicitly deleted by administrator, delete from cloud and do not resurrect
        if (deletedSet.has(ce.id.toUpperCase()) || (ce.employeeCode && deletedSet.has(ce.employeeCode.toUpperCase()))) {
          supabaseDb.deleteEmployee(ce.id).catch(() => {});
          continue;
        }

        const localIdx = this.data.employees.findIndex(
          (e) => e.id === ce.id || e.employeeCode.toUpperCase() === ce.employeeCode.toUpperCase()
        );
        if (localIdx >= 0) {
          const localEmp = this.data.employees[localIdx];
          // Permanent Administrative Status Locking: Once approved, never revert to pending
          let finalApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED';
          if (localEmp.approvalStatus === 'REJECTED' || ce.approvalStatus === 'REJECTED') {
            finalApprovalStatus = 'REJECTED';
          } else if (
            localEmp.approvalStatus === 'APPROVED' ||
            ce.approvalStatus === 'APPROVED' ||
            localEmp.isApproved === true ||
            ce.isApproved === true ||
            ce.isActive === true
          ) {
            finalApprovalStatus = 'APPROVED';
          } else {
            finalApprovalStatus = 'PENDING';
          }

          const finalIsApproved = finalApprovalStatus === 'APPROVED';
          const finalIsActive = finalApprovalStatus === 'APPROVED';

          this.data.employees[localIdx] = {
            ...localEmp,
            ...ce,
            isActive: finalIsActive,
            isApproved: finalIsApproved,
            approvalStatus: finalApprovalStatus,
            rejectionReason: finalApprovalStatus === 'REJECTED' ? (localEmp.rejectionReason || ce.rejectionReason) : undefined,
          };

          // If local was approved but cloud was not yet updated, sync up to Supabase
          if (finalApprovalStatus === 'APPROVED' && (ce.approvalStatus !== 'APPROVED' || ce.isActive !== true)) {
            supabaseDb.upsertEmployee(this.data.employees[localIdx]).catch(() => {});
          }
        } else {
          const isDeleted = Array.isArray(this.data.deleted_employee_ids) && (
            this.data.deleted_employee_ids.includes(ce.id) ||
            this.data.deleted_employee_ids.includes(ce.employeeCode) ||
            this.data.deleted_employee_ids.includes(ce.employeeCode.toUpperCase())
          );
          if (!isDeleted) {
            this.data.employees.push(ce);
          }
        }
      }

      // Push any local employees not present in Cloud to Supabase
      const primaryOrg = this.getPrimaryOrganization() || (cloudOrgs.length > 0 ? cloudOrgs[0] : null);
      for (const le of this.data.employees) {
        if (!cloudEmpMap.has(le.id) && !cloudEmpMap.has(le.employeeCode.toUpperCase())) {
          if (primaryOrg) {
            le.orgId = primaryOrg.id;
          }
          console.log(`☁️ Uploading local employee ${le.employeeCode} (${le.fullName}) to Supabase...`);
          await supabaseDb.upsertEmployee(le);
        }
      }

      // Save merged changes to disk
      this.save();

      // 3. Sync Attendance Logs (Union of both)
      const cloudLogs = await supabaseDb.getAttendanceLogs();
      const cloudLogIds = new Set(cloudLogs.map((l) => l.id));
      const localLogIds = new Set(this.data.attendance_logs.map((l) => l.id));

      // Add missing cloud logs to local
      for (const cl of cloudLogs) {
        if (!localLogIds.has(cl.id)) {
          this.data.attendance_logs.push(cl);
          localLogIds.add(cl.id);
        }
      }

      // Build lookup for active employee IDs
      const validEmpIds = new Set(this.data.employees.map((e) => e.id));
      const codeToIdMap = new Map<string, string>();
      for (const e of this.data.employees) {
        codeToIdMap.set(e.employeeCode.toUpperCase(), e.id);
      }

      // Push missing local logs up to Supabase (ensuring valid employee foreign key)
      let uploadedLogsCount = 0;
      for (const ll of this.data.attendance_logs) {
        if (!cloudLogIds.has(ll.id)) {
          if (!validEmpIds.has(ll.employeeId) && codeToIdMap.has(ll.employeeCode.toUpperCase())) {
            ll.employeeId = codeToIdMap.get(ll.employeeCode.toUpperCase())!;
          }
          if (validEmpIds.has(ll.employeeId)) {
            await supabaseDb.createAttendanceLog(ll);
            cloudLogIds.add(ll.id);
            uploadedLogsCount++;
          }
        }
      }
      if (uploadedLogsCount > 0) {
        console.log(`☁️ Uploaded ${uploadedLogsCount} offline/local attendance logs to Supabase.`);
      }


      // 4. Sync Admin Users
      const cloudAdmins = await supabaseDb.getAdmins();
      for (const ca of cloudAdmins) {
        const idx = this.data.admin_users.findIndex((a) => a.email.toLowerCase() === ca.email.toLowerCase());
        if (idx >= 0) {
          this.data.admin_users[idx] = ca;
        } else {
          this.data.admin_users.push(ca);
        }
      }
      for (const la of this.data.admin_users) {
        if (!cloudAdmins.some((ca) => ca.email.toLowerCase() === la.email.toLowerCase())) {
          await supabaseDb.upsertAdmin(la);
        }
      }

      // Sort logs latest first
      this.data.attendance_logs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      this.save();
      console.log(
        `✅ Cloud sync complete: ${this.data.employees.length} employees, ${this.data.attendance_logs.length} attendance logs active.`
      );
      return true;
    } catch (err) {
      console.error('⚠️ Cloud sync exception:', err);
      return false;
    } finally {
      this.isCloudSyncing = false;
    }
  }


  // Organizations
  getOrganizations(): Organization[] {
    return this.data.organizations;
  }

  getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find((o) => o.id === id);
  }

  getPrimaryOrganization(): Organization | undefined {
    return this.data.organizations[0];
  }

  upsertOrganization(org: Organization): Organization {
    const idx = this.data.organizations.findIndex((o) => o.id === org.id);
    if (idx >= 0) {
      this.data.organizations[idx] = org;
    } else {
      this.data.organizations.push(org);
    }
    this.save();
    supabaseDb.upsertOrganization(org).catch((e) => console.warn('Supabase sync org error:', e));
    return org;
  }

  // Employees
  getEmployees(orgId?: string): Employee[] {
    if (orgId) {
      return this.data.employees.filter((e) => e.orgId === orgId);
    }
    return this.data.employees;
  }

  getPendingEmployees(orgId?: string): Employee[] {
    return this.getEmployees(orgId).filter(
      (e) => e.approvalStatus === 'PENDING'
    );
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  getEmployeeByCode(code: string): Employee | undefined {
    return this.data.employees.find((e) => e.employeeCode.toLowerCase() === code.toLowerCase());
  }

  getEmployeeByEmail(email: string): Employee | undefined {
    return this.data.employees.find((e) => e.email.toLowerCase() === email.toLowerCase());
  }

  createEmployee(employee: Employee): Employee {
    if (employee.approvalStatus === undefined) {
      employee.approvalStatus = employee.isApproved ? 'APPROVED' : 'PENDING';
    }
    // If this code or ID was previously deleted, un-blacklist it
    if (Array.isArray(this.data.deleted_employee_ids)) {
      this.data.deleted_employee_ids = this.data.deleted_employee_ids.filter(
        (id: string) => id.toLowerCase() !== employee.id.toLowerCase() && id.toLowerCase() !== employee.employeeCode.toLowerCase()
      );
    }
    this.data.employees.push(employee);
    this.save();
    supabaseDb.upsertEmployee(employee).catch((e) => console.warn('Supabase sync employee error:', e));
    return employee;
  }

  updateEmployee(idOrCode: string, updates: Partial<Employee>): Employee | undefined {
    const cleanLookup = (idOrCode || '').trim().toLowerCase();
    const idx = this.data.employees.findIndex(
      (e) =>
        e.id.toLowerCase() === cleanLookup ||
        e.employeeCode.toLowerCase() === cleanLookup ||
        (e.email && e.email.toLowerCase() === cleanLookup)
    );
    if (idx >= 0) {
      this.data.employees[idx] = {
        ...this.data.employees[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.save();
      supabaseDb.upsertEmployee(this.data.employees[idx]).catch((e) => console.warn('Supabase sync employee error:', e));
      return this.data.employees[idx];
    }
    return undefined;
  }

  approveEmployee(idOrCode: string, adminName?: string): Employee | undefined {
    return this.updateEmployee(idOrCode, {
      isApproved: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: adminName || 'Admin',
      isActive: true,
      rejectionReason: undefined,
    });
  }

  rejectEmployee(idOrCode: string, reason?: string): Employee | undefined {
    return this.updateEmployee(idOrCode, {
      isApproved: false,
      approvalStatus: 'REJECTED',
      rejectionReason: reason || 'Registration rejected by administrator.',
    });
  }

  deleteEmployee(idOrCode: string): boolean {
    const initialLen = this.data.employees.length;
    const target = this.data.employees.find(
      (e) => e.id === idOrCode || e.employeeCode.toLowerCase() === idOrCode.toLowerCase()
    );
    this.data.employees = this.data.employees.filter(
      (e) => e.id !== idOrCode && e.employeeCode.toLowerCase() !== idOrCode.toLowerCase()
    );

    this.data.deleted_employee_ids = this.data.deleted_employee_ids || [];
    if (idOrCode && !this.data.deleted_employee_ids.includes(idOrCode)) {
      this.data.deleted_employee_ids.push(idOrCode);
    }
    if (target?.id && !this.data.deleted_employee_ids.includes(target.id)) {
      this.data.deleted_employee_ids.push(target.id);
    }
    if (target?.employeeCode && !this.data.deleted_employee_ids.includes(target.employeeCode)) {
      this.data.deleted_employee_ids.push(target.employeeCode);
    }

    if (this.data.employees.length !== initialLen || target) {
      this.save();
      const deleteIdentifier = target?.id || idOrCode;
      supabaseDb.deleteEmployee(deleteIdentifier).catch((e) => console.warn('Supabase delete employee error:', e));
      if (target?.employeeCode) {
        supabaseDb.deleteEmployee(target.employeeCode).catch(() => {});
      }
      return true;
    }
    // Also trigger cloud deletion just in case
    supabaseDb.deleteEmployee(idOrCode).catch(() => {});
    return false;
  }

  // Password Reset & OTP Management
  setPasswordResetOtp(idOrCode: string, otp: string, expiryMs: number = 10 * 60 * 1000): Employee | undefined {
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();
    return this.updateEmployee(idOrCode, {
      resetOtp: otp,
      resetOtpExpiresAt: expiresAt,
      resetOtpAttempts: 0,
    });
  }

  verifyPasswordResetOtp(
    idOrCode: string,
    otp: string
  ): { isValid: boolean; employee?: Employee; error?: string } {
    const emp =
      this.getEmployeeById(idOrCode) ||
      this.getEmployeeByCode(idOrCode) ||
      this.getEmployeeByEmail(idOrCode);

    if (!emp) {
      return { isValid: false, error: 'Employee account not found.' };
    }

    if (!emp.resetOtp || !emp.resetOtpExpiresAt) {
      return { isValid: false, error: 'No active password reset request found. Please request a new code.' };
    }

    const expiresTime = new Date(emp.resetOtpExpiresAt).getTime();
    if (Date.now() > expiresTime) {
      return { isValid: false, error: 'Verification code has expired (valid for 10 minutes). Please request a new one.' };
    }

    // Rate-limiting failed attempts
    const attempts = (emp.resetOtpAttempts || 0) + 1;
    if (attempts > 5) {
      this.clearPasswordResetOtp(emp.id);
      return { isValid: false, error: 'Too many incorrect attempts. Please request a new verification code.' };
    }

    if (emp.resetOtp.trim() !== otp.trim()) {
      this.updateEmployee(emp.id, { resetOtpAttempts: attempts });
      return { isValid: false, error: `Invalid verification code. ${5 - attempts} attempts remaining.` };
    }

    return { isValid: true, employee: emp };
  }

  clearPasswordResetOtp(idOrCode: string): Employee | undefined {
    return this.updateEmployee(idOrCode, {
      resetOtp: undefined,
      resetOtpExpiresAt: undefined,
      resetOtpAttempts: 0,
    });
  }

  resetEmployeePassword(idOrCode: string, newPasswordHash: string): Employee | undefined {
    return this.updateEmployee(idOrCode, {
      passwordHash: newPasswordHash,
      resetOtp: undefined,
      resetOtpExpiresAt: undefined,
      resetOtpAttempts: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  // Attendance Logs

  getAttendanceLogs(filter?: {
    orgId?: string;
    employeeId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): AttendanceLog[] {
    let logs = [...this.data.attendance_logs];

    if (filter?.orgId) {
      logs = logs.filter((l) => l.orgId === filter.orgId);
    }
    if (filter?.employeeId) {
      logs = logs.filter((l) => l.employeeId === filter.employeeId);
    }
    if (filter?.department) {
      logs = logs.filter((l) => l.department.toLowerCase() === filter.department!.toLowerCase());
    }
    if (filter?.status) {
      logs = logs.filter((l) => l.status === filter.status);
    }
    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() >= start);
    }
    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() <= end);
    }

    // Sort latest first
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  createAttendanceLog(log: AttendanceLog): AttendanceLog {
    this.data.attendance_logs.push(log);
    this.save();
    supabaseDb.createAttendanceLog(log).catch((e) => console.warn('Supabase sync log error:', e));
    return log;
  }

  // Admin Users
  getAdminByEmail(email: string): AdminUser | undefined {
    return this.data.admin_users.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  createAdmin(admin: AdminUser): AdminUser {
    this.data.admin_users.push(admin);
    this.save();
    supabaseDb.upsertAdmin(admin).catch((e) => console.warn('Supabase sync admin error:', e));
    return admin;
  }

  // Statistics helper
  getAttendanceStats(orgId: string) {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = this.data.attendance_logs.filter(
      (l) => l.orgId === orgId && l.timestamp.startsWith(today)
    );
    const activeEmployees = this.data.employees.filter((e) => e.orgId === orgId && e.isActive);

    const presentCount = todayLogs.filter((l) => l.status === 'PRESENT').length;
    const lateCount = todayLogs.filter((l) => l.status === 'LATE').length;
    const rejectedCount = todayLogs.filter((l) => l.status === 'REJECTED').length;
    const totalEmployees = activeEmployees.length;
    const absentCount = Math.max(0, totalEmployees - (presentCount + lateCount));

    // In-Office tracking: determine if employee's most recent valid punch today is CHECK_IN
    const employeeLatestPunch: Record<string, string> = {};
    // Sort chronological to get most recent state
    const sortedTodayLogs = [...todayLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (const log of sortedTodayLogs) {
      if (log.status !== 'REJECTED') {
        employeeLatestPunch[log.employeeId] = log.punchType || (log.status === 'CHECKED_OUT' ? 'CHECK_OUT' : 'CHECK_IN');
      }
    }
    const inOfficeCount = Object.values(employeeLatestPunch).filter((p) => p === 'CHECK_IN').length;
    const checkedInCount = todayLogs.filter(
      (l) => (l.punchType === 'CHECK_IN' || (!l.punchType && l.status !== 'REJECTED')) && l.status !== 'REJECTED'
    ).length;
    const checkedOutCount = todayLogs.filter(
      (l) => (l.punchType === 'CHECK_OUT' || l.status === 'CHECKED_OUT') && l.status !== 'REJECTED'
    ).length;

    // Avg confidence
    const validLogs = todayLogs.filter((l) => l.status !== 'REJECTED');
    const avgConfidence =
      validLogs.length > 0
        ? validLogs.reduce((acc, curr) => acc + curr.faceSimilarityScore, 0) / validLogs.length
        : 0.96;

    return {
      totalEmployees,
      inOfficeCount,
      checkedInToday: checkedInCount,
      checkedOutToday: checkedOutCount,
      presentToday: presentCount,
      lateToday: lateCount,
      absentToday: absentCount,
      rejectedAttemptsToday: rejectedCount,
      averageConfidence: parseFloat((avgConfidence * 100).toFixed(1)),
      attendanceRate: totalEmployees > 0 ? parseFloat((((presentCount + lateCount) / totalEmployees) * 100).toFixed(1)) : 0,
    };
  }
}

export const db = new DatabaseManager();
