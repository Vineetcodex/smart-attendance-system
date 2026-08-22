function testThreshold() {
  const samePersonDist1 = 0.2151;
  const samePersonDist2 = 0.2258;
  const friendDist = 0.3659;

  const STRICT_THRESHOLD = 0.28;

  function evaluate(d: number) {
    const isMatch = d <= STRICT_THRESHOLD;
    // Map distance [0, 0.28] to score [100%, 75%], and d > 0.28 drops quickly to 0
    let score = 0;
    if (d <= STRICT_THRESHOLD) {
      score = 0.75 + (1 - d / STRICT_THRESHOLD) * 0.25;
    } else {
      score = Math.max(0, 0.75 - ((d - STRICT_THRESHOLD) / 0.15) * 0.75);
    }
    return { isMatch, score: (score * 100).toFixed(1) + '%' };
  }

  console.log('Same Person 1 (d = 0.215):', evaluate(samePersonDist1));
  console.log('Same Person 2 (d = 0.225):', evaluate(samePersonDist2));
  console.log('Friend / Impostor (d = 0.366):', evaluate(friendDist));
}

testThreshold();
