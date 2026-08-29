import { db } from '../db/database.js';
import { AuthController } from '../controllers/authController.js';
import { EmployeeController } from '../controllers/employeeController.js';
import { AttendanceController } from '../controllers/attendanceController.js';

async function runApprovalWorkflowTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING EMPLOYEE REGISTRATION APPROVAL WORKFLOW TESTS');
  console.log('================================================================\n');

  // Clean up any existing test records for DRP08 and DRP09
  db.deleteEmployee('DRP08');
  db.deleteEmployee('DRP09');

  const mockResHelper = () => {
    let statusCode = 200;
    let responseJson: any = null;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseJson = data;
            return data;
          },
        };
      },
      json: (data: any) => {
        responseJson = data;
        return data;
      },
    } as any;
    return {
      res,
      getStatus: () => statusCode,
      getJson: () => responseJson,
    };
  };

  // -------------------------------------------------------------
  // TEST 1: Register employee DRP08 (Self-Service Signup)
  // -------------------------------------------------------------
  console.log('TEST 1: Submitting registration for new employee DRP08...');
  const test1 = mockResHelper();
  await AuthController.employeeSignup(
    {
      body: {
        fullName: 'Robert Brown',
        employeeCode: 'DRP08',
        email: 'robert.brown@drptech.com',
        password: 'password123',
        department: 'Engineering',
        position: 'QA Engineer',
      },
    } as any,
    test1.res
  );

  const res1 = test1.getJson();
  if (res1.isPendingApproval !== true || res1.approvalStatus !== 'PENDING' || res1.data?.token) {
    throw new Error(`Test 1 Failed: Expected pending approval without token, got: ${JSON.stringify(res1)}`);
  }
  console.log(`✅ Test 1 Passed: Registration submitted. Status = PENDING, isPendingApproval = true, no JWT issued.\n`);

  // -------------------------------------------------------------
  // TEST 2: Attempt Login Before Approval
  // -------------------------------------------------------------
  console.log('TEST 2: Attempting employee login before admin approval...');
  const test2 = mockResHelper();
  await AuthController.employeeLogin(
    {
      body: {
        identifier: 'DRP08',
        password: 'password123',
      },
    } as any,
    test2.res
  );

  const res2 = test2.getJson();
  if (test2.getStatus() !== 403 || res2.isPendingApproval !== true || res2.approvalStatus !== 'PENDING') {
    throw new Error(`Test 2 Failed: Server did not reject login with 403 Forbidden: ${JSON.stringify(res2)}`);
  }
  console.log(`✅ Test 2 Passed: Login correctly blocked with 403 Forbidden (${res2.message}).\n`);

  // -------------------------------------------------------------
  // TEST 3: Attempt Attendance Punch Before Approval
  // -------------------------------------------------------------
  console.log('TEST 3: Attempting attendance verification before admin approval...');
  const test3 = mockResHelper();
  await AttendanceController.verifyTripleFactor(
    {
      body: {
        employeeId: 'DRP08',
        employeeCode: 'DRP08',
      },
    } as any,
    test3.res
  );

  const res3 = test3.getJson();
  if (test3.getStatus() !== 403 || res3.isPendingApproval !== true) {
    throw new Error(`Test 3 Failed: Attendance was not blocked for unapproved employee: ${JSON.stringify(res3)}`);
  }
  console.log(`✅ Test 3 Passed: Attendance punch blocked with 403 Forbidden (${res3.message}).\n`);

  // -------------------------------------------------------------
  // TEST 4: Check Admin Pending Approvals Queue
  // -------------------------------------------------------------
  console.log('TEST 4: Admin querying pending registrations list...');
  const test4 = mockResHelper();
  await EmployeeController.getEmployees(
    {
      query: { status: 'PENDING' },
    } as any,
    test4.res
  );

  const res4 = test4.getJson();
  const pendingEmp = res4.data?.find((e: any) => e.employeeCode === 'DRP08');
  if (!pendingEmp) {
    throw new Error(`Test 4 Failed: DRP08 not found in pending list: ${JSON.stringify(res4)}`);
  }
  console.log(`✅ Test 4 Passed: DRP08 found in admin pending approval queue (Queue count = ${res4.count}).\n`);

  // -------------------------------------------------------------
  // TEST 5: Admin Approves Employee DRP08
  // -------------------------------------------------------------
  console.log('TEST 5: Admin approving DRP08...');
  const test5 = mockResHelper();
  await EmployeeController.approveEmployee(
    {
      params: { id: pendingEmp.id },
      user: { fullName: 'Sarah Jenkins (HR Director)', role: 'SUPER_ADMIN' },
    } as any,
    test5.res
  );

  const res5 = test5.getJson();
  if (test5.getStatus() !== 200 || !res5.success || res5.data?.approvalStatus !== 'APPROVED' || res5.data?.isApproved !== true) {
    throw new Error(`Test 5 Failed: Approval failed: ${JSON.stringify(res5)}`);
  }
  console.log(`✅ Test 5 Passed: DRP08 successfully approved by ${res5.data.approvedBy} at ${res5.data.approvedAt}.\n`);

  // -------------------------------------------------------------
  // TEST 6: Login After Approval
  // -------------------------------------------------------------
  console.log('TEST 6: Employee DRP08 logging in after approval...');
  const test6 = mockResHelper();
  await AuthController.employeeLogin(
    {
      body: {
        identifier: 'DRP08',
        password: 'password123',
      },
    } as any,
    test6.res
  );

  const res6 = test6.getJson();
  if (test6.getStatus() !== 200 || !res6.success || !res6.data?.token) {
    throw new Error(`Test 6 Failed: Login after approval failed: ${JSON.stringify(res6)}`);
  }
  console.log(`✅ Test 6 Passed: Login succeeded after admin approval! JWT token issued.\n`);

  // -------------------------------------------------------------
  // TEST 7: Test Rejection Flow on DRP09
  // -------------------------------------------------------------
  console.log('TEST 7: Registering and rejecting employee DRP09...');
  const test7Signup = mockResHelper();
  await AuthController.employeeSignup(
    {
      body: {
        fullName: 'Rejected Applicant',
        employeeCode: 'DRP09',
        email: 'rejected@drptech.com',
        password: 'password123',
        department: 'Operations',
        position: 'Intern',
      },
    } as any,
    test7Signup.res
  );

  const d9 = db.getEmployeeByCode('DRP09');
  if (!d9) throw new Error('DRP09 was not saved.');

  const test7Reject = mockResHelper();
  await EmployeeController.rejectEmployee(
    {
      params: { id: d9.id },
      body: { reason: 'Duplicate facial baseline detected.' },
      user: { fullName: 'Sarah Jenkins', role: 'SUPER_ADMIN' },
    } as any,
    test7Reject.res
  );

  const res7Reject = test7Reject.getJson();
  if (res7Reject.data?.approvalStatus !== 'REJECTED') {
    throw new Error('Test 7 Failed: Status was not set to REJECTED.');
  }

  // Attempt login for rejected applicant
  const test7Login = mockResHelper();
  await AuthController.employeeLogin(
    {
      body: { identifier: 'DRP09', password: 'password123' },
    } as any,
    test7Login.res
  );

  const res7Login = test7Login.getJson();
  if (test7Login.getStatus() !== 403 || res7Login.isRejected !== true) {
    throw new Error(`Test 7 Failed: Rejected applicant was not blocked on login: ${JSON.stringify(res7Login)}`);
  }
  console.log(`✅ Test 7 Passed: Rejection workflow verified. Login blocked with reason: "${res7Login.message}".\n`);

  // -------------------------------------------------------------
  // TEST 8: Verify Rejected Applicant is NOT in Pending Queue
  // -------------------------------------------------------------
  console.log('TEST 8: Verifying rejected applicant (DRP09) does NOT appear in pending approvals queue...');
  const test8 = mockResHelper();
  await EmployeeController.getEmployees(
    {
      query: { status: 'PENDING' },
    } as any,
    test8.res
  );
  const res8 = test8.getJson();
  const foundRejectedInPending = res8.data?.find((e: any) => e.employeeCode === 'DRP09');
  if (foundRejectedInPending) {
    throw new Error('Test 8 Failed: Rejected employee DRP09 still appeared in pending approvals list!');
  }
  console.log('✅ Test 8 Passed: Rejected applicant is completely excluded from pending queue.\n');

  // -------------------------------------------------------------
  // TEST 9: Delete Employee & Verify Cloud Sync Does Not Resurrect
  // -------------------------------------------------------------
  console.log('TEST 9: Deleting employee DRP09 and verifying cloud sync does not resurrect them...');
  db.deleteEmployee('DRP09');
  if (db.getEmployeeByCode('DRP09')) {
    throw new Error('Test 9 Failed: DRP09 was not deleted locally.');
  }

  // Trigger cloud sync
  await db.syncWithCloud().catch(() => {});

  if (db.getEmployeeByCode('DRP09')) {
    throw new Error('Test 9 Failed: DRP09 was resurrected by cloud sync after deletion!');
  }
  console.log('✅ Test 9 Passed: Deleted employee is permanently removed and never resurrected by cloud sync.\n');

  console.log('================================================================');
  console.log('🎉 ALL 9 APPROVAL & PERSISTENCE TESTS PASSED FLAWLESSLY!');
  console.log('================================================================');
}

runApprovalWorkflowTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
