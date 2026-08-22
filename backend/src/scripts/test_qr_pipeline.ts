import { db } from '../db/database.js';
import { QrService } from '../services/qrService.js';

function testQrPipeline() {
  const org = db.getPrimaryOrganization();
  if (!org) return;

  console.log('Testing QR Pipeline for Org:', org.name, `(${org.id})`);

  // 1. Admin generated Master QR Payload:
  const masterPayload = org.masterQrPayload;
  console.log('\n1. Admin Master QR Payload:');
  console.log(masterPayload);

  // 2. Test Verification on legitimate Admin QR:
  const resValid = QrService.verifyMasterPayload(masterPayload, org.id);
  console.log('\n2. Decryption & Signature Check on Admin Master QR:', resValid);

  // 3. Test Verification on Fake / Random QR code:
  const resFake = QrService.verifyMasterPayload('https://random-url.com/scan', org.id);
  console.log('\n3. Fake QR Scan Attempt:', resFake);

  // 4. Test Verification on QR from another company/org:
  const anotherOrgPayload = QrService.generateMasterPayload('org_another_inc', 20.27, 85.86, 50).payloadString;
  const resOtherOrg = QrService.verifyMasterPayload(anotherOrgPayload, org.id);
  console.log('\n4. Another Org QR Scan Attempt:', resOtherOrg);

  if (resValid.isValid && !resFake.isValid && !resOtherOrg.isValid) {
    console.log('\n✅ 100% SUCCESS: Only Admin-generated Office Master QR is accepted!');
  } else {
    console.error('\n❌ FAILED');
  }
}

testQrPipeline();
