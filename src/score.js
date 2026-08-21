function add(breakdown, factor, points, reason) {
  if (points <= 0) return;

  breakdown.push({
    factor,
    points,
    reason
  });
}

export function calculateGoldenEggScore(candidate) {
  const breakdown = [];

  /*
   * =========================================================
   * 1. CREATOR QUALITY — 25 POINTS
   * =========================================================
   */

  const creator = candidate?.creatorIntel;

  let creatorScore = 0;

  if (creator?.status === "IDENTIFIED") {
    creatorScore += 5;
  }

  if (
    creator?.identity?.username ||
    creator?.identity?.ensName
  ) {
    creatorScore += 4;
  }

  if (
    creator?.attribution?.source === "CONTRACT_OWNER" &&
    creator?.attribution?.confidence === "HIGH"
  ) {
    creatorScore += 5;
  } else if (
    creator?.attribution?.source === "CONTRACT_OWNER" &&
    creator?.attribution?.confidence === "MEDIUM"
  ) {
    creatorScore += 2;
  }

  const ownedCollections = Number(
    creator?.portfolio?.ownedCollections
  );

  if (
    Number.isFinite(ownedCollections) &&
    ownedCollections >= 25
  ) {
    creatorScore += 4;
  } else if (
    Number.isFinite(ownedCollections) &&
    ownedCollections >= 10
  ) {
    creatorScore += 2;
  }

  const ownedItems = Number(
    creator?.portfolio?.ownedItems
  );

  if (
    Number.isFinite(ownedItems) &&
    ownedItems >= 100
  ) {
    creatorScore += 4;
  } else if (
    Number.isFinite(ownedItems) &&
    ownedItems >= 50
  ) {
    creatorScore += 2;
  }

  creatorScore = Math.min(creatorScore, 25);

  add(
    breakdown,
    "CREATOR_QUALITY",
    creatorScore,
    `Creator quality evidence: ${creatorScore}/25.`
  );

  /*
   * =========================================================
   * 2. PROJECT / COLLECTION — 20 POINTS
   * =========================================================
   */

  const metadata = candidate?.metadataIntel;

  let projectScore = 0;

  const description =
    metadata?.collection?.description;

  if (
    typeof description === "string" &&
    description.trim().length >= 100
  ) {
    projectScore += 6;
  } else if (
    typeof description === "string" &&
    description.trim().length >= 40
  ) {
    projectScore += 3;
  }

  const category =
    metadata?.collection?.category;

  if (category) {
    projectScore += 2;
  }

  if (
    candidate?.identity?.name &&
    candidate?.identity?.slug
  ) {
    projectScore += 2;
  }

  if (candidate?.opensea?.url) {
    projectScore += 1;
  }

  /*
   * Utility/traction signals are intentionally not invented.
   *
   * These points remain unavailable until Sentinel has
   * verified evidence for them.
   */

  const projectSignals =
    Array.isArray(metadata?.signals)
      ? metadata.signals
      : [];

  if (
    projectSignals.includes("ROYALTY_DATA_PRESENT")
  ) {
    projectScore += 2;
  }

  if (
    projectSignals.includes("CONTRACT_STANDARD_PRESENT")
  ) {
    projectScore += 2;
  }

  projectScore = Math.min(projectScore, 20);

  add(
    breakdown,
    "PROJECT_QUALITY",
    projectScore,
    `Project quality evidence: ${projectScore}/20.`
  );

  /*
   * =========================================================
   * 3. MINT ECONOMICS — 15 POINTS
   * =========================================================
   */

  let economicsScore = 0;

  const priceWei =
    metadata?.mint?.priceWei ??
    candidate?.mint?.priceWei;

  if (priceWei !== null && priceWei !== undefined) {
    const numericPrice = Number(priceWei);

    if (
      Number.isFinite(numericPrice) &&
      numericPrice === 0
    ) {
      economicsScore += 8;
    } else {
      economicsScore += 5;
    }
  }

  const mintType =
    metadata?.mint?.type ??
    candidate?.mint?.type;

  if (mintType === "public_sale") {
    economicsScore += 4;
  } else if (mintType === "signed_presale") {
    economicsScore += 2;
  }

  const maxPerWallet = Number(
    metadata?.mint?.maxPerWallet
  );

  if (
    Number.isFinite(maxPerWallet) &&
    maxPerWallet > 0 &&
    maxPerWallet <= 5
  ) {
    economicsScore += 3;
  }

  economicsScore = Math.min(
    economicsScore,
    15
  );

  add(
    breakdown,
    "MINT_ECONOMICS",
    economicsScore,
    `Mint economics quality: ${economicsScore}/15.`
  );

  /*
   * =========================================================
   * 4. SUPPLY / SCARCITY — 10 POINTS
   * =========================================================
   */

  let supplyScore = 0;

  const maxSupply = Number(
    metadata?.supply?.max
  );

  if (Number.isFinite(maxSupply)) {
    if (maxSupply <= 1000) {
      supplyScore += 10;
    } else if (maxSupply <= 5000) {
      supplyScore += 8;
    } else if (maxSupply <= 10000) {
      supplyScore += 5;
    } else if (maxSupply <= 25000) {
      supplyScore += 2;
    }
  }

  supplyScore = Math.min(
    supplyScore,
    10
  );

  add(
    breakdown,
    "SUPPLY_SCARCITY",
    supplyScore,
    `Supply scarcity evidence: ${supplyScore}/10.`
  );

  /*
   * =========================================================
   * 5. MARKET / TRACTION — 10 POINTS
   * =========================================================
   *
   * Deliberately conservative.
   *
   * No sales / holders / volume data = 0.
   * We do NOT manufacture traction from OpenSea presence.
   */

  let tractionScore = 0;

  const stats =
    candidate?.marketIntel;

  if (stats?.verified) {
    const volume = Number(stats?.volumeUsd);
    const sales = Number(stats?.sales);
    const owners = Number(stats?.owners);

    if (
      Number.isFinite(volume) &&
      volume > 10000
    ) {
      tractionScore += 4;
    }

    if (
      Number.isFinite(sales) &&
      sales >= 100
    ) {
      tractionScore += 3;
    }

    if (
      Number.isFinite(owners) &&
      owners >= 100
    ) {
      tractionScore += 3;
    }
  }

  tractionScore = Math.min(
    tractionScore,
    10
  );

  add(
    breakdown,
    "MARKET_TRACTION",
    tractionScore,
    `Verified market traction: ${tractionScore}/10.`
  );

  /*
   * =========================================================
   * 6. TIMING / OPPORTUNITY — 10 POINTS
   * =========================================================
   */

  let timingScore = 0;

  const startTime =
    candidate?.mint?.startTime;

  const endTime =
    candidate?.mint?.endTime;

  if (startTime) {
    timingScore += 4;
  }

  if (endTime) {
    timingScore += 2;
  }

  if (
    candidate?.status?.nextStage ||
    candidate?.status?.activeStage
  ) {
    timingScore += 2;
  }

  if (
    candidate?.executionStatus ===
    "EXECUTION_ELIGIBLE"
  ) {
    timingScore += 2;
  }

  timingScore = Math.min(
    timingScore,
    10
  );

  add(
    breakdown,
    "TIMING_OPPORTUNITY",
    timingScore,
    `Timing evidence: ${timingScore}/10.`
  );

  /*
   * =========================================================
   * 7. RISK ADJUSTMENT — MAX -10
   * =========================================================
   *
   * Risk is a penalty, NOT an alpha source.
   */

  const riskScore = Number(
    candidate?.riskIntel?.score
  );

  const maxRisk = Number(
    candidate?.riskIntel?.maxRisk ?? 40
  );

  let riskPenalty = 0;

  if (
    Number.isFinite(riskScore) &&
    Number.isFinite(maxRisk) &&
    maxRisk > 0
  ) {
    riskPenalty = Math.min(
      10,
      Math.round(
        (riskScore / maxRisk) * 10
      )
    );
  }

  /*
   * =========================================================
   * FINAL SCORE
   * =========================================================
   *
   * Positive components:
   *
   * Creator       25
   * Project       20
   * Economics     15
   * Scarcity      10
   * Traction      10
   * Timing        10
   * ----------------
   * Raw           90
   *
   * Risk          -10
   * ----------------
   * Maximum       90
   *
   * IMPORTANT:
   *
   * The remaining 10 points are reserved for future
   * verified alpha signals.
   */

  const rawScore =
    creatorScore +
    projectScore +
    economicsScore +
    supplyScore +
    tractionScore +
    timingScore;

  const finalScore = Math.min(
    100,
    Math.max(
      0,
      rawScore - riskPenalty
    )
  );

  if (riskPenalty > 0) {
    add(
      breakdown,
      "RISK_PENALTY",
      -riskPenalty,
      `Risk penalty: ${riskScore}/${maxRisk}.`
    );
  }

  let classification;

  if (finalScore >= 95) {
    classification = "AUTO_MINT_ELIGIBLE";
  } else if (finalScore >= 90) {
    classification = "ALPHA_CANDIDATE";
  } else if (finalScore >= 80) {
    classification = "WATCHLIST";
  } else {
    classification = "IGNORE";
  }

  return {
    score: finalScore,
    maxScore: 100,
    classification,
    rawScore,
    riskPenalty,
    breakdown
  };
}
