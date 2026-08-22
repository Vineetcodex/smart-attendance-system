// Let's test why two different descriptors were getting artificially high similarity
function oldProject(desc128: number[]): number[] {
  const embedding = new Array<number>(512);
  for (let i = 0; i < 128; i++) embedding[i] = desc128[i];
  for (let i = 0; i < 128; i++) {
    const d = desc128[i];
    embedding[128 + i] = Math.sin(d * Math.PI * 2);
    embedding[256 + i] = Math.cos(d * Math.PI * 2);
  }
  // Generic face geometry for dimensions 384..511
  for (let i = 384; i < 512; i++) {
    embedding[i] = 0.5; // common face shape
  }
  let sumSq = 0;
  for (let i = 0; i < 512; i++) sumSq += embedding[i] * embedding[i];
  const norm = Math.sqrt(sumSq) || 1;
  return embedding.map(v => v / norm);
}

function cosineSim(v1: number[], v2: number[]): number {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

// Generate two COMPLETELY DIFFERENT face descriptors (Random unit vectors in 128D)
const personA = Array.from({length: 128}, () => (Math.random() - 0.5));
const personB = Array.from({length: 128}, () => (Math.random() - 0.5));

const raw128Sim = cosineSim(personA, personB);
console.log('Raw 128D Cosine Similarity between 2 different people:', raw128Sim.toFixed(4));

const old512A = oldProject(personA);
const old512B = oldProject(personB);
const old512Sim = cosineSim(old512A, old512B);
console.log('Old Projected 512D Cosine Similarity between 2 different people:', old512Sim.toFixed(4));
