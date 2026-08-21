export function normalizeDrop(drop) {
  const stage = drop.active_stage ?? drop.next_stage ?? null;

  return {
    identity: {
      name: drop.collection_name,
      slug: drop.collection_slug,
      contract: drop.contract_address,
      chain: drop.chain
    },

    mint: {
      type: stage?.stage_type ?? null,
      label: stage?.label ?? null,
      priceWei: stage?.price ?? null,
      currencyAddress: stage?.price_currency_address ?? null,
      startTime: stage?.start_time ?? null,
      endTime: stage?.end_time ?? null,
      maxPerWallet: stage?.max_per_wallet ?? null
    },

    opensea: {
      url: drop.opensea_url ?? null
    },

    status: {
      isMinting: drop.is_minting ?? false,
      activeStage: drop.active_stage?.stage_type ?? null,
      nextStage: drop.next_stage?.stage_type ?? null
    }
  };
}
