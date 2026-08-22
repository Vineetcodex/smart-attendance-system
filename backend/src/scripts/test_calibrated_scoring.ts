function calibrateScore(vecA: number[], vecB: number[]) {
  const len = Math.min(vecA.length, vecB.length);
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const diff = vecA[i] - vecB[i];
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);
  const isMatch = distance <= 0.48;
  const score = Math.max(0, Math.min(1, 1 - (distance / 0.75)));
  return { distance, isMatch, score: (score * 100).toFixed(1) + '%' };
}

// 1. Same person (distance ~0.25)
const descA = Array.from({length: 128}, () => (Math.random() - 0.5));
const normA = Math.sqrt(descA.reduce((a, b) => a + b * b, 0));
const faceEnrolled = descA.map(v => v / normA);

const faceSameProbe = faceEnrolled.map(v => v + (Math.random() - 0.5) * 0.04);
const normP = Math.sqrt(faceSameProbe.reduce((a, b) => a + b * b, 0));
const faceProbe = faceSameProbe.map(v => v / normP);

// 2. Friend / stranger (distance ~0.90)
const descFriend = Array.from({length: 128}, () => (Math.random() - 0.5));
const normF = Math.sqrt(descFriend.reduce((a, b) => a + b * b, 0));
const faceFriend = descFriend.map(v => v / normF);

console.log('SAME PERSON Result:', calibrateScore(faceEnrolled, faceProbe));
console.log('FRIEND / STRANGER Result:', calibrateScore(faceEnrolled, faceFriend));
