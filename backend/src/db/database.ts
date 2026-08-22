import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

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
  shiftStart?: string; // e.g. "09:00"
  shiftEnd?: string;   // e.g. "18:00"
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
  status: 'PRESENT' | 'LATE' | 'REJECTED';
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
}

class DatabaseManager {
  private dbPath: string;
  private data: DatabaseSchema = {
    organizations: [],
    employees: [],
    attendance_logs: [],
    admin_users: [],
  };

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
      } catch (err) {
        console.error('Error loading database file, initializing empty state:', err);
      }
    } else {
      this.save();
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
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
    return org;
  }

  // Employees
  getEmployees(orgId?: string): Employee[] {
    if (orgId) {
      return this.data.employees.filter((e) => e.orgId === orgId);
    }
    return this.data.employees;
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
    this.data.employees.push(employee);
    this.save();
    return employee;
  }

  updateEmployee(id: string, updates: Partial<Employee>): Employee | undefined {
    const idx = this.data.employees.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.data.employees[idx] = {
        ...this.data.employees[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.save();
      return this.data.employees[idx];
    }
    return undefined;
  }

  deleteEmployee(id: string): boolean {
    const initialLen = this.data.employees.length;
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    if (this.data.employees.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
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
    return log;
  }

  // Admin Users
  getAdminByEmail(email: string): AdminUser | undefined {
    return this.data.admin_users.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  createAdmin(admin: AdminUser): AdminUser {
    this.data.admin_users.push(admin);
    this.save();
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

    // Avg confidence
    const validLogs = todayLogs.filter((l) => l.status !== 'REJECTED');
    const avgConfidence =
      validLogs.length > 0
        ? validLogs.reduce((acc, curr) => acc + curr.faceSimilarityScore, 0) / validLogs.length
        : 0.96;

    return {
      totalEmployees,
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
