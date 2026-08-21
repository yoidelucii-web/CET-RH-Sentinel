const OPENSEA_API = "https://api.opensea.io/api/v2";

async function fetchOpenSea(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(
      `OpenSea request error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function resolveAccount(address, apiKey) {
  return fetchOpenSea(
    `${OPENSEA_API}/accounts/resolve/${address}`,
    apiKey
  );
}

async function getAccountCollections(address, apiKey) {
  return fetchOpenSea(
    `${OPENSEA_API}/account/${address}/collections`,
    apiKey
  );
}

async function getCollectionStats(slug, apiKey) {
  return fetchOpenSea(
    `${OPENSEA_API}/collections/${encodeURIComponent(slug)}/stats`,
    apiKey
  );
}

function calculateHistoricalScore(history) {
  let score = 0;

  if (history.collectionCount > 0) {
    score += 5;
  }

  if (history.totalSales >= 10) {
    score += 5;
  } else if (history.totalSales >= 3) {
    score += 3;
  } else if (history.totalSales > 0) {
    score += 1;
  }

  if (history.totalVolume >= 20) {
    score += 5;
  } else if (history.totalVolume >= 5) {
    score += 3;
  } else if (history.totalVolume > 0) {
    score += 1;
  }

  if (history.totalOwners >= 50) {
    score += 5;
  } else if (history.totalOwners >= 10) {
    score += 3;
  } else if (history.totalOwners > 0) {
    score += 1;
  }

  if (history.bestFloorPrice >= 1) {
    score += 5;
  } else if (history.bestFloorPrice > 0) {
    score += 2;
  }

  return Math.min(score, 25);
}

export async function analyzeCreator(candidate, apiKey) {
  const errors = [];
  const flags = [];

  const creatorAddress =
    candidate.creatorAddress ??
    candidate.identity?.creator ??
    candidate.identity?.owner ??
    candidate.contract?.owner ??
    null;

  if (!creatorAddress) {
    return {
      status: "UNKNOWN",
      address: null,
      identity: {
        username: null,
        ensName: null
      },
      attribution: {
        source: "UNAVAILABLE",
        confidence: "LOW"
      },
      portfolio: {
        ownedCollections: 0,
        ownedItems: 0,
        estimatedUsdValue: 0
      },
      historicalCollections: {
        collectionCount: 0,
        analyzedCollections: 0,
        totalVolume: 0,
        totalSales: 0,
        totalOwners: 0,
        bestFloorPrice: 0,
        bestCollection: null,
        successfulCollections: 0
      },
      flags: [],
      score: 0,
      maxScore: 25,
      errors: ["Creator address unavailable"]
    };
  }

  let account;
  let collectionsData;

  try {
    account = await resolveAccount(
      creatorAddress,
      apiKey
    );
  } catch (error) {
    errors.push(
      `Account resolve failed: ${error.message}`
    );
  }

  try {
    collectionsData = await getAccountCollections(
      creatorAddress,
      apiKey
    );
  } catch (error) {
    errors.push(
      `Collection history failed: ${error.message}`
    );
  }

  const username = account?.username ?? null;
  const ensName = account?.ens_name ?? null;

  if (username) {
    flags.push("OPENSEA_USERNAME");
  }

  if (ensName) {
    flags.push("ENS_IDENTITY");
  }

  flags.push("CONTRACT_OWNER");

  const ownedCollections =
    collectionsData?.collections?.length ?? 0;

  const ownedItems =
    collectionsData?.collections?.reduce(
      (total, collection) =>
        total + Number(collection.total_quantity ?? 0),
      0
    ) ?? 0;

  const estimatedUsdValue =
    collectionsData?.collections?.reduce(
      (total, collection) =>
        total + Number(collection.usd_value ?? 0),
      0
    ) ?? 0;

  const historicalCollections =
    collectionsData?.collections ?? [];

  let totalVolume = 0;
  let totalSales = 0;
  let totalOwners = 0;
  let bestFloorPrice = 0;
  let bestCollection = null;
  let successfulCollections = 0;
  let analyzedCollections = 0;

  const collectionResults = [];

  /*
   * Limit historical stats requests.
   *
   * We don't need to hammer OpenSea with all 50
   * collections during every scan. The first 10
   * collections provide a useful initial sample.
   */
  const collectionsToAnalyze =
    historicalCollections.slice(0, 10);

  for (const collection of collectionsToAnalyze) {
    if (!collection.collection) {
      continue;
    }

    try {
      const stats = await getCollectionStats(
        collection.collection,
        apiKey
      );

      const total = stats?.total ?? {};

      const volume = Number(
        total.volume ?? 0
      );

      const sales = Number(
        total.sales ?? 0
      );

      const owners = Number(
        total.num_owners ?? 0
      );

      const floorPrice = Number(
        total.floor_price ?? 0
      );

      totalVolume += volume;
      totalSales += sales;
      totalOwners += owners;

      if (floorPrice > bestFloorPrice) {
        bestFloorPrice = floorPrice;

        bestCollection = {
          name: collection.name ?? null,
          slug: collection.collection,
          floorPrice,
          volume,
          sales,
          owners
        };
      }

      /*
       * A "successful" historical collection is
       * deliberately conservative.
       */
      if (
        volume >= 5 ||
        sales >= 10 ||
        floorPrice >= 1
      ) {
        successfulCollections += 1;
      }

      collectionResults.push({
        name: collection.name ?? null,
        slug: collection.collection,
        volume,
        sales,
        owners,
        floorPrice
      });

      analyzedCollections += 1;
    } catch (error) {
      errors.push(
        `Stats failed for ${collection.collection}: ${error.message}`
      );
    }
  }

  const historicalSummary = {
    collectionCount: ownedCollections,
    analyzedCollections,
    totalVolume,
    totalSales,
    totalOwners,
    bestFloorPrice,
    bestCollection,
    successfulCollections
  };

  const score =
    calculateHistoricalScore(
      historicalSummary
    );

  if (successfulCollections > 0) {
    flags.push("SUCCESSFUL_HISTORY");
  }

  if (totalVolume >= 20) {
    flags.push("STRONG_HISTORICAL_VOLUME");
  }

  if (totalSales >= 10) {
    flags.push("MEANINGFUL_SALES_HISTORY");
  }

  if (bestFloorPrice >= 1) {
    flags.push("MEANINGFUL_HISTORICAL_FLOOR");
  }

  const confidence =
    creatorAddress &&
    (username || ensName)
      ? "HIGH"
      : creatorAddress
        ? "MEDIUM"
        : "LOW";

  return {
    status: creatorAddress
      ? "IDENTIFIED"
      : "UNKNOWN",

    address: creatorAddress,

    identity: {
      username,
      ensName
    },

    attribution: {
      source: "CONTRACT_OWNER",
      confidence
    },

    portfolio: {
      ownedCollections,
      ownedItems,
      estimatedUsdValue
    },

    historicalCollections: {
      collectionCount:
        historicalSummary.collectionCount,

      analyzedCollections:
        historicalSummary.analyzedCollections,

      totalVolume:
        Number(totalVolume.toFixed(4)),

      totalSales,

      totalOwners,

      bestFloorPrice:
        Number(bestFloorPrice.toFixed(4)),

      bestCollection,

      successfulCollections,

      collections:
        collectionResults
    },

    flags,

    score,

    maxScore: 25,

    errors
  };
}
