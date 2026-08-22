import { db } from '../db/database.js';

const codesToRemove = ['07', '1', 'DRP05'];
const employees = db.getEmployees();

console.log('Current employees in database:');
employees.forEach(e => console.log(`- ${e.employeeCode} (${e.fullName}, ${e.email})`));

for (const code of codesToRemove) {
  const emp = db.getEmployeeByCode(code);
  if (emp) {
    db.deleteEmployee(emp.id);
    console.log(`Deleted duplicate test employee: ${code} (${emp.fullName})`);
  }
}

console.log('\nRemaining employees:');
db.getEmployees().forEach(e => console.log(`- ${e.employeeCode} (${e.fullName}, ${e.email})`));
