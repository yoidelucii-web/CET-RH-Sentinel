function addPenalty(penalties, flags, factor, points, reason) {
  penalties.push({
    factor,
    points,
    reason
  });

  flags.push(factor);
}

function calculateRoyaltyPercentage(royalty) {
  if (!Array.isArray(royalty)) {
    return null;
  }

  const total = royalty.reduce((sum, item) => {
    const fee = Number(item?.fee ?? 0);

    return Number.isFinite(fee) ? sum + fee : sum;
  }, 0);

  return total;
}

function calculateRiskLevel(score) {
  if (score >= 25) return "HIGH";
  if (score >= 12) return "MEDIUM";
  if (score >= 5) return "LOW";

  return "MINIMAL";
}

export function calculateRisk(candidate) {
  const metadata = candidate?.metadataIntel ?? {};
  const creator = candidate?.creatorIntel ?? {};

  const penalties = [];
  const flags = [];

  let score = 0;

  /*
   * ---------------------------------------------------------
   * SUPPLY RISK
   * ---------------------------------------------------------
   */

  const maxSupply = Number(metadata?.supply?.max);

  if (Number.isFinite(maxSupply)) {
    if (maxSupply >= 100000) {
      addPenalty(
        penalties,
        flags,
        "EXTREME_SUPPLY",
        10,
        "Collection supply is 100,000 or greater."
      );

      score += 10;
    } else if (maxSupply >= 25000) {
      addPenalty(
        penalties,
        flags,
        "VERY_LARGE_SUPPLY",
        7,
        "Collection supply is 25,000 or greater."
      );

      score += 7;
    } else if (maxSupply >= 10000) {
      addPenalty(
        penalties,
        flags,
        "LARGE_SUPPLY",
        5,
        "Collection supply is 10,000 or greater."
      );

      score += 5;
    }
  }

  /*
   * ---------------------------------------------------------
   * MINT LIMIT RISK
   * ---------------------------------------------------------
   */

  const maxPerWallet = Number(
    metadata?.mint?.maxPerWallet
  );

  if (Number.isFinite(maxPerWallet)) {
    if (maxPerWallet >= 100) {
      addPenalty(
        penalties,
        flags,
        "VERY_HIGH_MINT_LIMIT",
        5,
        "Maximum mint per wallet is 100 or greater."
      );

      score += 5;
    } else if (maxPerWallet >= 50) {
      addPenalty(
        penalties,
        flags,
        "HIGH_MINT_LIMIT",
        3,
        "Maximum mint per wallet is 50 or greater."
      );

      score += 3;
    }
  }

  /*
   * ---------------------------------------------------------
   * ROYALTY RISK
   * ---------------------------------------------------------
   */

  const royaltyPercentage = calculateRoyaltyPercentage(
    metadata?.royalty
  );

  if (royaltyPercentage !== null) {
    if (royaltyPercentage >= 10) {
      addPenalty(
        penalties,
        flags,
        "EXTREME_ROYALTY",
        10,
        `Total configured royalty is ${royaltyPercentage}%.`
      );

      score += 10;
    } else if (royaltyPercentage >= 7.5) {
      addPenalty(
        penalties,
        flags,
        "HIGH_ROYALTY",
        7,
        `Total configured royalty is ${royaltyPercentage}%.`
      );

      score += 7;
    } else if (royaltyPercentage >= 5) {
      addPenalty(
        penalties,
        flags,
        "ELEVATED_ROYALTY",
        3,
        `Total configured royalty is ${royaltyPercentage}%.`
      );

      score += 3;
    }
  }

  /*
   * ---------------------------------------------------------
   * CREATOR ATTRIBUTION RISK
   * ---------------------------------------------------------
   */

  const attributionConfidence =
    creator?.attribution?.confidence;

  if (attributionConfidence === "NONE") {
    addPenalty(
      penalties,
      flags,
      "CREATOR_UNKNOWN",
      8,
      "Creator attribution could not be established."
    );

    score += 8;
  } else if (attributionConfidence === "LOW") {
    addPenalty(
      penalties,
      flags,
      "LOW_CREATOR_CONFIDENCE",
      5,
      "Creator attribution has low confidence."
    );

    score += 5;
  } else if (attributionConfidence === "MEDIUM") {
    addPenalty(
      penalties,
      flags,
      "MEDIUM_CREATOR_CONFIDENCE",
      1,
      "Creator attribution is based on contract ownership."
    );

    score += 1;
  }

  /*
   * ---------------------------------------------------------
   * CREATOR IDENTITY
   * ---------------------------------------------------------
   *
   * Missing username/ENS is NOT treated as a scam signal.
   * It only means there is less identity evidence.
   */

  const username = creator?.identity?.username;
  const ensName = creator?.identity?.ensName;

  if (!username && !ensName) {
    addPenalty(
      penalties,
      flags,
      "NO_PUBLIC_CREATOR_IDENTITY",
      1,
      "No OpenSea username or ENS identity was found."
    );

    score += 1;
  }

  /*
   * ---------------------------------------------------------
   * PORTFOLIO CONTEXT
   * ---------------------------------------------------------
   *
   * Portfolio size is informational.
   * We deliberately DO NOT penalize a large portfolio.
   */

  const ownedCollections = Number(
    creator?.portfolio?.ownedCollections
  );

  const ownedItems = Number(
    creator?.portfolio?.ownedItems
  );

  if (
    Number.isFinite(ownedCollections) &&
    ownedCollections === 0
  ) {
    flags.push("NO_PORTFOLIO_HISTORY");
  }

  /*
   * ---------------------------------------------------------
   * CONTRACT STANDARD
   * ---------------------------------------------------------
   */

  const contractStandard =
    metadata?.contract?.standard;

  if (!contractStandard) {
    addPenalty(
      penalties,
      flags,
      "UNKNOWN_CONTRACT_STANDARD",
      3,
      "OpenSea did not provide a recognized contract standard."
    );

    score += 3;
  }

  /*
   * ---------------------------------------------------------
   * DATA QUALITY
   * ---------------------------------------------------------
   */

  const metadataStatus = metadata?.status;
  const creatorStatus = creator?.status;

  if (metadataStatus === "UNKNOWN") {
    addPenalty(
      penalties,
      flags,
      "METADATA_UNKNOWN",
      3,
      "Metadata intelligence could not be established."
    );

    score += 3;
  }

  if (creatorStatus === "UNKNOWN") {
    addPenalty(
      penalties,
      flags,
      "CREATOR_INTELLIGENCE_UNKNOWN",
      5,
      "Creator intelligence could not be established."
    );

    score += 5;
  }

  /*
   * ---------------------------------------------------------
   * CAP
   * ---------------------------------------------------------
   */

  const cappedScore = Math.min(score, 40);

  return {
    level: calculateRiskLevel(cappedScore),

    score: cappedScore,

    maxRisk: 40,

    penalties,

    flags,

    context: {
      maxSupply: Number.isFinite(maxSupply)
        ? maxSupply
        : null,

      maxPerWallet: Number.isFinite(maxPerWallet)
        ? maxPerWallet
        : null,

      royaltyPercentage,

      creatorConfidence:
        attributionConfidence ?? null,

      creatorUsername:
        username ?? null,

      creatorEns:
        ensName ?? null,

      ownedCollections:
        Number.isFinite(ownedCollections)
          ? ownedCollections
          : null,

      ownedItems:
        Number.isFinite(ownedItems)
          ? ownedItems
          : null,

      contractStandard:
        contractStandard ?? null
    }
  };
}
