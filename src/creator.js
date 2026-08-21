const OPENSEA_API = "https://api.opensea.io/api/v2";

async function resolveAccount(address, apiKey) {
  const response = await fetch(
    `${OPENSEA_API}/accounts/resolve/${address}`,
    {
      headers: {
        "X-API-KEY": apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenSea account resolve error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function getAccountCollections(address, apiKey) {
  const response = await fetch(
    `${OPENSEA_API}/accounts/${address}/collections?limit=50`,
    {
      headers: {
        "X-API-KEY": apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenSea account collections error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function getCollectionStats(slug, apiKey) {
  const response = await fetch(
    `${OPENSEA_API}/collections/${slug}/stats`,
    {
      headers: {
        "X-API-KEY": apiKey
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data.total ?? null;
}

function calculateHistoricalMetrics(collections) {
  if (!collections.length) {
    return {
      totalVolume: 0,
      totalSales: 0,
      totalOwners: 0,
      bestFloorPrice: 0,
      bestCollection: null,
      averageVolume: 0,
      averageSales: 0,
      averageOwners: 0,
      medianVolume: 0,
      medianSales: 0,
      medianOwners: 0,
      highVolumeCollections: 0,
      highSalesCollections: 0,
      highFloorCollections: 0,
      activeCollections: 0
    };
  }

  const volumes = collections
    .map((item) => Number(item.volume ?? 0))
    .sort((a, b) => a - b);

  const sales = collections
    .map((item) => Number(item.sales ?? 0))
    .sort((a, b) => a - b);

  const owners = collections
    .map((item) => Number(item.owners ?? 0))
    .sort((a, b) => a - b);

  const totalVolume = volumes.reduce(
    (sum, value) => sum + value,
    0
  );

  const totalSales = sales.reduce(
    (sum, value) => sum + value,
    0
  );

  const totalOwners = owners.reduce(
    (sum, value) => sum + value,
    0
  );

  function median(values) {
    if (!values.length) return 0;

    const middle = Math.floor(values.length / 2);

    if (values.length % 2 === 0) {
      return (
        (values[middle - 1] + values[middle]) / 2
      );
    }

    return values[middle];
  }

  const bestCollection =
    [...collections]
      .sort(
        (a, b) =>
          Number(b.floorPrice ?? 0) -
          Number(a.floorPrice ?? 0)
      )[0] ?? null;

  return {
    totalVolume,
    totalSales,
    totalOwners,

    bestFloorPrice: Number(
      bestCollection?.floorPrice ?? 0
    ),

    bestCollection,

    averageVolume:
      totalVolume / collections.length,

    averageSales:
      totalSales / collections.length,

    averageOwners:
      totalOwners / collections.length,

    medianVolume: median(volumes),
    medianSales: median(sales),
    medianOwners: median(owners),

    highVolumeCollections:
      collections.filter(
        (item) =>
          Number(item.volume ?? 0) >= 100
      ).length,

    highSalesCollections:
      collections.filter(
        (item) =>
          Number(item.sales ?? 0) >= 1000
      ).length,

    highFloorCollections:
      collections.filter(
        (item) =>
          Number(item.floorPrice ?? 0) >= 1
      ).length,

    activeCollections:
      collections.filter(
        (item) =>
          Number(item.volume ?? 0) > 0 ||
          Number(item.sales ?? 0) > 0
      ).length
  };
}

function findCreatorAddress(candidate) {
  return (
    candidate?.creatorAddress ??
    candidate?.metadataIntel?.collection?.owner ??
    candidate?.metadataIntel?.owner ??
    candidate?.identity?.creator ??
    null
  );
}

export async function analyzeCreator(candidate, apiKey) {
  const creatorAddress =
    findCreatorAddress(candidate);

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
        averageVolume: 0,
        averageSales: 0,
        averageOwners: 0,
        medianVolume: 0,
        medianSales: 0,
        medianOwners: 0,
        highVolumeCollections: 0,
        highSalesCollections: 0,
        highFloorCollections: 0,
        activeCollections: 0,
        collections: []
      },
      flags: [],
      score: 0,
      maxScore: 25,
      errors: ["Creator address unavailable"]
    };
  }

  try {
    const account =
      await resolveAccount(
        creatorAddress,
        apiKey
      );

    const collectionsResponse =
      await getAccountCollections(
        creatorAddress,
        apiKey
      );

    const rawCollections =
      collectionsResponse.collections ?? [];

    const analyzedCollections = [];

    for (
      const collection
      of rawCollections.slice(0, 10)
    ) {
      const stats =
        await getCollectionStats(
          collection.collection,
          apiKey
        );

      const total =
        stats ?? {};

      analyzedCollections.push({
        name:
          collection.name ??
          collection.collection,

        slug:
          collection.collection,

        volume:
          Number(total.volume ?? 0),

        sales:
          Number(total.sales ?? 0),

        owners:
          Number(total.num_owners ?? 0),

        floorPrice:
          Number(total.floor_price ?? 0)
      });
    }

    const historicalMetrics =
      calculateHistoricalMetrics(
        analyzedCollections
      );

    const portfolio = {
      ownedCollections:
        rawCollections.length,

      ownedItems:
        Number(
          collectionsResponse.total_items ??
          0
        ),

      estimatedUsdValue:
        Number(
          collectionsResponse.total_usd_value ??
          0
        )
    };

    const flags = [
      "CONTRACT_OWNER"
    ];

    if (account.username) {
      flags.push("OPENSEA_USERNAME");
    }

    if (account.ens_name) {
      flags.push("ENS_IDENTITY");
    }

    if (
      historicalMetrics.activeCollections > 0
    ) {
      flags.push(
        "HISTORICAL_ACTIVITY"
      );
    }

    if (
      historicalMetrics.highVolumeCollections > 0
    ) {
      flags.push(
        "HIGH_VOLUME_HISTORY"
      );
    }

    if (
      historicalMetrics.highSalesCollections > 0
    ) {
      flags.push(
        "HIGH_SALES_HISTORY"
      );
    }

    if (
      historicalMetrics.highFloorCollections > 0
    ) {
      flags.push(
        "HIGH_FLOOR_HISTORY"
      );
    }

    let score = 0;

    if (account.username) {
      score += 2;
    }

    if (account.ens_name) {
      score += 2;
    }

    if (creatorAddress) {
      score += 3;
    }

    if (
      historicalMetrics.activeCollections >= 3
    ) {
      score += 3;
    }

    if (
      historicalMetrics.highVolumeCollections >= 1
    ) {
      score += 3;
    }

    if (
      historicalMetrics.highSalesCollections >= 1
    ) {
      score += 3;
    }

    if (
      historicalMetrics.highFloorCollections >= 1
    ) {
      score += 3;
    }

    if (
      historicalMetrics.totalSales >= 1000
    ) {
      score += 3;
    }

    if (score > 25) {
      score = 25;
    }

    return {
      status: "IDENTIFIED",

      address: creatorAddress,

      identity: {
        username:
          account.username ?? null,

        ensName:
          account.ens_name ?? null
      },

      attribution: {
        source: "CONTRACT_OWNER",
        confidence: "HIGH"
      },

      portfolio,

      historicalCollections: {
        collectionCount:
          rawCollections.length,

        analyzedCollections:
          analyzedCollections.length,

        ...historicalMetrics,

        collections:
          analyzedCollections
      },

      flags,

      score,
      maxScore: 25,

      errors: []
    };
  } catch (error) {
    return {
      status: "ERROR",
      address: creatorAddress,
      identity: {
        username: null,
        ensName: null
      },
      attribution: {
        source: "CONTRACT_OWNER",
        confidence: "MEDIUM"
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
        averageVolume: 0,
        averageSales: 0,
        averageOwners: 0,
        medianVolume: 0,
        medianSales: 0,
        medianOwners: 0,
        highVolumeCollections: 0,
        highSalesCollections: 0,
        highFloorCollections: 0,
        activeCollections: 0,
        collections: []
      },
      flags: [],
      score: 0,
      maxScore: 25,
      errors: [error.message]
    };
  }
}
