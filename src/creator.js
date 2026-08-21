const OPENSEA_API = "https://api.opensea.io/api/v2";

/* ============================================================
 * Generic OpenSea Fetch
 * ============================================================
 */

async function fetchOpenSea(path, apiKey) {
  const response = await fetch(`${OPENSEA_API}${path}`, {
    headers: {
      "X-API-KEY": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(
      `OpenSea API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/* ============================================================
 * Resolve creator identity
 * ============================================================
 */

async function resolveAccount(address, apiKey) {
  return fetchOpenSea(`/accounts/resolve/${address}`, apiKey);
}

/* ============================================================
 * Creator portfolio (FIXED ENDPOINT)
 * ============================================================
 */

async function getAccountCollections(address, apiKey) {
  return fetchOpenSea(`/account/${address}/collections`, apiKey);
}

/* ============================================================
 * Collection statistics
 * ============================================================
 */

async function getCollectionStats(slug, apiKey) {
  try {
    const stats = await fetchOpenSea(
      `/collections/${encodeURIComponent(slug)}/stats`,
      apiKey
    );

    return stats.total ?? null;
  } catch {
    return null;
  }
}

/* ============================================================
 * Historical metrics calculator
 * ============================================================
 */

function median(values) {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function buildHistoricalMetrics(collections) {
  if (!collections.length) {
    return {
      collectionCount: 0,
      analyzedCollections: 0,

      totalVolume: 0,
      totalSales: 0,
      totalOwners: 0,

      averageVolume: 0,
      averageSales: 0,
      averageOwners: 0,

      medianVolume: 0,
      medianSales: 0,
      medianOwners: 0,

      bestFloorPrice: 0,
      bestCollection: null,

      activeCollections: 0,
      highVolumeCollections: 0,
      highSalesCollections: 0,
      highFloorCollections: 0,

      collections: []
    };
  }

  const volumes = collections.map((c) => c.volume);
  const sales = collections.map((c) => c.sales);
  const owners = collections.map((c) => c.owners);

  const totalVolume = volumes.reduce((a, b) => a + b, 0);
  const totalSales = sales.reduce((a, b) => a + b, 0);
  const totalOwners = owners.reduce((a, b) => a + b, 0);

  const bestCollection =
    [...collections].sort((a, b) => b.floorPrice - a.floorPrice)[0] ?? null;

  return {
    collectionCount: collections.length,
    analyzedCollections: collections.length,

    totalVolume: Number(totalVolume.toFixed(4)),
    totalSales,
    totalOwners,

    averageVolume: Number((totalVolume / collections.length).toFixed(4)),
    averageSales: Number((totalSales / collections.length).toFixed(2)),
    averageOwners: Number((totalOwners / collections.length).toFixed(2)),

    medianVolume: Number(median(volumes).toFixed(4)),
    medianSales: Number(median(sales).toFixed(2)),
    medianOwners: Number(median(owners).toFixed(2)),

    bestFloorPrice: Number((bestCollection?.floorPrice ?? 0).toFixed(4)),
    bestCollection,

    activeCollections: collections.filter(
      (c) => c.volume > 0 || c.sales > 0
    ).length,

    highVolumeCollections: collections.filter((c) => c.volume >= 100).length,

    highSalesCollections: collections.filter((c) => c.sales >= 1000).length,

    highFloorCollections: collections.filter((c) => c.floorPrice >= 1).length,

    collections
  };
}

/* ============================================================
 * Creator score (0–25)
 * ============================================================
 */

function calculateCreatorScore(metrics, username, ensName) {
  let score = 0;

  if (username) score += 2;
  if (ensName) score += 2;

  score += 3; // creator identified

  if (metrics.activeCollections >= 3) score += 3;
  if (metrics.highVolumeCollections >= 1) score += 3;
  if (metrics.highSalesCollections >= 1) score += 3;
  if (metrics.highFloorCollections >= 1) score += 3;

  if (metrics.totalSales >= 1000) score += 3;
  if (metrics.totalVolume >= 500) score += 3;

  return Math.min(score, 25);
}

/* ============================================================
 * Main Creator Intelligence
 * ============================================================
 */

export async function analyzeCreator(candidate, apiKey) {
  const errors = [];
  const flags = [];

  const slug = candidate.identity?.slug;

  if (!slug) {
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
      historicalCollections: buildHistoricalMetrics([]),
      flags: [],
      score: 0,
      maxScore: 25,
      errors: ["Collection slug unavailable."]
    };
  }

  try {
    /*
     * STEP 1
     * Resolve creator from collection owner.
     */

    const collection = await fetchOpenSea(
      `/collections/${encodeURIComponent(slug)}`,
      apiKey
    );

    const creatorAddress = collection.owner;

    if (!creatorAddress) {
      throw new Error("Creator owner unavailable.");
    }

    flags.push("CONTRACT_OWNER");

    /*
     * STEP 2
     * Resolve username / ENS.
     */

    let username = null;
    let ensName = null;

    try {
      const account = await resolveAccount(creatorAddress, apiKey);

      username = account.username ?? null;
      ensName = account.ens_name ?? null;

      if (username) flags.push("OPENSEA_USERNAME");
      if (ensName) flags.push("ENS_IDENTITY");
    } catch (error) {
      errors.push(error.message);
    }

    /*
     * STEP 3
     * Portfolio collections.
     */

    const portfolioData = await getAccountCollections(
      creatorAddress,
      apiKey
    );

    const portfolioCollections = portfolioData.collections ?? [];

    const ownedItems = portfolioCollections.reduce(
      (sum, collection) => sum + Number(collection.total_quantity ?? 0),
      0
    );

    const estimatedUsdValue = portfolioCollections.reduce(
      (sum, collection) => sum + Number(collection.usd_value ?? 0),
      0
    );

    /*
     * STEP 4
     * Analyze first 10 historical collections.
     */

    const analyzed = [];

    for (const item of portfolioCollections.slice(0, 10)) {
      const stats = await getCollectionStats(item.collection, apiKey);

      analyzed.push({
        name: item.name ?? item.collection,
        slug: item.collection,

        volume: Number(stats?.volume ?? 0),
        sales: Number(stats?.sales ?? 0),
        owners: Number(stats?.num_owners ?? 0),
        floorPrice: Number(stats?.floor_price ?? 0)
      });
    }

    const metrics = buildHistoricalMetrics(analyzed);

    if (metrics.activeCollections > 0) {
      flags.push("HISTORICAL_ACTIVITY");
    }

    if (metrics.highVolumeCollections > 0) {
      flags.push("HIGH_VOLUME_HISTORY");
    }

    if (metrics.highSalesCollections > 0) {
      flags.push("HIGH_SALES_HISTORY");
    }

    if (metrics.highFloorCollections > 0) {
      flags.push("HIGH_FLOOR_HISTORY");
    }

    const score = calculateCreatorScore(metrics, username, ensName);

    return {
      status: "IDENTIFIED",

      address: creatorAddress,

      identity: {
        username,
        ensName
      },

      attribution: {
        source: "CONTRACT_OWNER",
        confidence: username || ensName ? "HIGH" : "MEDIUM"
      },

      portfolio: {
        ownedCollections: portfolioCollections.length,
        ownedItems,
        estimatedUsdValue: Number(estimatedUsdValue.toFixed(2))
      },

      historicalCollections: {
        collectionCount: portfolioCollections.length,
        analyzedCollections: metrics.analyzedCollections,

        totalVolume: metrics.totalVolume,
        totalSales: metrics.totalSales,
        totalOwners: metrics.totalOwners,

        averageVolume: metrics.averageVolume,
        averageSales: metrics.averageSales,
        averageOwners: metrics.averageOwners,

        medianVolume: metrics.medianVolume,
        medianSales: metrics.medianSales,
        medianOwners: metrics.medianOwners,

        bestFloorPrice: metrics.bestFloorPrice,
        bestCollection: metrics.bestCollection,

        activeCollections: metrics.activeCollections,
        highVolumeCollections: metrics.highVolumeCollections,
        highSalesCollections: metrics.highSalesCollections,
        highFloorCollections: metrics.highFloorCollections,

        collections: metrics.collections
      },

      flags,

      score,
      maxScore: 25,

      errors
    };
  } catch (error) {
    return {
      status: "ERROR",

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

      historicalCollections: buildHistoricalMetrics([]),

      flags,

      score: 0,
      maxScore: 25,

      errors: [error.message]
    };
  }
}
