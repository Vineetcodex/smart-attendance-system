import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

const employees = db.getEmployees();
console.log(`Found ${employees.length} employees:`);
employees.forEach(e => console.log(`- ${e.employeeCode} (${e.fullName}, ${e.email})`));

for (let i = 0; i < employees.length; i++) {
  for (let j = i + 1; j < employees.length; j++) {
    const e1 = employees[i];
    const e2 = employees[j];
    
    const v1 = e1.faceEmbedding || (e1.faceEmbeddings ? e1.faceEmbeddings[0] : null);
    const v2 = e2.faceEmbedding || (e2.faceEmbeddings ? e2.faceEmbeddings[0] : null);

    if (v1 && v2) {
      let sumSq = 0;
      for (let k = 0; k < Math.min(v1.length, v2.length); k++) {
        const d = v1[k] - v2[k];
        sumSq += d * d;
      }
      const dist = Math.sqrt(sumSq);
      const res = FaceService.calculateFaceDistance(v1, v2);
      console.log(`\nComparison between ${e1.employeeCode} and ${e2.employeeCode}:`);
      console.log(`  Euclidean Distance = ${dist.toFixed(4)}`);
      console.log(`  FaceService score = ${(res.similarity * 100).toFixed(1)}% (isMatch: ${res.isMatch})`);
    }
  }
}
