export function buildSummary(candidates, scanTime) {
  // Salin array supaya tidak mengubah referensi asli.
  const ranked = [...candidates].sort(
    (a, b) => b.goldenEgg.score - a.goldenEgg.score
  );

  // Tambahkan rank + tier.
  ranked.forEach((candidate, index) => {
    candidate.rank = index + 1;

    const score = candidate.goldenEgg.score;

    if (score >= 95) {
      candidate.tier = "S";
    } else if (score >= 90) {
      candidate.tier = "A";
    } else if (score >= 80) {
      candidate.tier = "B";
    } else if (score >= 70) {
      candidate.tier = "C";
    } else {
      candidate.tier = "D";
    }
  });

  const totalDrops = ranked.length;

  const executionEligible = ranked.filter(
    (c) => c.executionStatus === "EXECUTION_ELIGIBLE"
  ).length;

  const watchOnly = ranked.filter(
    (c) => c.executionStatus === "WATCH_ONLY"
  ).length;

  const reject = ranked.filter(
    (c) => c.executionStatus === "REJECT"
  ).length;

  const autoMintEligible = ranked.filter(
    (c) => c.goldenEgg.classification === "AUTO_MINT_ELIGIBLE"
  ).length;

  const alphaCandidates = ranked.filter(
    (c) => c.goldenEgg.classification === "ALPHA_CANDIDATE"
  ).length;

  const watchlist = ranked.filter(
    (c) => c.goldenEgg.classification === "WATCHLIST"
  ).length;

  const ignore = ranked.filter(
    (c) => c.goldenEgg.classification === "IGNORE"
  ).length;

  const averageScore =
    totalDrops === 0
      ? 0
      : Number(
          (
            ranked.reduce(
              (sum, candidate) =>
                sum + candidate.goldenEgg.score,
              0
            ) / totalDrops
          ).toFixed(2)
        );

  const topCandidate = ranked[0]
    ? {
        name: ranked[0].identity.name,
        slug: ranked[0].identity.slug,
        score: ranked[0].goldenEgg.score,
        classification:
          ranked[0].goldenEgg.classification,
        executionStatus:
          ranked[0].executionStatus
      }
    : null;

  return {
    scanTime,
    network: "robinhood",

    totalDrops,

    executionEligible,
    watchOnly,
    reject,

    autoMintEligible,
    alphaCandidates,
    watchlist,
    ignore,

    averageScore,

    topCandidate,

    topFive: ranked.slice(0, 5).map((candidate) => ({
      rank: candidate.rank,
      tier: candidate.tier,
      name: candidate.identity.name,
      score: candidate.goldenEgg.score,
      classification:
        candidate.goldenEgg.classification,
      stage: candidate.stageClassification,
      executionStatus:
        candidate.executionStatus
    })),

    scoreDistribution: {
      sTier: ranked.filter((c) => c.tier === "S").length,
      aTier: ranked.filter((c) => c.tier === "A").length,
      bTier: ranked.filter((c) => c.tier === "B").length,
      cTier: ranked.filter((c) => c.tier === "C").length,
      dTier: ranked.filter((c) => c.tier === "D").length
    },

    averageRisk:
      totalDrops === 0
        ? 0
        : Number(
            (
              ranked.reduce(
                (sum, candidate) =>
                  sum +
                  Number(candidate.riskIntel.score ?? 0),
                0
              ) / totalDrops
            ).toFixed(2)
          )
  };
}
