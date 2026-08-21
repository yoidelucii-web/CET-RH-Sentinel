export function calculateGoldenEggScore(candidate) {
  const breakdown = [];
  let score = 0;

  function add(factor, points, reason) {
    breakdown.push({
      factor,
      points,
      reason
    });

    score += points;
  }

  const creator = candidate.creatorIntel;
  const metadata = candidate.metadataIntel;
  const market = candidate.marketIntel;
  const risk = candidate.riskIntel;
  const alpha = candidate.alphaIntel;
  const wallet = candidate.walletIntel;
  const social = candidate.socialIntel;

  /* ==========================================================
   * 1. CREATOR QUALITY — MAX 25
   * ========================================================== */

  let creatorScore = 0;

  if (creator?.status === "IDENTIFIED") {
    creatorScore += 5;

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
    creatorScore += 3;

    add(
      "PUBLIC_CREATOR_IDENTITY",
      3,
      "Creator has a public identity."
    );
  }

  const history = creator?.historicalCollections;

  if ((history?.totalVolume ?? 0) >= 1000) {
    creatorScore += 4;

    add(
      "CREATOR_VOLUME_HISTORY",
      4,
      "Creator has significant historical volume."
    );
  }

  if ((history?.totalSales ?? 0) >= 5000) {
    creatorScore += 4;

    add(
      "CREATOR_SALES_HISTORY",
      4,
      "Creator has significant historical sales."
    );
  }

  if ((history?.successfulCollections ?? 0) >= 3) {
    creatorScore += 4;

    add(
      "CREATOR_SUCCESS_HISTORY",
      4,
      "Creator has multiple successful historical collections."
    );
  }

  if ((history?.bestFloorPrice ?? 0) >= 1) {
    creatorScore += 3;

    add(
      "BLUECHIP_CREATOR_HISTORY",
      3,
      "Creator has historical collection with floor ≥1 ETH."
    );
  }

  if ((creator?.attribution?.confidence ?? "") === "HIGH") {
    creatorScore += 2;

    add(
      "HIGH_CREATOR_CONFIDENCE",
      2,
      "Creator attribution has high confidence."
    );
  }

  creatorScore = Math.min(creatorScore, 25);

  /* ==========================================================
   * 2. PROJECT QUALITY — MAX 20
   * ========================================================== */

  let projectScore = 0;

  if (candidate.identity?.chain === "robinhood") {
    projectScore += 4;

    add(
      "ROBINHOOD_CHAIN",
      4,
      "Collection is launching on Robinhood Chain."
    );
  }

  if (candidate.identity?.contract) {
    projectScore += 3;

    add(
      "CONTRACT_PRESENT",
      3,
      "NFT contract is identified."
    );
  }

  if (metadata?.collection?.description) {
    projectScore += 3;

    add(
      "PROJECT_DESCRIPTION",
      3,
      "Project description is available."
    );
  }

  if (metadata?.collection?.category) {
    projectScore += 2;

    add(
      "PROJECT_CATEGORY",
      2,
      "Project category is identified."
    );
  }

  if (metadata?.contract?.standard === "erc721") {
    projectScore += 3;

    add(
      "KNOWN_CONTRACT_STANDARD",
      3,
      "ERC721 contract standard identified."
    );
  }

  if (candidate.opensea?.url) {
    projectScore += 2;

    add(
      "OPENSEA_COLLECTION",
      2,
      "OpenSea collection page exists."
    );
  }

  if (candidate.identity?.name) {
    projectScore += 1;

    add(
      "COLLECTION_NAME",
      1,
      "Collection name is available."
    );
  }

  projectScore = Math.min(projectScore, 20);

  /* ==========================================================
   * 3. MINT ECONOMICS — MAX 15
   * ========================================================== */

  let mintScore = 0;

  if (candidate.mint?.type === "public_sale") {
    mintScore += 5;

    add(
      "PUBLIC_MINT",
      5,
      "Public mint stage detected."
    );
  } else if (candidate.mint?.type === "signed_presale") {
    mintScore += 4;

    add(
      "SIGNED_PRESALE",
      4,
      "Signed presale stage detected."
    );
  }

  if (
    candidate.mint?.priceWei !== undefined &&
    candidate.mint?.priceWei !== null
  ) {
    mintScore += 3;

    add(
      "MINT_PRICE_KNOWN",
      3,
      "Mint price is known."
    );
  }

  if (candidate.mint?.maxPerWallet) {
    mintScore += 2;

    add(
      "MINT_LIMIT_KNOWN",
      2,
      "Maximum mint per wallet is known."
    );
  }

  if (candidate.mint?.startTime) {
    mintScore += 2;

    add(
      "MINT_START_KNOWN",
      2,
      "Mint start time is known."
    );
  }

  if (candidate.mint?.endTime) {
    mintScore += 1;

    add(
      "MINT_END_KNOWN",
      1,
      "Mint end time is known."
    );
  }

  mintScore = Math.min(mintScore, 15);

  /* ==========================================================
   * 4. SUPPLY / SCARCITY — MAX 10
   * ========================================================== */

  let scarcityScore = 0;

  const maxSupply = Number(
    metadata?.supply?.max ??
    candidate.metadata?.supply?.max ??
    0
  );

  if (maxSupply > 0 && maxSupply <= 3333) {
    scarcityScore += 6;

    add(
      "SCARCE_SUPPLY",
      6,
      "Maximum supply is 3,333 or lower."
    );
  } else if (maxSupply > 0 && maxSupply <= 5555) {
    scarcityScore += 4;

    add(
      "MODERATE_SUPPLY",
      4,
      "Maximum supply is 5,555 or lower."
    );
  } else if (maxSupply > 0 && maxSupply <= 10000) {
    scarcityScore += 2;

    add(
      "STANDARD_SUPPLY",
      2,
      "Maximum supply is 10,000 or lower."
    );
  }

  if (
    metadata?.supply?.remaining !== undefined &&
    metadata?.supply?.remaining !== null
  ) {
    scarcityScore += 2;

    add(
      "SUPPLY_VISIBLE",
      2,
      "Remaining supply is known."
    );
  }

  if (metadata?.royalty?.length) {
    scarcityScore += 1;

    add(
      "ROYALTY_DATA_PRESENT",
      1,
      "Royalty configuration is known."
    );
  }

  scarcityScore = Math.min(scarcityScore, 10);

  /* ==========================================================
   * 5. TIMING — MAX 10
   * ========================================================== */

  let timingScore = 0;

  if (candidate.mint?.startTime) {
    timingScore += 3;

    add(
      "TIMING_KNOWN",
      3,
      "Mint timing is known."
    );
  }

  if (
    candidate.status?.isMinting === false &&
    candidate.status?.nextStage
  ) {
    timingScore += 3;

    add(
      "PRE_MINT_OPPORTUNITY",
      3,
      "Upcoming mint opportunity detected."
    );
  }

  if (
    candidate.executionStatus ===
    "EXECUTION_ELIGIBLE"
  ) {
    timingScore += 4;

    add(
      "EXECUTION_WINDOW",
      4,
      "Candidate currently satisfies execution timing requirements."
    );
  }

  timingScore = Math.min(timingScore, 10);

  /* ==========================================================
   * 6. MARKET DEMAND — MAX 10
   *
   * IMPORTANT:
   * OpenSea FOUND / VERIFIED alone does NOT mean demand.
   * ========================================================== */

  let marketScore = 0;

  const stats = market?.stats;

  if (
    market?.status === "FOUND" &&
    market?.verified === true
  ) {
    add(
      "MARKET_VERIFIED",
      1,
      "OpenSea market data is verified."
    );

    marketScore += 1;
  }

  const volume = Number(stats?.volume ?? 0);
  const sales = Number(stats?.sales ?? 0);
  const owners = Number(stats?.numOwners ?? 0);
  const floor = Number(stats?.floorPrice ?? 0);

  if (volume >= 100) {
    marketScore += 3;

    add(
      "STRONG_MARKET_VOLUME",
      3,
      "Historical market volume is significant."
    );
  } else if (volume >= 10) {
    marketScore += 2;

    add(
      "MARKET_VOLUME",
      2,
      "Historical market volume exists."
    );
  }

  if (sales >= 100) {
    marketScore += 2;

    add(
      "STRONG_SALES_ACTIVITY",
      2,
      "Historical sales activity is significant."
    );
  } else if (sales >= 10) {
    marketScore += 1;

    add(
      "SALES_ACTIVITY",
      1,
      "Historical sales activity exists."
    );
  }

  if (owners >= 100) {
    marketScore += 2;

    add(
      "OWNER_DISTRIBUTION",
      2,
      "Collection has meaningful owner distribution."
    );
  } else if (owners >= 25) {
    marketScore += 1;

    add(
      "OWNER_ACTIVITY",
      1,
      "Collection has measurable owner activity."
    );
  }

  if (floor > 0) {
    marketScore += 2;

    add(
      "FLOOR_PRICE_PRESENT",
      2,
      "Collection has an established floor price."
    );
  }

  marketScore = Math.min(marketScore, 10);

  /* ==========================================================
   * 7. ALPHA SIGNALS — MAX 5
   * ========================================================== */

  let alphaScore = 0;

  if (alpha?.classification === "HIGH_ALPHA") {
    alphaScore += 3;

    add(
      "HIGH_ALPHA_SIGNAL",
      3,
      "High alpha signal detected."
    );
  } else if (
    alpha?.classification === "MEDIUM_ALPHA"
  ) {
    alphaScore += 2;

    add(
      "MEDIUM_ALPHA_SIGNAL",
      2,
      "Medium alpha signal detected."
    );
  }

  if (
    wallet?.classification === "SMART_CREATOR"
  ) {
    alphaScore += 1;

    add(
      "SMART_CREATOR",
      1,
      "Creator wallet shows strong historical signals."
    );
  }

  if (
    social?.classification === "HIGH_SOCIAL"
  ) {
    alphaScore += 1;

    add(
      "HIGH_SOCIAL",
      1,
      "Strong social signal detected."
    );
  }

  alphaScore = Math.min(alphaScore, 5);

  /* ==========================================================
   * 8. RISK ADJUSTMENT — MAX 5
   *
   * No penalty points for "no evidence".
   * This is a small bonus only for genuinely low risk.
   * ========================================================== */

  let riskScore = 0;

  const riskValue = Number(risk?.score ?? 40);

  if (riskValue === 0) {
    riskScore = 3;

    add(
      "MINIMAL_RISK",
      3,
      "Risk engine reports 0/40."
    );
  } else if (riskValue <= 10) {
    riskScore = 2;

    add(
      "LOW_RISK",
      2,
      "Risk score is 10/40 or lower."
    );
  } else if (riskValue <= 20) {
    riskScore = 1;

    add(
      "CONTROLLED_RISK",
      1,
      "Risk score is 20/40 or lower."
    );
  }

  /* ==========================================================
   * FINAL SCORE
   *
   * Maximum theoretical score:
   *
   * Creator       25
   * Project       20
   * Mint          15
   * Scarcity      10
   * Timing        10
   * Market        10
   * Alpha          5
   * Risk           3
   *
   * = 98
   *
   * 100 is intentionally unreachable from ordinary metadata.
   * ========================================================== */

  score =
    creatorScore +
    projectScore +
    mintScore +
    scarcityScore +
    timingScore +
    marketScore +
    alphaScore +
    riskScore;

  score = Math.min(score, 100);

  /* ==========================================================
   * CLASSIFICATION
   * ========================================================== */

  let classification = "IGNORE";

  if (score >= 95) {
    classification = "AUTO_MINT_ELIGIBLE";
  } else if (score >= 90) {
    classification = "ALPHA_CANDIDATE";
  } else if (score >= 80) {
    classification = "WATCHLIST";
  } else if (score >= 70) {
    classification = "MONITOR";
  }

  return {
    score,
    maxScore: 100,
    classification,
    breakdown
  };
}
