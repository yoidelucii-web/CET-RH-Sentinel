const OPENSEA_API = "https://api.opensea.io/api/v2";

async function fetchOpenSea(path, apiKey) {
  const response = await fetch(
    `${OPENSEA_API}${path}`,
    {
      headers: {
        "X-API-KEY": apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenSea market API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function analyzeMarket(candidate, apiKey) {
  const slug = candidate?.identity?.slug;

  if (!slug) {
    return {
      status: "NO_SLUG",
      verified: false,
      stats: null,
      errors: ["Missing collection slug."]
    };
  }

  try {
    /*
     * Collection details
     */
    const collection = await fetchOpenSea(
      `/collections/${encodeURIComponent(slug)}`,
      apiKey
    );

    /*
     * Collection stats
     */
    const stats = await fetchOpenSea(
      `/collections/${encodeURIComponent(slug)}/stats`,
      apiKey
    );

    return {
      status: "FOUND",
      verified: true,

      collection: {
        name: collection?.name ?? null,
        slug: collection?.collection ?? slug,
        owner: collection?.owner ?? null,
        category: collection?.category ?? null
      },

      stats: {
        floorPrice: stats?.total?.floor_price ?? null,
        volume: stats?.total?.volume ?? null,
        sales: stats?.total?.sales ?? null,
        averagePrice: stats?.total?.average_price ?? null,
        numOwners: stats?.total?.num_owners ?? null,
        marketCap: stats?.total?.market_cap ?? null
      },

      errors: []
    };
  } catch (error) {
    return {
      status: "ERROR",
      verified: false,
      stats: null,
      errors: [
        error instanceof Error
          ? error.message
          : String(error)
      ]
    };
  }
}
