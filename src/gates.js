export function evaluateHardGates(candidate) {
  const reasons = [];

  if (candidate.identity.chain !== "robinhood") {
    reasons.push("NOT_ROBINHOOD");
  }

  if (!candidate.identity.contract) {
    reasons.push("NO_CONTRACT");
  }

  if (!candidate.mint.type) {
    reasons.push("NO_MINT_STAGE");
  }

  const allowedStages = [
    "public_sale",
    "presale",
    "signed_presale"
  ];

  if (!allowedStages.includes(candidate.mint.type)) {
    reasons.push("UNSUPPORTED_STAGE");
  }

  if (!candidate.mint.startTime) {
    reasons.push("NO_START_TIME");
  }

  return {
    passed: reasons.length === 0,
    reasons
  };
}
