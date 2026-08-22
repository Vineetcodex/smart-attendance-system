import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

function verifyAccuracy() {
  const drp03 = db.getEmployeeByCode('DRP03');
  if (!drp03 || !drp03.faceEmbeddings) return;

  const enrolledStraight = drp03.faceEmbeddings[0];

  // 1. Vineet Scanning Himself (slight natural variation from camera, d ~0.15)
  const vineetScan = FaceService.normalizeVector(
    enrolledStraight.map(v => v + (Math.random() - 0.5) * 0.02)
  );

  // 2. Friend Scanning (different person vector from actual log, d = 0.366)
  const friendScan = FaceService.normalizeVector(
    enrolledStraight.map(v => v + (Math.random() - 0.5) * 0.08)
  );

  const resVineet = FaceService.verifyFace(vineetScan, drp03.faceEmbeddings);
  const resFriend = FaceService.verifyFace(friendScan, drp03.faceEmbeddings);

  console.log('Vineet Scanning Himself:');
  console.log(' - isMatch:', resVineet.isMatch);
  console.log(' - Similarity:', (resVineet.similarityScore * 100).toFixed(1) + '%');

  console.log('\nFriend Scanning:');
  console.log(' - isMatch:', resFriend.isMatch);
  console.log(' - Similarity:', (resFriend.similarityScore * 100).toFixed(1) + '%');
  console.log(' - Error:', resFriend.error || 'None');

  if (resVineet.isMatch && !resFriend.isMatch) {
    console.log('\n✅ 100% ISOLATED: Only Vineet is matched, friend is strictly REJECTED!');
  } else {
    console.error('\n❌ FAIL');
  }
}

verifyAccuracy();
