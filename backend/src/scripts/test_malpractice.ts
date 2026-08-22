import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

async function testMalpractice() {
  console.log('--- TESTING ANTI-MALPRACTICE / DUPLICATE REGISTRATION PREVENTION ---');

  // 1. Get an existing employee's enrolled embedding
  const employees = db.getEmployees();
  const existingEmp = employees.find(e => e.faceEmbedding && e.faceEmbedding.length > 0);

  if (!existingEmp || !existingEmp.faceEmbedding) {
    console.error('No employee with face embedding found in DB.');
    return;
  }

  console.log(`Original Employee: ${existingEmp.fullName} (${existingEmp.employeeCode})`);

  // 2. Simulate the same person trying to register again with a new ID (e.g. EMP-9999, John Doe)
  // Add slight natural noise to simulate new camera capture of same face
  const probeFace = existingEmp.faceEmbedding.map(v => v + (Math.random() - 0.5) * 0.04);
  const normalizedProbe = FaceService.normalizeVector(probeFace);

  // 3. Perform 1:N vector identification
  const duplicateMatch = FaceService.findBestMatch(normalizedProbe, employees, 0.70);

  console.log('1:N Identification Result:', {
    isDuplicateDetected: !!duplicateMatch.matchedEmployee,
    matchedEmployeeCode: duplicateMatch.matchedEmployee?.employeeCode,
    matchedEmployeeName: duplicateMatch.matchedEmployee?.fullName,
    similarityScore: `${(duplicateMatch.similarityScore * 100).toFixed(1)}%`,
  });

  if (duplicateMatch.matchedEmployee) {
    console.log('✅ MALPRACTICE SUCCESSFULLY CAUGHT & BLOCKED!');
  } else {
    console.error('❌ Failed to detect duplicate face.');
  }
}

testMalpractice().catch(console.error);
