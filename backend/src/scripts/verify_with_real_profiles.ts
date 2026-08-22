import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

function verifyWithRealProfiles() {
  const drp03 = db.getEmployeeByCode('DRP03');
  const emp1001 = db.getEmployeeByCode('EMP-1001');
  const emp1002 = db.getEmployeeByCode('EMP-1002');

  if (!drp03 || !emp1001 || !emp1002) return;

  const vineetEnrolled = drp03.faceEmbeddings!;
  
  // 1. Vineet camera scan (same person, distance ~0.15)
  const vineetScan = FaceService.normalizeVector(
    vineetEnrolled[0].map(v => v + (Math.random() - 0.5) * 0.02)
  );

  // 2. Alex Rivera's face scanning while logged in as Vineet
  const alexScan = emp1001.faceEmbedding!;

  // 3. Elena Rostova's face scanning while logged in as Vineet
  const elenaScan = emp1002.faceEmbedding!;

  // 4. Random stranger face
  const strangerScan = FaceService.normalizeVector(
    Array.from({ length: 128 }, () => Math.random() - 0.5)
  );

  const resVineet = FaceService.verifyFace(vineetScan, vineetEnrolled);
  const resAlex = FaceService.verifyFace(alexScan, vineetEnrolled);
  const resElena = FaceService.verifyFace(elenaScan, vineetEnrolled);
  const resStranger = FaceService.verifyFace(strangerScan, vineetEnrolled);

  console.log('1. Vineet Scanning Himself:', {
    isMatch: resVineet.isMatch,
    score: (resVineet.similarityScore * 100).toFixed(1) + '%',
  });

  console.log('2. Alex Rivera (Impostor/Friend) Scanning:', {
    isMatch: resAlex.isMatch,
    score: (resAlex.similarityScore * 100).toFixed(1) + '%',
    error: resAlex.error,
  });

  console.log('3. Elena Rostova (Impostor/Friend) Scanning:', {
    isMatch: resElena.isMatch,
    score: (resElena.similarityScore * 100).toFixed(1) + '%',
    error: resElena.error,
  });

  console.log('4. Random Stranger Scanning:', {
    isMatch: resStranger.isMatch,
    score: (resStranger.similarityScore * 100).toFixed(1) + '%',
    error: resStranger.error,
  });
}

verifyWithRealProfiles();
