const OPENSEA_API = "https://api.opensea.io/api/v2";

async function fetchOpenSea(path, apiKey) {
  const response = await fetch(`${OPENSEA_API}${path}`, {
    headers: {
      "X-API-KEY": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(
      `OpenSea API error: ${response.status} ${response.statusText} (${path})`
    );
  }

  return response.json();
}

function normalizeAddress(value) {
  if (typeof value !== "string") return null;

  const address = value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return null;
  }

  return address;
}

function extractAddress(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return normalizeAddress(value);
  }

  if (typeof value === "object") {
    return (
      normalizeAddress(value.address) ||
      normalizeAddress(value.wallet_address) ||
      normalizeAddress(value.owner_address) ||
      normalizeAddress(value.account_address) ||
      null
    );
  }

  return null;
}

function calculateCreatorScore({ identity, attribution }) {
  let score = 0;
  const flags = [];

  if (identity.username) {
    score += 1;
    flags.push("OPENSEA_USERNAME");
  }

  if (identity.ensName) {
    score += 1;
    flags.push("ENS_IDENTITY");
  }

  if (attribution.source === "CONTRACT_OWNER") {
    score += 3;
    flags.push("CONTRACT_OWNER");
  }

  if (attribution.confidence === "HIGH") {
    score += 2;
    flags.push("HIGH_ATTRIBUTION_CONFIDENCE");
  }

  return {
    score: Math.min(score, 25),
    maxScore: 25,
    flags
  };
}

async function getAccountIdentity(address, apiKey) {
  try {
    return await fetchOpenSea(
      `/accounts/resolve/${encodeURIComponent(address)}`,
      apiKey
    );
  } catch {
    return null;
  }
}

async function getAccountCollections(address, apiKey) {
  try {
    return await fetchOpenSea(
      `/account/${encodeURIComponent(address)}/collections`,
      apiKey
    );
  } catch {
    return null;
  }
}

export async function analyzeCreator(
  candidate,
  apiKey = process.env.OPENSEA_API_KEY
) {
  if (!apiKey) {
    throw new Error("Missing OPENSEA_API_KEY");
  }

  const slug = candidate?.identity?.slug;
  const contractAddress = candidate?.identity?.contract;
  const chain = candidate?.identity?.chain;

  if (!slug && !contractAddress) {
    return {
      status: "UNKNOWN",
      address: null,
      identity: {
        username: null,
        ensName: null
      },
      attribution: {
        source: "NONE",
        confidence: "NONE"
      },
      portfolio: {
        ownedCollections: 0,
        ownedItems: 0,
        estimatedUsdValue: 0
      },
      flags: ["NO_CREATOR_LOOKUP_DATA"],
      score: 0,
      maxScore: 25
    };
  }

  let collection = null;
  let contract = null;

  const errors = [];

  if (slug) {
    try {
      collection = await fetchOpenSea(
        `/collections/${encodeURIComponent(slug)}`,
        apiKey
      );
    } catch (error) {
      errors.push({
        source: "collection",
        message: error.message
      });
    }
  }

  if (contractAddress && chain) {
    try {
      contract = await fetchOpenSea(
        `/chain/${encodeURIComponent(chain)}/contract/${encodeURIComponent(
          contractAddress
        )}`,
        apiKey
      );
    } catch (error) {
      errors.push({
        source: "contract",
        message: error.message
      });
    }
  }

  const contractOwner =
    extractAddress(contract?.owner) ||
    normalizeAddress(contract?.owner_address) ||
    extractAddress(collection?.owner) ||
    normalizeAddress(collection?.owner_address);

  if (!contractOwner) {
    return {
      status: "UNKNOWN",
      address: null,
      identity: {
        username: null,
        ensName: null
      },
      attribution: {
        source: "NONE",
        confidence: "NONE"
      },
      portfolio: {
        ownedCollections: 0,
        ownedItems: 0,
        estimatedUsdValue: 0
      },
      flags: ["OWNER_NOT_FOUND"],
      score: 0,
      maxScore: 25,
      errors
    };
  }

  const accountIdentity = await getAccountIdentity(
    contractOwner,
    apiKey
  );

  const accountCollections = await getAccountCollections(
    contractOwner,
    apiKey
  );

  const collections =
    Array.isArray(accountCollections?.collections)
      ? accountCollections.collections
      : [];

  const ownedItems = collections.reduce(
    (total, item) =>
      total + Number(item.item_count ?? 0),
    0
  );

  const estimatedUsdValue = collections.reduce(
    (total, item) =>
      total + Number(item.usd_value ?? 0),
    0
  );

  const identity = {
    username: accountIdentity?.username ?? null,
    ensName: accountIdentity?.ens_name ?? null
  };

  const attribution = {
    source: "CONTRACT_OWNER",
    confidence: "MEDIUM"
  };

  const scoring = calculateCreatorScore({
    identity,
    attribution
  });

  return {
    status: "IDENTIFIED",

    address: contractOwner,

    identity,

    attribution,

    portfolio: {
      ownedCollections: collections.length,
      ownedItems,
      estimatedUsdValue: Number(
        estimatedUsdValue.toFixed(2)
      )
    },

    flags: scoring.flags,

    score: scoring.score,
    maxScore: scoring.maxScore,

    errors
  };
}
