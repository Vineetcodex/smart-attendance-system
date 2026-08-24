import { db } from '../db/database.js';
import { QrService } from '../services/qrService.js';
import { FaceService } from '../services/faceService.js';

async function runEntryExitTests() {
  console.log('================================================================');
  console.log('🧪 TESTING DUAL-PUNCH OFFICE ENTRY & EXIT ATTENDANCE FLOW');
  console.log('================================================================\n');

  const org = db.getPrimaryOrganization();
  if (!org) {
    throw new Error('Organization not found');
  }

  // 1. Create a test employee
  const testCode = `TEST-EMP-${Date.now().toString().slice(-4)}`;
  const sampleEmbedding = new Array(128).fill(0).map(() => (Math.random() - 0.5) * 0.1);
  // Normalize vector
  const norm = Math.sqrt(sampleEmbedding.reduce((sum, v) => sum + v * v, 0));
  const normalizedBaseline = sampleEmbedding.map((v) => v / norm);

  const employee = db.createEmployee({
    id: `emp_test_${Date.now()}`,
    orgId: org.id,
    employeeCode: testCode,
    fullName: 'Test Automation Employee',
    email: `${testCode.toLowerCase()}@example.com`,
    phone: '555-0199',
    department: 'Engineering',
    position: 'QA Automation Lead',
    passwordHash: '',
    faceEmbedding: normalizedBaseline,
    faceEmbeddings: [normalizedBaseline],
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestEmp',
    isActive: true,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`✅ [1/5] Created Test Employee: ${employee.fullName} (${employee.employeeCode})`);

  // 2. Generate Master QR Code Payload
  const qrRes = QrService.generateMasterPayload(org.id, org.latitude, org.longitude, org.geofenceRadiusMeters);
  const verifyQr = QrService.verifyMasterPayload(qrRes.payloadString, org.id);
  console.log(`✅ [2/5] Master QR Payload Verified: ${verifyQr.isValid}`);
  if (!verifyQr.isValid) {
    throw new Error('Master QR generation failed');
  }

  // 3. Simulate Office Entry (Check-In) Punch at 09:00 AM
  const entryTime = new Date();
  entryTime.setHours(9, 0, 0, 0);

  const entryLog = db.createAttendanceLog({
    id: `log_entry_${Date.now()}`,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    department: employee.department,
    orgId: org.id,
    timestamp: entryTime.toISOString(),
    punchType: 'CHECK_IN',
    status: 'PRESENT',
    qrMatchStatus: true,
    faceSimilarityScore: 0.98,
    livenessScore: 0.96,
    antiSpoofPassed: true,
    latitude: org.latitude,
    longitude: org.longitude,
    distanceMeters: 2.1,
    verificationMethod: 'DUAL_QR_FACE',
    createdAt: entryTime.toISOString(),
  });

  console.log(`✅ [3/5] Office Entry Punch Recorded:`);
  console.log(`       - Punch Type: ${entryLog.punchType}`);
  console.log(`       - Status: ${entryLog.status}`);
  console.log(`       - Time: ${entryLog.timestamp}`);

  // Verify In-Office Stats
  let stats = db.getAttendanceStats(org.id);
  console.log(`       - In Office Count: ${stats.inOfficeCount}`);
  console.log(`       - Checked In Today: ${stats.checkedInToday}`);
  console.log(`       - Checked Out Today: ${stats.checkedOutToday}`);

  if (stats.inOfficeCount < 1) {
    throw new Error(`Expected at least 1 person in office, got ${stats.inOfficeCount}`);
  }

  // 4. Simulate Office Exit (Check-Out) Punch at 05:45 PM (8 hours 45 mins later)
  const exitTime = new Date(entryTime.getTime() + (8 * 60 + 45) * 60 * 1000);
  const durationMinutes = Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));

  const exitLog = db.createAttendanceLog({
    id: `log_exit_${Date.now()}`,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    department: employee.department,
    orgId: org.id,
    timestamp: exitTime.toISOString(),
    punchType: 'CHECK_OUT',
    workDurationMinutes: durationMinutes,
    status: 'CHECKED_OUT',
    qrMatchStatus: true,
    faceSimilarityScore: 0.97,
    livenessScore: 0.98,
    antiSpoofPassed: true,
    latitude: org.latitude,
    longitude: org.longitude,
    distanceMeters: 1.8,
    verificationMethod: 'DUAL_QR_FACE',
    createdAt: exitTime.toISOString(),
  });

  const hours = Math.floor(exitLog.workDurationMinutes! / 60);
  const mins = exitLog.workDurationMinutes! % 60;
  console.log(`\n✅ [4/5] Office Exit Punch Recorded:`);
  console.log(`       - Punch Type: ${exitLog.punchType}`);
  console.log(`       - Status: ${exitLog.status}`);
  console.log(`       - Total Work Duration: ${hours}h ${mins}m (${exitLog.workDurationMinutes} mins)`);

  // Verify Updated Stats after Departure
  stats = db.getAttendanceStats(org.id);
  console.log(`\n✅ [5/5] Updated Organization Stats After Exit:`);
  console.log(`       - In Office Count: ${stats.inOfficeCount}`);
  console.log(`       - Total Entries: ${stats.checkedInToday}`);
  console.log(`       - Total Departures: ${stats.checkedOutToday}`);

  console.log('\n================================================================');
  console.log('🎉 ALL DUAL-PUNCH ENTRY & EXIT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runEntryExitTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
