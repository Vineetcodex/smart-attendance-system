import { db } from '../db/database.js';
import { AuthController } from '../controllers/authController.js';
import bcrypt from 'bcryptjs';

async function runPasswordResetTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING EMPLOYEE PASSWORD RESET & CHANGE TESTS');
  console.log('================================================================\n');

  // 1. Ensure test employee exists (e.g. DRP01 / John Doe)
  let emp = db.getEmployeeByCode('DRP01');
  if (!emp) {
    console.log('Creating baseline test employee DRP01...');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('password123', salt);
    emp = {
      id: 'emp_test_drp01',
      orgId: 'org_default_hq_1',
      employeeCode: 'DRP01',
      fullName: 'John Doe',
      email: 'john.doe@drptech.com',
      department: 'Engineering',
      position: 'Senior Engineer',
      passwordHash: passHash,
      faceEmbedding: [],
      isActive: true,
      isApproved: true,
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.createEmployee(emp);
  }

  // 2. Test Step 1: Request Password Reset OTP
  console.log('TEST 1: Requesting Password Reset OTP for DRP01...');
  let mockResJson: any = null;
  let mockStatusCode = 200;

  const mockRes = {
    status: (code: number) => {
      mockStatusCode = code;
      return {
        json: (data: any) => {
          mockResJson = data;
          return data;
        },
      };
    },
    json: (data: any) => {
      mockResJson = data;
      return data;
    },
  } as any;

  await AuthController.forgotPassword(
    { body: { identifier: 'DRP01' } } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success) {
    throw new Error(`Test 1 Failed: ${JSON.stringify(mockResJson)}`);
  }
  console.log(`✅ Test 1 Passed: OTP request succeeded. Masked email: ${mockResJson.data.emailMasked}`);

  // Retrieve stored OTP from database
  const updatedEmp = db.getEmployeeByCode('DRP01');
  if (!updatedEmp?.resetOtp || !updatedEmp?.resetOtpExpiresAt) {
    throw new Error('Test 1 Failed: OTP was not persisted on employee record.');
  }
  const generatedOtp = updatedEmp.resetOtp;
  console.log(`   Generated OTP: ${generatedOtp} (Expires at: ${updatedEmp.resetOtpExpiresAt})\n`);

  // 3. Test Step 2A: Reject Invalid OTP
  console.log('TEST 2: Attempting verification with incorrect OTP ("999999")...');
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.verifyResetOtp(
    { body: { identifier: 'DRP01', otp: '999999' } } as any,
    mockRes
  );

  if (mockStatusCode !== 400 || mockResJson?.success === true) {
    throw new Error('Test 2 Failed: Server accepted incorrect OTP.');
  }
  console.log(`✅ Test 2 Passed: Incorrect OTP correctly rejected with message: "${mockResJson.message}"\n`);

  // 4. Test Step 2B: Accept Valid OTP
  console.log(`TEST 3: Verifying with correct OTP ("${generatedOtp}")...`);
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.verifyResetOtp(
    { body: { identifier: 'DRP01', otp: generatedOtp } } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success) {
    throw new Error(`Test 3 Failed: Server rejected valid OTP: ${JSON.stringify(mockResJson)}`);
  }
  console.log(`✅ Test 3 Passed: Correct OTP accepted.\n`);

  // 5. Test Step 3: Complete Password Reset with New Password
  const newTestPassword = 'NewSecurePass2026!';
  console.log(`TEST 4: Resetting password to "${newTestPassword}" with valid OTP...`);
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.resetPassword(
    { body: { identifier: 'DRP01', otp: generatedOtp, newPassword: newTestPassword } } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success) {
    throw new Error(`Test 4 Failed: Reset password failed: ${JSON.stringify(mockResJson)}`);
  }
  console.log(`✅ Test 4 Passed: Password reset succeeded.\n`);

  // 6. Test Step 4: Login with New Password
  console.log('TEST 5: Logging in with new password...');
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.employeeLogin(
    { body: { identifier: 'DRP01', password: newTestPassword } } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success || !mockResJson?.data?.token) {
    throw new Error(`Test 5 Failed: Login with new password failed: ${JSON.stringify(mockResJson)}`);
  }
  const employeeJwtToken = mockResJson.data.token;
  console.log(`✅ Test 5 Passed: Login with new password succeeded! JWT token issued.\n`);

  // 7. Test Step 5: Verify Old Password is now rejected
  console.log('TEST 6: Verifying old password ("password123") is rejected...');
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.employeeLogin(
    { body: { identifier: 'DRP01', password: 'password123' } } as any,
    mockRes
  );

  if (mockStatusCode !== 401 || mockResJson?.success === true) {
    throw new Error('Test 6 Failed: Old password was unexpectedly accepted!');
  }
  console.log('✅ Test 6 Passed: Old password correctly rejected with 401 Unauthorized.\n');

  // 8. Test Step 6: Authenticated In-Portal Password Change
  const inPortalChangedPass = 'InPortalPass2026@!';
  console.log(`TEST 7: Changing password in-portal from "${newTestPassword}" to "${inPortalChangedPass}"...`);
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.changePassword(
    {
      user: { id: updatedEmp.id, email: updatedEmp.email, role: 'EMPLOYEE' },
      body: { currentPassword: newTestPassword, newPassword: inPortalChangedPass },
    } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success) {
    throw new Error(`Test 7 Failed: In-portal change password failed: ${JSON.stringify(mockResJson)}`);
  }
  console.log(`✅ Test 7 Passed: In-portal password changed successfully!\n`);

  // 9. Test Step 7: Login with in-portal changed password
  console.log(`TEST 8: Logging in with final changed password ("${inPortalChangedPass}")...`);
  mockStatusCode = 200;
  mockResJson = null;

  await AuthController.employeeLogin(
    { body: { identifier: 'DRP01', password: inPortalChangedPass } } as any,
    mockRes
  );

  if (mockStatusCode !== 200 || !mockResJson?.success) {
    throw new Error(`Test 8 Failed: Final login failed: ${JSON.stringify(mockResJson)}`);
  }
  console.log('✅ Test 8 Passed: Final login succeeded!\n');

  console.log('================================================================');
  console.log('🎉 ALL 8 PASSWORD RESET & CHANGE TESTS PASSED FLAWLESSLY!');
  console.log('================================================================');
}

runPasswordResetTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
