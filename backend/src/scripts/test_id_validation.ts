import { validateAndNormalizeEmployeeCode } from '../utils/codeValidator.js';

console.log('================================================================');
console.log('🧪 TESTING DRP01 TO DRP10 REGISTRATION ID VALIDATION & NORMALIZATION');
console.log('================================================================\n');

const testCases: { input: string; shouldPass: boolean; expectedNormalized?: string }[] = [
  // Valid cases (DRP01 to DRP10 in various formats with or without spaces/hyphens/casing)
  { input: 'DRP01', shouldPass: true, expectedNormalized: 'DRP01' },
  { input: 'DRP 01', shouldPass: true, expectedNormalized: 'DRP01' },
  { input: 'drp02', shouldPass: true, expectedNormalized: 'DRP02' },
  { input: 'drp 02', shouldPass: true, expectedNormalized: 'DRP02' },
  { input: 'DRP3', shouldPass: true, expectedNormalized: 'DRP03' },
  { input: 'drp 3', shouldPass: true, expectedNormalized: 'DRP03' },
  { input: 'DRP 04', shouldPass: true, expectedNormalized: 'DRP04' },
  { input: 'DRP05', shouldPass: true, expectedNormalized: 'DRP05' },
  { input: 'drp 06', shouldPass: true, expectedNormalized: 'DRP06' },
  { input: 'DRP-07', shouldPass: true, expectedNormalized: 'DRP07' },
  { input: 'drp 07', shouldPass: true, expectedNormalized: 'DRP07' },
  { input: 'DRP08', shouldPass: true, expectedNormalized: 'DRP08' },
  { input: 'drp 09', shouldPass: true, expectedNormalized: 'DRP09' },
  { input: 'DRP10', shouldPass: true, expectedNormalized: 'DRP10' },
  { input: 'DRP 10', shouldPass: true, expectedNormalized: 'DRP10' },
  { input: 'drp 10', shouldPass: true, expectedNormalized: 'DRP10' },
  { input: 'drp-10', shouldPass: true, expectedNormalized: 'DRP10' },

  // Invalid cases (outside DRP01..DRP10 range, wrong prefix, etc.)
  { input: 'DRP00', shouldPass: false },
  { input: 'DRP11', shouldPass: false },
  { input: 'DRP 12', shouldPass: false },
  { input: 'DRP 99', shouldPass: false },
  { input: 'EMP01', shouldPass: false },
  { input: 'EMP-1001', shouldPass: false },
  { input: '', shouldPass: false },
  { input: '   ', shouldPass: false },
  { input: 'ABC123', shouldPass: false },
];

let allPassed = true;

for (const tc of testCases) {
  const result = validateAndNormalizeEmployeeCode(tc.input);

  if (tc.shouldPass) {
    if (!result.isValid || result.normalizedCode !== tc.expectedNormalized) {
      console.error(`❌ FAILED for valid input "${tc.input}": Got valid=${result.isValid}, normalized="${result.normalizedCode}", expected="${tc.expectedNormalized}"`);
      allPassed = false;
    } else {
      console.log(`✅ PASS: Input "${tc.input}" -> Normalized: "${result.normalizedCode}"`);
    }
  } else {
    if (result.isValid) {
      console.error(`❌ FAILED for invalid input "${tc.input}": Expected rejection but got valid=true, normalized="${result.normalizedCode}"`);
      allPassed = false;
    } else {
      console.log(`✅ PASS (Properly Rejected): Input "${tc.input}" -> Error: ${result.error}`);
    }
  }
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 ALL ID VALIDATION TESTS PASSED PERFECTLY!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
console.log('================================================================\n');
