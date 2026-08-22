import { db } from '../db/database.js';
import { FaceService } from '../services/faceService.js';

function migrateDatabaseEmbeddings() {
  const employees = db.getEmployees();
  let updatedCount = 0;

  for (const emp of employees) {
    let changed = false;

    if (emp.faceEmbedding && emp.faceEmbedding.length > 128) {
      emp.faceEmbedding = FaceService.normalizeVector(emp.faceEmbedding.slice(0, 128));
      changed = true;
    }

    if (emp.faceEmbeddings && emp.faceEmbeddings.length > 0) {
      emp.faceEmbeddings = emp.faceEmbeddings.map((emb) => {
        if (emb.length > 128) {
          changed = true;
          return FaceService.normalizeVector(emb.slice(0, 128));
        }
        return FaceService.normalizeVector(emb);
      });
    }

    if (changed) {
      db.updateEmployee(emp.id, {
        faceEmbedding: emp.faceEmbedding,
        faceEmbeddings: emp.faceEmbeddings,
      });
      updatedCount++;
    }
  }

  console.log(`Migrated ${updatedCount} employees to 128-D normalized embeddings.`);
}

migrateDatabaseEmbeddings();
