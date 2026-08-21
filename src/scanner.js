import fs from "fs";

import { getUpcomingDrops } from "./opensea.js";
import { normalizeDrop } from "./normalizer.js";
import { evaluateHardGates } from "./gates.js";
import { classifyMintStage } from "./stage.js";
import { getExecutionStatus } from "./execution.js";

import { analyzeCreator } from "./creator.js";
import { analyzeMetadata } from "./metadata.js";
import { analyzeMarket } from "./market.js";

import { calculateRisk } from "./risk.js";
import { calculateAlpha } from "./alpha.js";
import { analyzeWallet } from "./wallet.js";
import { analyzeSocial } from "./social.js";

import { calculateGoldenEggScore } from "./score.js";

const apiKey = process.env.OPENSEA_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENSEA_API_KEY");
}

const drops = await getUpcomingDrops(apiKey);

if (!drops.drops || drops.drops.length === 0) {
  throw new Error("No drops returned by OpenSea.");
}

const candidates = [];

for (const drop of drops.drops) {
  const candidate = normalizeDrop(drop);

  const hardGates = evaluateHardGates(candidate);

  const stageClassification = classifyMintStage(candidate.mint.type);

  const executionStatus = getExecutionStatus(stageClassification);

  let creatorIntel = {};
  let metadataIntel = {};
  let marketIntel = {};
  let riskIntel = {};
  let alphaIntel = {};
  let walletIntel = {};
  let socialIntel = {};
  let goldenEgg = {};

  try {
    creatorIntel = await analyzeCreator(candidate, apiKey);
  } catch (error) {
    creatorIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  try {
    metadataIntel = await analyzeMetadata(candidate, apiKey);
  } catch (error) {
    metadataIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  const creatorCandidate = {
    ...candidate,
    creatorIntel,
    metadataIntel
  };

  try {
    marketIntel = await analyzeMarket(creatorCandidate, apiKey);
  } catch (error) {
    marketIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  const riskCandidate = {
    ...creatorCandidate,
    marketIntel
  };

  try {
    riskIntel = calculateRisk(riskCandidate);
  } catch (error) {
    riskIntel = {
      level: "UNKNOWN",
      score: 40,
      maxRisk: 40,
      penalties: [],
      flags: [],
      errors: [error.message]
    };
  }

  const enrichedCandidate = {
    ...candidate,
    hardGates,
    stageClassification,
    executionStatus,
    creatorIntel,
    metadataIntel,
    marketIntel,
    riskIntel
  };

  try {
    alphaIntel = calculateAlpha(enrichedCandidate);
  } catch (error) {
    alphaIntel = {
      score: 0,
      maxScore: 10,
      classification: "ERROR",
      signals: [],
      errors: [error.message]
    };
  }

  try {
    walletIntel = analyzeWallet(enrichedCandidate);
  } catch (error) {
    walletIntel = {
      score: 0,
      maxScore: 10,
      classification: "ERROR",
      signals: [],
      errors: [error.message]
    };
  }

  try {
    socialIntel = analyzeSocial(enrichedCandidate);
  } catch (error) {
    socialIntel = {
      score: 0,
      maxScore: 10,
      classification: "ERROR",
      signals: [],
      errors: [error.message]
    };
  }

  const finalCandidate = {
    ...enrichedCandidate,
    alphaIntel,
    walletIntel,
    socialIntel
  };

  try {
    goldenEgg = calculateGoldenEggScore(finalCandidate);
  } catch (error) {
    goldenEgg = {
      score: 0,
      maxScore: 100,
      classification: "ERROR",
      breakdown: [],
      errors: [error.message]
    };
  }

  candidates.push({
    ...finalCandidate,
    goldenEgg
  });
}

/* ============================================================
 * SORT BY SCORE
 * ============================================================
 */

candidates.sort(
  (a, b) => b.goldenEgg.score - a.goldenEgg.score
);

/* ============================================================
 * SUMMARY
 * ============================================================
 */

const summary = {
  totalDrops: candidates.length,

  autoMintEligible: candidates.filter(
    (c) =>
      c.goldenEgg.classification ===
      "AUTO_MINT_ELIGIBLE"
  ).length,

  alphaCandidates: candidates.filter(
    (c) =>
      c.goldenEgg.classification ===
      "ALPHA_CANDIDATE"
  ).length,

  watchlist: candidates.filter(
    (c) =>
      c.goldenEgg.classification ===
      "WATCHLIST"
  ).length,

  ignore: candidates.filter(
    (c) =>
      c.goldenEgg.classification ===
      "IGNORE"
  ).length
};

/* ============================================================
 * REPORT
 * ============================================================
 */

const report = {
  scanner: "CET RH Sentinel",
  version: "1.0.0",
  network: "robinhood",
  scanTime: new Date().toISOString(),

  summary,

  candidates
};

fs.mkdirSync("./output", {
  recursive: true
});

fs.writeFileSync(
  "./output/sentinel_report.json",
  JSON.stringify(report, null, 2)
);

/* ============================================================
 * CONSOLE OUTPUT
 * ============================================================
 */

console.log("=====================================");
console.log("CET RH Sentinel v1.0");
console.log("=====================================");
console.log(`Total Drops          : ${summary.totalDrops}`);
console.log(
  `AUTO_MINT_ELIGIBLE  : ${summary.autoMintEligible}`
);
console.log(
  `ALPHA_CANDIDATE     : ${summary.alphaCandidates}`
);
console.log(
  `WATCHLIST           : ${summary.watchlist}`
);
console.log(
  `IGNORE              : ${summary.ignore}`
);

console.log("");
console.log("===== TOP CANDIDATES =====");

candidates.forEach((candidate, index) => {
  console.log(
    `${index + 1}. ${candidate.identity.name}`
  );

  console.log(
    `   Score      : ${candidate.goldenEgg.score}/100`
  );

  console.log(
    `   Class      : ${candidate.goldenEgg.classification}`
  );

  console.log(
    `   Stage      : ${candidate.stageClassification}`
  );

  console.log(
    `   Execution  : ${candidate.executionStatus}`
  );

  console.log(
    `   Risk       : ${candidate.riskIntel.level} (${candidate.riskIntel.score}/${candidate.riskIntel.maxRisk})`
  );

  console.log(
    `   Alpha      : ${candidate.alphaIntel.score}/${candidate.alphaIntel.maxScore}`
  );

  console.log(
    `   Wallet     : ${candidate.walletIntel.classification} (${candidate.walletIntel.score}/10)`
  );

  console.log(
    `   Social     : ${candidate.socialIntel.classification} (${candidate.socialIntel.score}/10)`
  );

  console.log("");
});

console.log("Sentinel report generated.");
console.log("Saved to output/sentinel_report.json");
