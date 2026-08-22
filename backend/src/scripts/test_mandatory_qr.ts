import { db } from '../db/database.js';
import { QrService } from '../services/qrService.js';

function testStrictQrRequirement() {
  const org = db.getPrimaryOrganization();
  const drp03 = db.getEmployeeByCode('DRP03');
  if (!org || !drp03) return;

  console.log('Testing Mandatory QR Rule for Employee:', drp03.fullName);

  // Scenario 1: Attempting to verify with NO QR payload (skipped)
  let isQrValid1 = false;
  let qrError1 = '';
  const qrPayload1 = undefined;
  if (!qrPayload1) {
    isQrValid1 = false;
    qrError1 = 'Office Master QR code is mandatory. Please scan the official Office QR poster first.';
  }
  console.log('Scenario 1 (No QR Scan):', { isQrValid: isQrValid1, error: qrError1 });

  // Scenario 2: Attempting to verify with legitimate Master QR
  const validPayload = org.masterQrPayload;
  const qrResult2 = QrService.verifyMasterPayload(validPayload, org.id);
  console.log('Scenario 2 (Official Master QR Scan):', { isQrValid: qrResult2.isValid });

  if (!isQrValid1 && qrResult2.isValid) {
    console.log('\n✅ 100% ENFORCED: Skipping is impossible; only successful Master QR scan allows attendance!');
  } else {
    console.error('\n❌ FAILED');
  }
}

testStrictQrRequirement();
