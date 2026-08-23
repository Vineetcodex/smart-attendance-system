import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

async function testDuplicateSignup() {
  const API_URL = 'http://localhost:5000/api/v1';
  
  // Find an existing employee's real face embedding from the database
  const existingEmployees = db.getEmployees();
  console.log(`Existing employees in DB: ${existingEmployees.length}`);
  
  const targetEmp = existingEmployees[0];
  console.log(`Testing with face of: ${targetEmp.employeeCode} (${targetEmp.fullName})`);

  const realVector = targetEmp.faceEmbedding || (targetEmp.faceEmbeddings ? targetEmp.faceEmbeddings[0] : null);
  if (!realVector) {
    console.error('No vector found on target employee');
    return;
  }

  // Slightly perturb the vector to simulate a new live camera capture of the SAME person (e.g. noise / lighting diff)
  const probeVector = realVector.map(v => v + (Math.random() - 0.5) * 0.05);
  const normalizedProbe = FaceService.normalizeVector(probeVector);

  const testDistance = FaceService.calculateFaceDistance(realVector, normalizedProbe);
  console.log(`Simulated capture distance to enrolled face: ${testDistance.distance} (Score: ${(testDistance.similarity * 100).toFixed(1)}%, isMatch: ${testDistance.isMatch})`);

  console.log('\n--- 1. Testing Proactive Duplicate Check Endpoint ---');
  try {
    const checkRes = await fetch(`${API_URL}/auth/check-face-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceEmbedding: normalizedProbe }),
    });
    const checkData: any = await checkRes.json();
    console.log('Check endpoint response:', checkData);
    if (checkData.isDuplicate) {
      console.log('✅ Proactive check SUCCESS: Duplicate correctly detected!');
    } else {
      console.error('❌ Proactive check FAILED: Duplicate was NOT detected.');
    }
  } catch (err: any) {
    console.error('Check endpoint error:', err.message);
  }

  console.log('\n--- 2. Testing Employee Signup with Same Face under Different Email & ID ---');
  try {
    const signupRes = await fetch(`${API_URL}/auth/employee-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Impostor Clone',
        employeeCode: 'CLONE-' + Math.floor(1000 + Math.random() * 9000),
        email: `clone.${Date.now()}@example.com`,
        password: 'password123',
        department: 'Engineering',
        faceEmbedding: normalizedProbe,
      }),
    });
    const signupData: any = await signupRes.json();
    if (signupRes.status === 409 && signupData.isMalpractice) {
      console.log('✅ Signup REJECTED as expected (HTTP 409 Conflict):');
      console.log('   Message:', signupData.message);
      console.log('   Matched Employee:', signupData.matchedEmployee);
      console.log('   Similarity Score:', (signupData.similarityScore * 100).toFixed(1) + '%');
    } else {
      console.error('❌ Signup FAILED to block duplicate. Status:', signupRes.status, signupData);
    }
  } catch (err: any) {
    console.error('Unexpected error:', err);
  }
}

testDuplicateSignup();

