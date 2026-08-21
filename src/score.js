export function calculateGoldenEggScore(candidate) {
  const breakdown = [];
  let score = 0;

  function add(factor, points, reason) {
    breakdown.push({ factor, points, reason });
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
   * 1. CREATOR INTELLIGENCE (25)
   * ========================================================== */

  if (creator?.status === "IDENTIFIED") {
    add("CREATOR_IDENTIFIED", 5, "Creator identified.");
  }

  if (creator?.identity?.username || creator?.identity?.ensName) {
    add("PUBLIC_CREATOR_IDENTITY", 5, "Creator has OpenSea username or ENS.");
  }

  const history = creator?.historicalCollections;

  if ((history?.totalVolume ?? 0) >= 1000) {
    add("CREATOR_VOLUME_HISTORY", 5, "Historical creator volume exceeds 1,000 ETH.");
  }

  if ((history?.totalSales ?? 0) >= 5000) {
    add("CREATOR_SALES_HISTORY", 5, "Historical creator sales exceed 5,000.");
  }

  if ((history?.highFloorCollections ?? 0) >= 1) {
    add("BLUECHIP_CREATOR_HISTORY", 5, "Creator has historical collection with floor above 1 ETH.");
  }

  /* ==========================================================
   * 2. PROJECT QUALITY (20)
   * ========================================================== */

  if (candidate.identity?.chain === "robinhood") {
    add("ROBINHOOD_CHAIN", 4, "Robinhood chain collection.");
  }

  if (candidate.identity?.contract) {
    add("CONTRACT_PRESENT", 3, "Contract available.");
  }

  if (metadata?.collection?.description) {
    add("DESCRIPTION_PRESENT", 4, "Collection description available.");
  }

  if (candidate.opensea?.url) {
    add("OPENSEA_PAGE", 3, "OpenSea collection page available.");
  }

  if (metadata?.collection?.category) {
    add("CATEGORY_PRESENT", 2, "Project category available.");
  }

  if (metadata?.contract?.standard === "erc721") {
    add("ERC721_STANDARD", 4, "ERC721 contract detected.");
  }

  /* ==========================================================
   * 3. MINT ECONOMICS (15)
   * ========================================================== */

  if (candidate.mint?.type === "public_sale") {
    add("PUBLIC_SALE", 8, "Public mint stage.");
  } else if (candidate.mint?.type === "signed_presale") {
    add("SIGNED_PRESALE", 6, "Signed presale stage.");
  }

  if (candidate.mint?.priceWei !== null) {
    add("MINT_PRICE", 3, "Mint price known.");
  }

  if (candidate.mint?.maxPerWallet) {
    add("MINT_LIMIT", 2, "Mint limit known.");
  }

  if (candidate.mint?.startTime) {
    add("MINT_START_TIME", 2, "Mint start time known.");
  }

  /* ==========================================================
   * 4. SUPPLY & SCARCITY (10)
   * ========================================================== */

  const maxSupply = Number(metadata?.supply?.max ?? 0);

  if (maxSupply > 0 && maxSupply <= 3333) {
    add("SCARCE_SUPPLY", 6, "Supply ≤ 3,333.");
  } else if (maxSupply <= 5555) {
    add("MEDIUM_SUPPLY", 4, "Supply ≤ 5,555.");
  } else if (maxSupply <= 10000) {
    add("STANDARD_SUPPLY", 3, "Supply ≤ 10,000.");
  }

  if (metadata?.supply?.remaining !== undefined) {
    add("SUPPLY_VISIBLE", 2, "Remaining supply visible.");
  }

  if (metadata?.royalty?.length) {
    add("ROYALTY_VISIBLE", 2, "Royalty configuration available.");
  }

  /* ==========================================================
   * 5. TIMING (10)
   * ========================================================== */

  if (candidate.status?.nextStage) {
    add("UPCOMING_STAGE", 4, "Upcoming mint stage detected.");
  }

  if (candidate.status?.isMinting === false) {
    add("PRE_MINT_WINDOW", 2, "Collection has not started minting yet.");
  }

  if (candidate.executionStatus === "EXECUTION_ELIGIBLE") {
    add("EXECUTION_READY", 4, "Eligible for execution.");
  }

  /* ==========================================================
   * 6. MARKET INTELLIGENCE (10)
   * ========================================================== */

  if (market?.status === "FOUND") {
    add("MARKET_FOUND", 3, "Market endpoint returned collection.");
  }

  if (market?.verified) {
    add("MARKET_VERIFIED", 2, "Market verified.");
  }

  if ((market?.stats?.volume ?? 0) > 0) {
    add("MARKET_VOLUME", 3, "Historical market volume exists.");
  }

  if ((market?.stats?.sales ?? 0) > 0) {
    add("MARKET_SALES", 2, "Historical market sales exist.");
  }

  /* ==========================================================
   * 7. ALPHA INTELLIGENCE (10)
   * ========================================================== */

  if (alpha?.classification === "HIGH_ALPHA") {
    add("HIGH_ALPHA", 4, "High alpha signal.");
  } else if (alpha?.classification === "MEDIUM_ALPHA") {
    add("MEDIUM_ALPHA", 2, "Medium alpha signal.");
  }

  if (wallet?.classification === "SMART_CREATOR") {
    add("SMART_CREATOR", 3, "Smart creator wallet.");
  } else if (wallet?.classification === "ESTABLISHED_CREATOR") {
    add("ESTABLISHED_CREATOR", 2, "Established creator wallet.");
  }

  if (social?.classification === "HIGH_SOCIAL") {
    add("HIGH_SOCIAL", 2, "Strong social presence.");
  } else if (social?.classification === "MEDIUM_SOCIAL") {
    add("MEDIUM_SOCIAL", 1, "Medium social presence.");
  }

  /* ==========================================================
   * RISK BONUS (max +5)
   * ========================================================== */

  if (risk?.score === 0) {
    add("MINIMAL_RISK", 5, "Risk score 0/40.");
  } else if (risk?.score <= 10) {
    add("LOW_RISK", 3, "Risk score ≤10.");
  } else if (risk?.score <= 20) {
    add("MEDIUM_RISK", 1, "Risk score ≤20.");
  }

  /* ==========================================================
   * FINAL SCORE
   * ========================================================== */

  score = Math.min(score, 100);

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
