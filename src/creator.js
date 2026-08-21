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

function extractCreatorAddress(collection, contract) {
  const candidates = [
    collection?.creator,
    collection?.owner,
    collection?.creator_address,
    collection?.owner_address,
    contract?.creator,
    contract?.owner,
    contract?.creator_address,
    contract?.owner_address
  ];

  for (const value of candidates) {
    const address = extractAddress(value);

    if (address) {
      return address;
    }
  }

  return null;
}

function calculateCreatorScore({
  creatorAddress,
  collection,
  contract
}) {
  let score = 0;
  const flags = [];

  if (creatorAddress) {
    score += 5;
    flags.push("CREATOR_ADDRESS_FOUND");
  } else {
    flags.push("CREATOR_UNKNOWN");
  }

  const collectionOwner = extractAddress(
    collection?.owner || collection?.owner_address
  );

  if (collectionOwner) {
    score += 2;
    flags.push("COLLECTION_OWNER_FOUND");
  }

  const contractOwner = extractAddress(
    contract?.owner || contract?.owner_address
  );

  if (contractOwner) {
    score += 3;
    flags.push("CONTRACT_OWNER_FOUND");
  }

  return {
    score: Math.min(score, 10),
    maxScore: 10,
    flags
  };
}

export async function analyzeCreator(candidate, apiKey = process.env.OPENSEA_API_KEY) {
  if (!apiKey) {
    throw new Error("Missing OPENSEA_API_KEY");
  }

  const slug = candidate?.identity?.slug;
  const contractAddress = candidate?.identity?.contract;
  const chain = candidate?.identity?.chain;

  if (!slug && !contractAddress) {
    return {
      status: "UNKNOWN",
      creatorAddress: null,
      collection: null,
      contract: null,
      score: 0,
      maxScore: 10,
      flags: ["NO_CREATOR_LOOKUP_DATA"]
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

  const creatorAddress = extractCreatorAddress(collection, contract);

  const scoring = calculateCreatorScore({
    creatorAddress,
    collection,
    contract
  });

  return {
    status: creatorAddress ? "FOUND" : "UNKNOWN",

    creatorAddress,

    collection: {
      name: collection?.name ?? null,
      slug: collection?.slug ?? slug ?? null,
      owner: extractAddress(
        collection?.owner || collection?.owner_address
      ),
      createdDate: collection?.created_date ?? null,
      totalSupply: collection?.total_supply ?? null
    },

    contract: {
      address: contractAddress ?? null,
      chain: chain ?? null,
      standard:
        contract?.contract_standard ??
        contract?.standard ??
        null,
      owner: extractAddress(
        contract?.owner || contract?.owner_address
      ),
      totalSupply:
        contract?.total_supply ??
        contract?.supply ??
        null
    },

    score: scoring.score,
    maxScore: scoring.maxScore,
    flags: scoring.flags,

    errors
  };
}
