export function calculateAlpha(candidate) {
  const signals = [];
  let score = 0;

  function add(signal, points, reason) {
    signals.push({
      signal,
      points,
      reason
    });
    score += points;
  }

  const creator = candidate.creatorIntel?.historicalCollections;
  const market = candidate.marketIntel?.stats;
  const mint = candidate.mint;
  const risk = candidate.riskIntel;

  /* ==========================================================
   * CREATOR STRENGTH (0–6)
   * ========================================================== */

  if ((creator?.totalVolume ?? 0) >= 1000) {
    add(
      "HIGH_VOLUME_CREATOR",
      2,
      `Creator historical volume is ${creator.totalVolume.toFixed(2)} ETH.`
    );
  }

  if ((creator?.totalSales ?? 0) >= 5000) {
    add(
      "HIGH_SALES_CREATOR",
      2,
      `Creator historical sales are ${creator.totalSales}.`
    );
  }

  if ((creator?.highFloorCollections ?? 0) >= 1) {
    add(
      "HIGH_FLOOR_HISTORY",
      2,
      `Creator has ${creator.highFloorCollections} historical collection(s) with floor ≥ 1 ETH.`
    );
  }

  /* ==========================================================
   * MINT STAGE (0–2)
   * ========================================================== */

  if (mint?.type === "public_sale") {
    add(
      "PUBLIC_STAGE_READY",
      2,
      "Collection has an upcoming public mint stage."
    );
  } else if (mint?.type === "signed_presale") {
    add(
      "SIGNED_PRESALE_STAGE",
      1,
      "Collection is currently in signed presale."
    );
  }

  /* ==========================================================
   * MARKET / RISK (0–2)
   * ========================================================== */

  if (risk?.score === 0) {
    add(
      "MINIMAL_RISK",
      1,
      "Risk engine reports minimal risk."
    );
  }

  if ((market?.floorPrice ?? 0) > 0 || (market?.volume ?? 0) > 0) {
    add(
      "SECONDARY_MARKET_EXISTS",
      1,
      "Historical secondary market activity detected."
    );
  }

  /* ==========================================================
   * CLASSIFICATION
   * ========================================================== */

  let classification = "LOW_ALPHA";

  if (score >= 8) {
    classification = "HIGH_ALPHA";
  } else if (score >= 5) {
    classification = "MEDIUM_ALPHA";
  }

  return {
    score,
    maxScore: 10,
    classification,
    signals
  };
}
