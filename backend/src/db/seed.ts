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

  console.log('✅ Database seeded successfully with Organization & Super Admin!');
  console.log('🔑 Default Admin Login: admin@drptech.com / admin123');
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
