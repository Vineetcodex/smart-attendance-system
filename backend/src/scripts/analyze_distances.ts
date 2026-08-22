import { db } from '../db/database.js';

function analyzeDistances() {
  const drp03 = db.getEmployeeByCode('DRP03');
  if (!drp03 || !drp03.faceEmbeddings) return;

  const logs = db.getAttendanceLogs({ employeeId: drp03.id });
  console.log('=== DISTANCE ANALYSIS FOR DRP03 ===');
  
  // Enrolled Poses:
  const enrolledPoses = drp03.faceEmbeddings;

  // Let's compute distance of each log's faceEmbedding if we extract it or check formula:
  logs.forEach((l, idx) => {
    // In our formula: score = 1 - distance / 0.75
    // so distance = (1 - score) * 0.75
    const impliedDist = (1 - l.faceSimilarityScore) * 0.75;
    console.log(`Log ${idx} (${l.timestamp}): Score = ${(l.faceSimilarityScore * 100).toFixed(1)}%, Implied Distance = ${impliedDist.toFixed(4)}`);
  });
}

analyzeDistances();
