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

async function getCollection(slug, apiKey) {
  return fetchOpenSea(
    `${OPENSEA_API}/collections/${encodeURIComponent(slug)}`,
    apiKey
  );
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

  let creatorAddress = null;

  /*
   * STEP 1
   * Resolve creator from the collection owner.
   */
  try {
    const slug = candidate.identity?.slug;

    if (!slug) {
      throw new Error("Collection slug unavailable");
    }

    const collection = await getCollection(
      slug,
      apiKey
    );

    creatorAddress =
      collection?.owner ??
      collection?.contract?.owner ??
      null;

    if (creatorAddress) {
      flags.push("CONTRACT_OWNER");
    }
  } catch (error) {
    errors.push(
      `Creator attribution failed: ${error.message}`
    );
  }

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
        successfulCollections: 0,
        collections: []
      },

      flags,
      score: 0,
      maxScore: 25,
      errors
    };
  }

  /*
   * STEP 2
   * Resolve OpenSea identity.
   */
  let account = null;

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

  const username =
    account?.username ?? null;

  const ensName =
    account?.ens_name ?? null;

  if (username) {
    flags.push("OPENSEA_USERNAME");
  }

  if (ensName) {
    flags.push("ENS_IDENTITY");
  }

  /*
   * STEP 3
   * Get creator-owned collections.
   */
  let collectionsData = null;

  try {
    collectionsData =
      await getAccountCollections(
        creatorAddress,
        apiKey
      );
  } catch (error) {
    errors.push(
      `Collection history failed: ${error.message}`
    );
  }

  const collections =
    collectionsData?.collections ?? [];

  const ownedCollections =
    collections.length;

  const ownedItems =
    collections.reduce(
      (total, collection) =>
        total +
        Number(
          collection.total_quantity ?? 0
        ),
      0
    );

  const estimatedUsdValue =
    collections.reduce(
      (total, collection) =>
        total +
        Number(
          collection.usd_value ?? 0
        ),
      0
    );

  /*
   * STEP 4
   * Analyze historical collection stats.
   *
   * Intentionally limited to 10 collections
   * per scan.
   */
  const collectionsToAnalyze =
    collections.slice(0, 10);

  let totalVolume = 0;
  let totalSales = 0;
  let totalOwners = 0;
  let bestFloorPrice = 0;
  let bestCollection = null;
  let successfulCollections = 0;
  let analyzedCollections = 0;

  const collectionResults = [];

  for (const collection of collectionsToAnalyze) {
    const slug = collection.collection;

    if (!slug) {
      continue;
    }

    try {
      const stats =
        await getCollectionStats(
          slug,
          apiKey
        );

      const total =
        stats?.total ?? {};

      const volume =
        Number(total.volume ?? 0);

      const sales =
        Number(total.sales ?? 0);

      const owners =
        Number(total.num_owners ?? 0);

      const floorPrice =
        Number(total.floor_price ?? 0);

      totalVolume += volume;
      totalSales += sales;
      totalOwners += owners;

      if (floorPrice > bestFloorPrice) {
        bestFloorPrice = floorPrice;

        bestCollection = {
          name:
            collection.name ?? null,
          slug,
          floorPrice,
          volume,
          sales,
          owners
        };
      }

      if (
        volume >= 5 ||
        sales >= 10 ||
        floorPrice >= 1
      ) {
        successfulCollections += 1;
      }

      collectionResults.push({
        name:
          collection.name ?? null,
        slug,
        volume,
        sales,
        owners,
        floorPrice
      });

      analyzedCollections += 1;
    } catch (error) {
      errors.push(
        `Stats failed for ${slug}: ${error.message}`
      );
    }
  }

  const historicalCollections = {
    collectionCount: ownedCollections,
    analyzedCollections,
    totalVolume:
      Number(totalVolume.toFixed(4)),
    totalSales,
    totalOwners,
    bestFloorPrice:
      Number(bestFloorPrice.toFixed(4)),
    bestCollection,
    successfulCollections,
    collections: collectionResults
  };

  /*
   * STEP 5
   * Creator historical score.
   */
  const score =
    calculateHistoricalScore(
      historicalCollections
    );

  if (successfulCollections > 0) {
    flags.push("SUCCESSFUL_HISTORY");
  }

  if (totalVolume >= 20) {
    flags.push(
      "STRONG_HISTORICAL_VOLUME"
    );
  }

  if (totalSales >= 10) {
    flags.push(
      "MEANINGFUL_SALES_HISTORY"
    );
  }

  if (bestFloorPrice >= 1) {
    flags.push(
      "MEANINGFUL_HISTORICAL_FLOOR"
    );
  }

  const confidence =
    username || ensName
      ? "HIGH"
      : "MEDIUM";

  return {
    status: "IDENTIFIED",

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
      estimatedUsdValue:
        Number(
          estimatedUsdValue.toFixed(2)
        )
    },

    historicalCollections,

    flags,

    score,

    maxScore: 25,

    errors
  };
}
