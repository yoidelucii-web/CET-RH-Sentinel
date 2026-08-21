export function analyzeWallet(candidate) {
  const creator = candidate.creatorIntel;
  const history = creator?.historicalCollections;

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

  if (creator?.status === "IDENTIFIED") {
    add(
      "CREATOR_IDENTIFIED",
      2,
      "Creator wallet has been identified."
    );
  }

  if (creator?.identity?.ensName) {
    add(
      "ENS_IDENTITY",
      1,
      "Creator wallet has an ENS identity."
    );
  }

  if ((history?.collectionCount ?? 0) >= 25) {
    add(
      "LARGE_COLLECTION_HISTORY",
      2,
      `Creator owns ${history.collectionCount} collections.`
    );
  }

  if ((history?.highVolumeCollections ?? 0) >= 2) {
    add(
      "MULTIPLE_HIGH_VOLUME_COLLECTIONS",
      2,
      `Creator has ${history.highVolumeCollections} high-volume collections.`
    );
  }

  if ((history?.highSalesCollections ?? 0) >= 2) {
    add(
      "MULTIPLE_HIGH_SALES_COLLECTIONS",
      2,
      `Creator has ${history.highSalesCollections} collections with over 1,000 sales.`
    );
  }

  if ((history?.bestFloorPrice ?? 0) >= 1) {
    add(
      "BLUECHIP_HISTORY",
      1,
      `Best historical floor is ${history.bestFloorPrice} ETH.`
    );
  }

  let classification = "UNKNOWN";

  if (score >= 8) {
    classification = "SMART_CREATOR";
  } else if (score >= 5) {
    classification = "ESTABLISHED_CREATOR";
  } else if (score > 0) {
    classification = "KNOWN_CREATOR";
  }

  return {
    score,
    maxScore: 10,
    classification,
    signals
  };
}
