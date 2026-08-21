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

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeAddress(value) {
  if (typeof value !== "string") return null;

  const address = value.trim();

  return /^0x[a-fA-F0-9]{40}$/.test(address) ? address : null;
}

function extractRoyalties(collection) {
  const candidates = [
    collection?.fees,
    collection?.royalties,
    collection?.royalty
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function extractContractStandard(contract) {
  return (
    contract?.contract_standard ??
    contract?.standard ??
    contract?.contract_type ??
    null
  );
}

function calculateMetadataSignals({
  drop,
  collection,
  contract
}) {
  const signals = [];

  if (drop?.max_supply !== undefined || drop?.maxSupply !== undefined) {
    signals.push("MAX_SUPPLY_PRESENT");
  }

  if (drop?.total_supply !== undefined || drop?.totalSupply !== undefined) {
    signals.push("TOTAL_SUPPLY_PRESENT");
  }

  if (drop?.stages || drop?.active_stage || drop?.next_stage) {
    signals.push("MINT_STAGE_PRESENT");
  }

  if (collection?.fees || collection?.royalties) {
    signals.push("ROYALTY_DATA_PRESENT");
  }

  if (extractContractStandard(contract)) {
    signals.push("CONTRACT_STANDARD_PRESENT");
  }

  return signals;
}

export async function analyzeMetadata(
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

      supply: {
        max: null,
        minted: null,
        remaining: null
      },

      mint: {
        type: candidate?.mint?.type ?? null,
        label: candidate?.mint?.label ?? null,
        priceWei: candidate?.mint?.priceWei ?? null,
        currencyAddress:
          candidate?.mint?.currencyAddress ?? null,
        maxPerWallet:
          candidate?.mint?.maxPerWallet ?? null,
        startTime:
          candidate?.mint?.startTime ?? null,
        endTime:
          candidate?.mint?.endTime ?? null
      },

      royalty: null,

      contract: {
        address: contractAddress ?? null,
        chain: chain ?? null,
        standard: null
      },

      signals: ["NO_METADATA_LOOKUP_DATA"],
      errors: []
    };
  }

  let drop = null;
  let collection = null;
  let contract = null;

  const errors = [];

  /*
   * Drop details:
   * supply + stages + pricing
   */
  if (slug) {
    try {
      drop = await fetchOpenSea(
        `/drops/${encodeURIComponent(slug)}`,
        apiKey
      );
    } catch (error) {
      errors.push({
        source: "drop",
        message: error.message
      });
    }
  }

  /*
   * Collection details:
   * fees + collection metadata
   */
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

  /*
   * Contract details:
   * contract metadata + standard
   */
  if (contractAddress && chain) {
    try {
      contract = await fetchOpenSea(
        `/chain/${encodeURIComponent(
          chain
        )}/contract/${encodeURIComponent(contractAddress)}`,
        apiKey
      );
    } catch (error) {
      errors.push({
        source: "contract",
        message: error.message
      });
    }
  }

  /*
   * Supply
   */
  const maxSupply =
    toNumber(drop?.max_supply) ??
    toNumber(drop?.maxSupply) ??
    null;

  const mintedSupply =
    toNumber(drop?.total_supply) ??
    toNumber(drop?.totalSupply) ??
    null;

  const remainingSupply =
    maxSupply !== null && mintedSupply !== null
      ? Math.max(maxSupply - mintedSupply, 0)
      : null;

  /*
   * Mint information.
   *
   * The drop endpoint may contain multiple stages.
   * We preserve the candidate's current/next stage data
   * rather than guessing which stage is executable.
   */
  const mint = {
    type:
      candidate?.mint?.type ??
      drop?.active_stage?.stage_type ??
      drop?.next_stage?.stage_type ??
      null,

    label:
      candidate?.mint?.label ??
      drop?.active_stage?.label ??
      drop?.next_stage?.label ??
      null,

    priceWei:
      candidate?.mint?.priceWei ??
      drop?.active_stage?.price ??
      drop?.next_stage?.price ??
      null,

    currencyAddress:
      candidate?.mint?.currencyAddress ??
      drop?.active_stage?.price_currency_address ??
      drop?.next_stage?.price_currency_address ??
      null,

    maxPerWallet:
      candidate?.mint?.maxPerWallet ??
      drop?.active_stage?.max_per_wallet ??
      drop?.next_stage?.max_per_wallet ??
      null,

    startTime:
      candidate?.mint?.startTime ??
      drop?.active_stage?.start_time ??
      drop?.next_stage?.start_time ??
      null,

    endTime:
      candidate?.mint?.endTime ??
      drop?.active_stage?.end_time ??
      drop?.next_stage?.end_time ??
      null
  };

  const royalty = extractRoyalties(collection);

  const standard = extractContractStandard(contract);

  const signals = calculateMetadataSignals({
    drop,
    collection,
    contract
  });

  return {
    status:
      drop || collection || contract
        ? "FOUND"
        : "UNKNOWN",

    supply: {
      max: maxSupply,
      minted: mintedSupply,
      remaining: remainingSupply
    },

    mint,

    royalty,

    contract: {
      address: contractAddress ?? null,
      chain: chain ?? null,
      standard
    },

    collection: {
      name:
        collection?.name ??
        candidate?.identity?.name ??
        null,

      slug:
        collection?.slug ??
        slug ??
        null,

      category:
        collection?.category ??
        null,

      description:
        collection?.description ??
        null
    },

    signals,

    errors
  };
}
