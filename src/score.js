export function calculateGoldenEggScore(candidate) {
  const breakdown = [];

  if (candidate.mint.type === "public_sale") {
    breakdown.push({
      factor: "PUBLIC_MINT",
      points: 25
    });
  }

  if (candidate.identity.chain === "robinhood") {
    breakdown.push({
      factor: "ROBINHOOD_CHAIN",
      points: 10
    });
  }

  if (candidate.identity.contract) {
    breakdown.push({
      factor: "CONTRACT_PRESENT",
      points: 10
    });
  }

  if (candidate.mint.startTime) {
    breakdown.push({
      factor: "MINT_TIME_PRESENT",
      points: 10
    });
  }

  if (candidate.opensea.url) {
    breakdown.push({
      factor: "OPENSEA_PRESENT",
      points: 5
    });
  }

  const score = breakdown.reduce(
    (total, item) => total + item.points,
    0
  );

  return {
    score,
    maxScore: 60,
    breakdown
  };
}
