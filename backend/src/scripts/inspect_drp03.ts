import { db } from '../db/database.js';

function inspectEmbeddings() {
  const drp03 = db.getEmployeeByCode('DRP03');
  if (!drp03) {
    console.log('DRP03 not found');
    return;
  }

  console.log('Employee DRP03:');
  console.log('Primary Embedding length:', drp03.faceEmbedding?.length);
  console.log('Multi-pose count:', drp03.faceEmbeddings?.length);
  if (drp03.faceEmbeddings) {
    drp03.faceEmbeddings.forEach((emb, i) => {
      console.log(`Pose ${i} length:`, emb.length);
    });
  }

  // Compare Pose 0 vs Pose 1 vs Pose 2 of DRP03 itself:
  if (drp03.faceEmbeddings && drp03.faceEmbeddings.length >= 2) {
    const p0 = drp03.faceEmbeddings[0];
    const p1 = drp03.faceEmbeddings[1];
    let sumSq = 0;
    for (let i = 0; i < p0.length; i++) {
      const diff = p0[i] - p1[i];
      sumSq += diff * diff;
    }
    console.log('Distance between Pose 0 (Straight) and Pose 1 (Left) of DRP03:', Math.sqrt(sumSq).toFixed(4));
  }

  // Check logs
  const logs = db.getAttendanceLogs({ employeeId: drp03.id });
  console.log('Total attendance logs for DRP03:', logs.length);
  logs.forEach((l, idx) => {
    console.log(`Log ${idx}: score = ${l.faceSimilarityScore}, status = ${l.status}, time = ${l.timestamp}`);
  });
}

inspectEmbeddings();
