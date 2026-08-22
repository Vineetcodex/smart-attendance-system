async function test() {
  // 1. Login as employee
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/employee-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'EMP-1001', password: 'password123' }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;
  const empId = loginData.data?.employee?.id;
  console.log('Employee Login Token obtained:', !!token, 'Emp ID:', empId);

  // 2. Fetch attendance logs with employee token
  const logsRes = await fetch(`http://localhost:5000/api/v1/attendance/logs?employeeId=${empId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const logsData: any = await logsRes.json();
  console.log('Attendance Logs Fetched Successfully:', logsData.success, 'Count:', logsData.count);
}

test().catch(console.error);
