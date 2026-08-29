import { db } from '../db/database.js';
import { supabaseDb } from '../db/supabaseDb.js';

async function cleanup() {
  console.log('🧹 Purging bot / test applicants DRP03 (test.drp03@drptech.com) and DRP09 (rejected@drptech.com)...');

  // 1. Delete from local DB and blacklist
  db.deleteEmployee('DRP03');
  db.deleteEmployee('DRP09');
  db.deleteEmployee('8158c3d9-f8be-4f23-b725-755f5d0ec8a6');
  db.deleteEmployee('e444d05e-66d2-4a79-b853-2f0a80fc8297');
  db.deleteEmployee('test.drp03@drptech.com');
  db.deleteEmployee('rejected@drptech.com');

  // Also remove any employee with matching emails directly from memory array
  (db as any).data.employees = (db as any).data.employees.filter((e: any) => {
    const isBot =
      e.employeeCode === 'DRP03' ||
      e.employeeCode === 'DRP09' ||
      e.email === 'test.drp03@drptech.com' ||
      e.email === 'rejected@drptech.com' ||
      e.id === '8158c3d9-f8be-4f23-b725-755f5d0ec8a6' ||
      e.id === 'e444d05e-66d2-4a79-b853-2f0a80fc8297';
    return !isBot;
  });

  (db as any).data.deleted_employee_ids = (db as any).data.deleted_employee_ids || [];
  const toBlacklist = [
    'DRP03',
    'DRP09',
    '8158c3d9-f8be-4f23-b725-755f5d0ec8a6',
    'e444d05e-66d2-4a79-b853-2f0a80fc8297',
    'test.drp03@drptech.com',
    'rejected@drptech.com',
  ];
  for (const item of toBlacklist) {
    if (!(db as any).data.deleted_employee_ids.includes(item)) {
      (db as any).data.deleted_employee_ids.push(item);
    }
  }

  (db as any).save();
  console.log('✅ Local database cleaned and IDs blacklisted in deleted_employee_ids.');

  // 2. Delete from Supabase Cloud
  try {
    await supabaseDb.deleteEmployee('DRP03');
    await supabaseDb.deleteEmployee('DRP09');
    await supabaseDb.deleteEmployee('8158c3d9-f8be-4f23-b725-755f5d0ec8a6');
    await supabaseDb.deleteEmployee('e444d05e-66d2-4a79-b853-2f0a80fc8297');
    console.log('✅ Supabase cloud records deleted.');
  } catch (err) {
    console.warn('Supabase cloud delete warning:', err);
  }

  const remaining = db.getEmployees();
  console.log(`📋 Total active employees remaining: ${remaining.length}`);
  for (const emp of remaining) {
    console.log(` - ${emp.employeeCode}: ${emp.fullName} (${emp.email}) [${emp.approvalStatus}]`);
  }

  const pending = db.getPendingEmployees();
  console.log(`⏳ Total pending employees: ${pending.length}`);
}

cleanup().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
