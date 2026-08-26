import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, Organization, Employee, AdminUser, AttendanceLog } from './database.js';
import { QrService } from '../services/qrService.js';
import { FaceService } from '../services/faceService.js';

export async function seedDatabase() {
  console.log('🌱 Seeding initial database data...');

  const orgId = 'org_drp_tech_hq';
  const orgLat = 20.278757;
  const orgLng = 85.864144;
  const orgRadius = 300;

  // 1. Create Organization
  const { payloadString, salt } = QrService.generateMasterPayload(orgId, orgLat, orgLng, orgRadius);
  const qrDataUrl = await QrService.generateQrDataUrl(payloadString);

  const org: Organization = {
    id: orgId,
    name: 'DRP Technology HQ',
    code: 'DRP-HQ-01',
    address: '500 Tech Boulevard, Suite 400, Tech City',
    latitude: orgLat,
    longitude: orgLng,
    geofenceRadiusMeters: orgRadius,
    masterQrPayload: payloadString,
    masterQrCodeDataUrl: qrDataUrl,
    qrSecretSalt: salt,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.upsertOrganization(org);

  // 2. Create Super Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin: AdminUser = {
    id: 'admin_master_1',
    email: 'admin@drptech.com',
    fullName: 'Sarah Jenkins (HR Director)',
    passwordHash: adminPasswordHash,
    role: 'SUPER_ADMIN',
    orgId: orgId,
    createdAt: new Date().toISOString(),
  };
  if (!db.getAdminByEmail(admin.email)) {
    db.createAdmin(admin);
  }

  // 3. Create Sample Employees with Face Embeddings
  const sampleEmployees = [
    {
      code: 'EMP-1001',
      name: 'Alex Rivera',
      email: 'alex.rivera@drptech.com',
      department: 'Engineering',
      position: 'Senior Mobile Engineer',
      shiftStart: '09:00',
      shiftEnd: '18:00',
    },
    {
      code: 'EMP-1002',
      name: 'Elena Rostova',
      email: 'elena.rostova@drptech.com',
      department: 'Product',
      position: 'Lead UI/UX Designer',
      shiftStart: '09:30',
      shiftEnd: '18:30',
    },
    {
      code: 'EMP-1003',
      name: 'Marcus Vance',
      email: 'marcus.vance@drptech.com',
      department: 'Engineering',
      position: 'Backend Architect',
      shiftStart: '09:00',
      shiftEnd: '18:00',
    },
    {
      code: 'EMP-1004',
      name: 'Priya Sharma',
      email: 'priya.sharma@drptech.com',
      department: 'Marketing',
      position: 'Growth Strategist',
      shiftStart: '10:00',
      shiftEnd: '19:00',
    },
    {
      code: 'EMP-1005',
      name: 'David Kim',
      email: 'david.kim@drptech.com',
      department: 'Human Resources',
      position: 'People Ops Manager',
      shiftStart: '08:30',
      shiftEnd: '17:30',
    },
  ];

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  for (const item of sampleEmployees) {
    if (!db.getEmployeeByCode(item.code)) {
      const embedding = FaceService.generateEmbeddingFromSeed(`${item.code}-${item.name}`);
      const emp: Employee = {
        id: uuidv4(),
        orgId: orgId,
        employeeCode: item.code,
        fullName: item.name,
        email: item.email,
        phone: '+1 (555) 234-5678',
        department: item.department,
        position: item.position,
        passwordHash: defaultPasswordHash,
        faceEmbedding: embedding,
        photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.name)}`,
        isActive: true,
        shiftStart: item.shiftStart,
        shiftEnd: item.shiftEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.createEmployee(emp);
    }
  }

  // 4. Create sample initial attendance logs for today
  const employees = db.getEmployees(orgId);
  if (db.getAttendanceLogs({ orgId }).length === 0 && employees.length >= 2) {
    const today = new Date();
    
    // Present log
    const log1: AttendanceLog = {
      id: uuidv4(),
      employeeId: employees[0].id,
      employeeCode: employees[0].employeeCode,
      employeeName: employees[0].fullName,
      department: employees[0].department,
      orgId: orgId,
      timestamp: new Date(today.setHours(8, 52, 0, 0)).toISOString(),
      status: 'PRESENT',
      faceSimilarityScore: 0.962,
      livenessScore: 0.98,
      antiSpoofPassed: true,
      latitude: orgLat + 0.00008,
      longitude: orgLng + 0.00005,
      distanceMeters: 8.4,
      isMockLocation: false,
      snapshotUrl: employees[0].photoUrl,
      verificationMethod: 'FACIAL_BIOMETRIC',
      createdAt: new Date().toISOString(),
    };
    db.createAttendanceLog(log1);

    // Late log
    const log2: AttendanceLog = {
      id: uuidv4(),
      employeeId: employees[1].id,
      employeeCode: employees[1].employeeCode,
      employeeName: employees[1].fullName,
      department: employees[1].department,
      orgId: orgId,
      timestamp: new Date(today.setHours(9, 38, 0, 0)).toISOString(),
      status: 'LATE',
      faceSimilarityScore: 0.938,
      livenessScore: 0.96,
      antiSpoofPassed: true,
      latitude: orgLat - 0.00012,
      longitude: orgLng + 0.0001,
      distanceMeters: 14.1,
      isMockLocation: false,
      snapshotUrl: employees[1].photoUrl,
      verificationMethod: 'FACIAL_BIOMETRIC',
      createdAt: new Date().toISOString(),
    };
    db.createAttendanceLog(log2);
  }

  console.log('✅ Database seeded successfully!');
  console.log('🔑 Default Admin Login: admin@drptech.com / admin123');
  console.log('👤 Default Employee Login: EMP-1001 / password123');
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
