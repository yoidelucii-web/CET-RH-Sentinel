export function calculateGoldenEggScore(candidate) {
  let score = 0;

  // Mint stage: maximum 25 points
  if (candidate.mint.type === "public_sale") {
    score += 25;
  }

  // Robinhood Chain: maximum 10 points
  if (candidate.identity.chain === "robinhood") {
    score += 10;
  }

  // Contract exists: maximum 10 points
  if (candidate.identity.contract) {
    score += 10;
  }

  // Mint timing exists: maximum 10 points
  if (candidate.mint.startTime) {
    score += 10;
  }

  // OpenSea listing exists: maximum 5 points
  if (candidate.opensea.url) {
    score += 5;
  }

  return {
    score,
    maxScore: 60
  };
}
