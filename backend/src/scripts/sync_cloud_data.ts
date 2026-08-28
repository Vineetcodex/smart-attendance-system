import { db } from '../db/database.js';
import { supabaseDb } from '../db/supabaseDb.js';

async function main() {
  console.log('🚀 Starting Cloud Database Sync & Reconciliation...');

  const isConnected = await supabaseDb.checkConnection();
  if (!isConnected) {
    console.error('❌ Could not connect to Supabase. Please check SUPABASE_URL and SUPABASE_SECRET_KEY.');
    process.exit(1);
  }

  console.log('✅ Supabase connected successfully!');

  // 1. Remove legacy demo employees (EMP-1001 to EMP-1005) from Supabase if real employees exist
  const client = supabaseDb.getClient();
  if (client) {
    console.log('🧹 Cleaning up legacy demo employee placeholders (EMP-1001 to EMP-1005) from Supabase...');
    const demoCodes = ['EMP-1001', 'EMP-1002', 'EMP-1003', 'EMP-1004', 'EMP-1005'];
    for (const code of demoCodes) {
      await client.from('employees').delete().ilike('employee_code', code);
    }
  }

  // 2. Perform full bidirectional sync
  await db.syncWithCloud();

  const emps = db.getEmployees();
  const logs = db.getAttendanceLogs();

  console.log('=======================================================');
  console.log(`🎉 Sync Complete! Current Active Database State:`);
  console.log(`👤 Employees (${emps.length}):`);
  for (const emp of emps) {
    console.log(`   - [${emp.employeeCode}] ${emp.fullName} (${emp.email}) - Status: ${emp.approvalStatus || 'APPROVED'}`);
  }
  console.log(`📊 Attendance Logs Total: ${logs.length}`);
  console.log('=======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
