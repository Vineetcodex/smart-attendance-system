// Standard FaceNet/ArcFace distance calibration
function euclideanDistance(v1: number[], v2: number[]) {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Same person test (small natural variation)
const vSame1 = Array.from({length: 128}, () => (Math.random() - 0.5));
// Normalize
const norm1 = Math.sqrt(vSame1.reduce((a, b) => a + b * b, 0));
const faceA = vSame1.map(v => v / norm1);

// Same person with camera noise (distance ~ 0.30)
const faceASame = faceA.map(v => v + (Math.random() - 0.5) * 0.05);
const normSame = Math.sqrt(faceASame.reduce((a, b) => a + b * b, 0));
const faceASameNorm = faceASame.map(v => v / normSame);

// Different person (friend)
const vDiff = Array.from({length: 128}, () => (Math.random() - 0.5));
const normDiff = Math.sqrt(vDiff.reduce((a, b) => a + b * b, 0));
const faceFriend = vDiff.map(v => v / normDiff);

console.log('SAME Person Euclidean Dist:', euclideanDistance(faceA, faceASameNorm).toFixed(4));
console.log('DIFFERENT Person Euclidean Dist:', euclideanDistance(faceA, faceFriend).toFixed(4));
