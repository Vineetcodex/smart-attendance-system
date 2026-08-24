import fs from 'fs';
import path from 'path';
import { supabaseDb } from '../db/supabaseDb.js';
import { config } from '../config/env.js';

async function seedSupabase() {
  console.log('================================================================');
  console.log('🚀 MIGRATING LOCAL DATA TO SUPABASE CLOUD DATABASE');
  console.log('================================================================\n');

  const isConnected = await supabaseDb.checkConnection();
  if (!isConnected) {
    console.error('❌ Could not connect to Supabase tables.');
    console.log('👉 Please make sure you have run the SQL script in your Supabase SQL Editor first.');
    return;
  }

  const dbPath = path.join(config.dataDir, 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.log('No local database.json found to migrate.');
    return;
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  const data = JSON.parse(raw);

  // 1. Migrate Organizations
  if (Array.isArray(data.organizations)) {
    for (const org of data.organizations) {
      console.log(`Syncing organization: ${org.name} (${org.code})...`);
      await supabaseDb.upsertOrganization(org);
    }
  }

  // 2. Migrate Employees
  if (Array.isArray(data.employees)) {
    for (const emp of data.employees) {
      console.log(`Syncing employee: ${emp.fullName} (${emp.employeeCode})...`);
      await supabaseDb.upsertEmployee(emp);
    }
  }

  // 3. Migrate Attendance Logs
  if (Array.isArray(data.attendance_logs)) {
    for (const log of data.attendance_logs) {
      console.log(`Syncing attendance log: ${log.employeeName} - ${log.punchType || 'CHECK_IN'} (${log.status})...`);
      await supabaseDb.createAttendanceLog(log);
    }
  }

  // 4. Migrate Admin Users
  if (Array.isArray(data.admin_users)) {
    for (const admin of data.admin_users) {
      console.log(`Syncing admin user: ${admin.email}...`);
      await supabaseDb.upsertAdmin(admin);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL DATA SUCCESSFULLY SYNCED TO SUPABASE CLOUD DATABASE!');
  console.log('================================================================\n');
}

seedSupabase();
