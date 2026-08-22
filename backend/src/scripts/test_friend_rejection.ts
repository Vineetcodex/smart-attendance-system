import { FaceService } from '../services/faceService.js';

function runBiometricTest() {
  console.log('=== BIOMETRIC ACCURACY VERIFICATION: SAME FACE VS FRIEND / STRANGER ===');

  // 1. Enrolled Face (Employee DRP02)
  const employeeEmbedding = FaceService.normalizeVector(
    Array.from({ length: 128 }, () => Math.random() - 0.5)
  );

  // 2. Legitimate Employee Scanning Again (slight lighting variation, dist ~0.20)
  const legitimateScan = FaceService.normalizeVector(
    employeeEmbedding.map((v) => v + (Math.random() - 0.5) * 0.04)
  );

  // 3. Friend / Stranger Scanning (different face identity, dist ~1.20)
  const friendScan = FaceService.normalizeVector(
    Array.from({ length: 128 }, () => Math.random() - 0.5)
  );

  const legitimateResult = FaceService.verifyFace(legitimateScan, employeeEmbedding);
  const friendResult = FaceService.verifyFace(friendScan, employeeEmbedding);

  console.log('1. Legitimate Employee Verification:', {
    isMatch: legitimateResult.isMatch,
    score: `${(legitimateResult.similarityScore * 100).toFixed(1)}%`,
    error: legitimateResult.error || 'None',
  });

  console.log('2. Friend / Impostor Verification:', {
    isMatch: friendResult.isMatch,
    score: `${(friendResult.similarityScore * 100).toFixed(1)}%`,
    error: friendResult.error || 'None',
  });

  if (legitimateResult.isMatch && !friendResult.isMatch) {
    console.log('✅ TEST PASSED: Legitimate employee was ACCEPTED, and Friend / Impostor was REJECTED!');
  } else {
    console.error('❌ TEST FAILED: Biometric discrimination issue.');
  }
}

runBiometricTest();
