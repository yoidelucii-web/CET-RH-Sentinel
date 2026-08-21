export function calculateGoldenEggScore(candidate) {
  const breakdown = [];

  let score = 0;

  function add(factor, points, reason) {
    if (points <= 0) return;

    breakdown.push({
      factor,
      points,
      reason
    });

    score += points;
  }

  /*
   * =========================================================
   * 1. CHAIN / MARKET FIT — 10 POINTS
   * =========================================================
   */

  if (candidate?.identity?.chain === "robinhood") {
    add(
      "ROBINHOOD_CHAIN",
      10,
      "Collection is launching on Robinhood Chain."
    );
  }

  /*
   * =========================================================
   * 2. MINT QUALITY — 15 POINTS
   * =========================================================
   */

  const mintType = candidate?.mint?.type;

  if (mintType === "public_sale") {
    add(
      "PUBLIC_MINT",
      15,
      "Public mint stage is available."
    );
  } else if (mintType === "signed_presale") {
    add(
      "SIGNED_PRESALE",
      8,
      "Signed presale stage detected."
    );
  }

  if (candidate?.mint?.priceWei !== null &&
      candidate?.mint?.priceWei !== undefined) {
    add(
      "MINT_PRICE_PRESENT",
      3,
      "Mint price information is available."
    );
  }

  if (candidate?.mint?.maxPerWallet) {
    add(
      "MINT_LIMIT_PRESENT",
      2,
      "Maximum mint per wallet is known."
    );
  }

  /*
   * =========================================================
   * 3. CREATOR INTELLIGENCE — 20 POINTS
   * =========================================================
   */

  const creator = candidate?.creatorIntel;

  if (creator?.status === "IDENTIFIED") {
    add(
      "CREATOR_IDENTIFIED",
      5,
      "Creator address has been identified."
    );

    if (
      creator?.identity?.username ||
      creator?.identity?.ensName
    ) {
      add(
        "CREATOR_PUBLIC_IDENTITY",
        5,
        "Creator has a public OpenSea username or ENS identity."
      );
    }

    if (
      creator?.attribution?.source === "CONTRACT_OWNER"
    ) {
      add(
        "CREATOR_CONTRACT_ATTRIBUTION",
        3,
        "Creator attribution is linked to contract ownership."
      );
    }

    const ownedCollections = Number(
      creator?.portfolio?.ownedCollections
    );

    if (
      Number.isFinite(ownedCollections) &&
      ownedCollections >= 10
    ) {
      add(
        "CREATOR_PORTFOLIO",
        4,
        "Creator account has a meaningful collection portfolio."
      );
    }

    const ownedItems = Number(
      creator?.portfolio?.ownedItems
    );

    if (
      Number.isFinite(ownedItems) &&
      ownedItems >= 50
    ) {
      add(
        "CREATOR_ITEM_HISTORY",
        3,
        "Creator account has meaningful item history."
      );
    }
  }

  /*
   * =========================================================
   * 4. METADATA / SUPPLY — 15 POINTS
   * =========================================================
   */

  const metadata = candidate?.metadataIntel;

  const maxSupply = Number(
    metadata?.supply?.max
  );

  if (Number.isFinite(maxSupply)) {
    if (maxSupply > 0 && maxSupply <= 10000) {
      add(
        "SUPPLY_DISCIPLINE",
        8,
        "Maximum supply is 10,000 or lower."
      );
    } else if (maxSupply <= 25000) {
      add(
        "SUPPLY_ACCEPTABLE",
        5,
        "Maximum supply is 25,000 or lower."
      );
    }
  }

  if (
    metadata?.supply?.max !== null &&
    metadata?.supply?.max !== undefined
  ) {
    add(
      "MAX_SUPPLY_KNOWN",
      3,
      "Maximum collection supply is known."
    );
  }

  if (
    metadata?.contract?.standard === "erc721" ||
    metadata?.contract?.standard === "erc1155"
  ) {
    add(
      "KNOWN_CONTRACT_STANDARD",
      2,
      "Contract standard is identified."
    );
  }

  if (
    Array.isArray(metadata?.signals) &&
    metadata.signals.includes("MINT_STAGE_PRESENT")
  ) {
    add(
      "MINT_METADATA_COMPLETE",
      2,
      "Mint stage metadata is available."
    );
  }

  /*
   * =========================================================
   * 5. RISK — 20 POINTS
   * =========================================================
   *
   * Risk is converted into positive score.
   *
   * 0 risk  = 20 points
   * 40 risk = 0 points
   */

  const riskScore = Number(
    candidate?.riskIntel?.score
  );

  const maxRisk = Number(
    candidate?.riskIntel?.maxRisk ?? 40
  );

  if (
    Number.isFinite(riskScore) &&
    Number.isFinite(maxRisk) &&
    maxRisk > 0
  ) {
    const riskPoints = Math.max(
      0,
      Math.round(
        20 - (riskScore / maxRisk) * 20
      )
    );

    add(
      "RISK_ADJUSTED",
      riskPoints,
      `Risk score ${riskScore}/${maxRisk}.`
    );
  }

  /*
   * =========================================================
   * 6. PROJECT / IDENTITY — 10 POINTS
   * =========================================================
   */

  if (candidate?.identity?.name) {
    add(
      "COLLECTION_NAME",
      2,
      "Collection name is available."
    );
  }

  if (metadata?.collection?.description) {
    add(
      "PROJECT_DESCRIPTION",
      3,
      "Project description is available."
    );
  }

  if (candidate?.opensea?.url) {
    add(
      "OPENSEA_COLLECTION",
      3,
      "OpenSea collection page is available."
    );
  }

  if (
    metadata?.collection?.category
  ) {
    add(
      "PROJECT_CATEGORY",
      2,
      "Collection category is identified."
    );
  }

  /*
   * =========================================================
   * 7. OPPORTUNITY / TIMING — 10 POINTS
   * =========================================================
   */

  if (candidate?.mint?.startTime) {
    add(
      "MINT_TIME_KNOWN",
      4,
      "Mint start time is known."
    );
  }

  if (candidate?.mint?.endTime) {
    add(
      "MINT_END_TIME_KNOWN",
      2,
      "Mint end time is known."
    );
  }

  if (candidate?.mint?.type) {
    add(
      "STAGE_KNOWN",
      2,
      "Mint stage is known."
    );
  }

  if (candidate?.status) {
    add(
      "DROP_STATUS_AVAILABLE",
      2,
      "Drop status information is available."
    );
  }

  /*
   * =========================================================
   * NORMALIZE TO 100
   * =========================================================
   */

  const maxScore = 100;

  const finalScore = Math.min(
    Math.max(score, 0),
    maxScore
  );

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
    maxScore,
    classification,
    breakdown
  };
}
