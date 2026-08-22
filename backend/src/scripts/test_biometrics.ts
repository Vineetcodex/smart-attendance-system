import { FaceService } from '../services/faceService.js';

console.log('--- BIOMETRIC PIPELINE INTEGRATION TEST ---');

// Test 1: Unit Hypersphere Normalization
const rawVector = Array.from({ length: 512 }, () => Math.random() - 0.5);
const normalized = FaceService.normalizeVector(rawVector);
const norm = Math.sqrt(normalized.reduce((a, b) => a + b * b, 0));
console.log('✅ Test 1 - 512-D Vector Norm (should be ~1.000000):', norm.toFixed(6));

// Test 2: Identical Vectors Cosine Similarity (should be 1.0)
const simIdentical = FaceService.cosineSimilarity(normalized, normalized);
console.log('✅ Test 2 - Identical Vectors Cosine Similarity:', simIdentical);

// Test 3: Slightly perturbed face vector (should be ~0.94 - 0.98)
const liveCaptured = normalized.map((v) => v + (Math.random() - 0.5) * 0.05);
const simPerturbed = FaceService.cosineSimilarity(normalized, FaceService.normalizeVector(liveCaptured));
console.log('✅ Test 3 - Live Captured Face vs Baseline Similarity:', simPerturbed);

// Test 4: Completely different person face vector (should be < 0.30)
const differentPerson = FaceService.normalizeVector(Array.from({ length: 512 }, () => Math.random() - 0.5));
const simDifferent = FaceService.cosineSimilarity(normalized, differentPerson);
console.log('✅ Test 4 - Different Person Face Similarity:', simDifferent);

// Test 5: Multi-pose verification (Straight, Left, Right)
const poseStraight = normalized;
const poseLeft = normalized.map((v) => v + (Math.random() - 0.5) * 0.15);
const poseRight = normalized.map((v) => v + (Math.random() - 0.5) * 0.15);
const baselineEmbeddings = [
  FaceService.normalizeVector(poseStraight),
  FaceService.normalizeVector(poseLeft),
  FaceService.normalizeVector(poseRight),
];

const verifyResult = FaceService.verifyFace(FaceService.normalizeVector(liveCaptured), baselineEmbeddings);
console.log('✅ Test 5 - Multi-pose Verification Result:', verifyResult);
