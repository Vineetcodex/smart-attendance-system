import { db } from '../db/database.js';
import { supabaseDb } from '../db/supabaseDb.js';

async function cleanup() {
  const employees = db.getEmployees();
  for (const emp of employees) {
    if (emp.employeeCode.startsWith('TEST-EMP')) {
      db.deleteEmployee(emp.id);
      await supabaseDb.deleteEmployee(emp.id);
      console.log(`Deleted test employee: ${emp.employeeCode}`);
    }
  }

  await db.syncWithCloud();
  console.log('\nFinal Active Employees:');
  db.getEmployees().forEach(e => console.log(`- [${e.employeeCode}] ${e.fullName} (${e.email}) - Status: ${e.approvalStatus || 'APPROVED'}`));
}

cleanup();

