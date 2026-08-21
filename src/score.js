export function calculateGoldenEggScore(candidate) {
  const breakdown = [];

  let rawScore = 0;

  function add(factor, points, reason) {
    breakdown.push({
      factor,
      points,
      reason
    });

    rawScore += points;
  }

  const creator = candidate.creatorIntel;
  const metadata = candidate.metadataIntel;
  const market = candidate.marketIntel;
  const risk = candidate.riskIntel;

  /*
   * =========================================================
   * 1. CREATOR QUALITY — 25 POINTS
   * =========================================================
   */

  if (creator?.status === "IDENTIFIED") {
    add(
      "CREATOR_IDENTIFIED",
      5,
      "Creator address has been identified."
    );
  }

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

  const historical =
    creator?.historicalCollections;

  if (
    historical?.collectionCount > 0
  ) {
    add(
      "CREATOR_PORTFOLIO",
      4,
      "Creator has historical collection activity."
    );
  }

  if (
    historical?.successfulCollections > 0
  ) {
    add(
      "CREATOR_SUCCESS_HISTORY",
      3,
      `Creator has ${historical.successfulCollections} successful historical collections in the analyzed sample.`
    );
  }

  if (
    historical?.totalSales >= 10
  ) {
    add(
      "CREATOR_ITEM_HISTORY",
      3,
      "Creator has meaningful historical sales activity."
    );
  }

  /*
   * =========================================================
   * 2. PROJECT QUALITY — 20 POINTS
   * =========================================================
   */

  if (
    candidate.identity?.name
  ) {
    add(
      "COLLECTION_NAME",
      2,
      "Collection name is available."
    );
  }

  if (
    metadata?.collection?.description ||
    candidate.description
  ) {
    add(
      "PROJECT_DESCRIPTION",
      3,
      "Project description is available."
    );
  }

  if (
    candidate.opensea?.url
  ) {
    add(
      "OPENSEA_COLLECTION",
      3,
      "OpenSea collection page is available."
    );
  }

  if (
    metadata?.collection?.category ||
    metadata?.category
  ) {
    add(
      "PROJECT_CATEGORY",
      2,
      "Collection category is identified."
    );
  }

  if (
    metadata?.supply?.max ||
    metadata?.supply?.total
  ) {
    add(
      "MAX_SUPPLY_KNOWN",
      3,
      "Maximum collection supply is known."
    );
  }

  if (
    metadata?.contract?.standard
  ) {
    add(
      "KNOWN_CONTRACT_STANDARD",
      2,
      "Contract standard is identified."
    );
  }

  if (
    metadata?.mint?.type ||
    candidate.mint?.type
  ) {
    add(
      "MINT_METADATA_COMPLETE",
      2,
      "Mint stage metadata is available."
    );
  }

  /*
   * =========================================================
   * 3. MINT ECONOMICS — 15 POINTS
   * =========================================================
   */

  const mintType =
    candidate.mint?.type;

  if (
    mintType === "public_sale"
  ) {
    add(
      "PUBLIC_MINT",
      8,
      "Public mint stage detected."
    );
  } else if (
    mintType === "signed_presale"
  ) {
    add(
      "SIGNED_PRESALE",
      8,
      "Signed presale stage detected."
    );
  } else if (
    mintType
  ) {
    add(
      "MINT_STAGE_KNOWN",
      5,
      "Mint stage is known."
    );
  }

  if (
    candidate.mint?.priceWei !== null &&
    candidate.mint?.priceWei !== undefined
  ) {
    add(
      "MINT_PRICE_PRESENT",
      3,
      "Mint price information is available."
    );
  }

  if (
    candidate.mint?.maxPerWallet
  ) {
    add(
      "MINT_LIMIT_PRESENT",
      2,
      "Maximum mint per wallet is known."
    );
  }

  /*
   * =========================================================
   * 4. SUPPLY / SCARCITY — 10 POINTS
   * =========================================================
   */

  const maxSupply =
    Number(
      metadata?.supply?.max ??
      metadata?.supply?.total ??
      0
    );

  if (
    maxSupply > 0 &&
    maxSupply <= 10000
  ) {
    add(
      "SUPPLY_DISCIPLINE",
      8,
      "Maximum supply is 10,000 or lower."
    );
  } else if (
    maxSupply > 0
  ) {
    add(
      "SUPPLY_KNOWN",
      3,
      "Maximum supply is known."
    );
  }

  if (
    metadata?.contract?.standard
  ) {
    add(
      "CONTRACT_STANDARD",
      2,
      "NFT contract standard is known."
    );
  }

  /*
   * =========================================================
   * 5. TIMING — 10 POINTS
   * =========================================================
   */

  if (
    candidate.mint?.startTime
  ) {
    add(
      "MINT_TIME_KNOWN",
      4,
      "Mint start time is known."
    );
  }

  if (
    candidate.mint?.endTime
  ) {
    add(
      "MINT_END_TIME_KNOWN",
      2,
      "Mint end time is known."
    );
  }

  if (
    candidate.mint?.type
  ) {
    add(
      "STAGE_KNOWN",
      2,
      "Mint stage is known."
    );
  }

  if (
    candidate.status
  ) {
    add(
      "DROP_STATUS_AVAILABLE",
      2,
      "Drop status information is available."
    );
  }

  /*
   * =========================================================
   * 6. MARKET INTELLIGENCE — 10 POINTS
   * =========================================================
   */

  if (
    market?.status === "FOUND"
  ) {
    add(
      "MARKET_DATA_FOUND",
      3,
      "OpenSea market data is available."
    );
  }

  if (
    market?.verified === true
  ) {
    add(
      "MARKET_VERIFIED",
      2,
      "Market data has been verified."
    );
  }

  const marketStats =
    market?.stats;

  if (
    Number(marketStats?.sales ?? 0) > 0
  ) {
    add(
      "MARKET_SALES_HISTORY",
      2,
      "Collection has historical sales."
    );
  }

  if (
    Number(marketStats?.volume ?? 0) > 0 ||
    Number(marketStats?.floorPrice ?? 0) > 0
  ) {
    add(
      "MARKET_ACTIVITY",
      3,
      "Collection has measurable market activity."
    );
  }

  /*
   * =========================================================
   * 7. RISK ADJUSTMENT — 10 POINTS
   * =========================================================
   *
   * Risk is converted into positive score contribution.
   *
   * 0 risk       = +10
   * 1–10 risk    = +8
   * 11–20 risk   = +5
   * 21–30 risk   = +2
   * >30 risk     = 0
   */

  const riskScore =
    Number(risk?.score ?? 0);

  const maxRisk =
    Number(risk?.maxRisk ?? 40);

  let riskPoints = 0;

  if (riskScore === 0) {
    riskPoints = 10;
  } else if (riskScore <= 10) {
    riskPoints = 8;
  } else if (riskScore <= 20) {
    riskPoints = 5;
  } else if (riskScore <= 30) {
    riskPoints = 2;
  }

  if (riskPoints > 0) {
    add(
      "RISK_ADJUSTED",
      riskPoints,
      `Risk score ${riskScore}/${maxRisk}.`
    );
  }

  /*
   * =========================================================
   * FINAL SCORE
   * =========================================================
   */

  const score =
    Math.min(
      Math.max(rawScore, 0),
      100
    );

  let classification = "IGNORE";

  if (score >= 95) {
    classification = "AUTO_MINT_ELIGIBLE";
  } else if (score >= 90) {
    classification = "ALPHA_CANDIDATE";
  } else if (score >= 80) {
    classification = "WATCHLIST";
  }

  return {
    score,
    maxScore: 100,
    classification,
    breakdown
  };
}
