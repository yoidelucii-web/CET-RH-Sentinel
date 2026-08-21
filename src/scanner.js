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
import { buildSummary } from "./summary.js";

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

  try {
    marketIntel = await analyzeMarket(
      {
        ...candidate,
        creatorIntel,
        metadataIntel
      },
      apiKey
    );
  } catch (error) {
    marketIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  try {
    riskIntel = calculateRisk({
      ...candidate,
      creatorIntel,
      metadataIntel,
      marketIntel
    });
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

  const enriched = {
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
    alphaIntel = calculateAlpha(enriched);
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
    walletIntel = analyzeWallet(enriched);
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
    socialIntel = analyzeSocial(enriched);
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
    ...enriched,
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

/* ===========================
 * SUMMARY + RANKING
 * =========================== */

const scanTime = new Date().toISOString();

const summary = buildSummary(candidates, scanTime);

// buildSummary sudah memberi rank & tier
candidates.sort((a, b) => a.rank - b.rank);

/* ===========================
 * REPORT
 * =========================== */

const report = {
  scanner: "CET RH Sentinel",
  version: "1.1.0",
  network: "robinhood",
  scanTime,
  summary,
  candidates
};

fs.mkdirSync("./output", { recursive: true });

fs.writeFileSync(
  "./output/sentinel_report.json",
  JSON.stringify(report, null, 2)
);

/* ===========================
 * CONSOLE OUTPUT
 * =========================== */

console.log("======================================");
console.log("      CET RH SENTINEL v1.1");
console.log("======================================");

console.log(`Scan Time           : ${scanTime}`);
console.log(`Network             : Robinhood`);
console.log(`Total Drops         : ${summary.totalDrops}`);
console.log(`Execution Eligible  : ${summary.executionEligible}`);
console.log(`Watch Only          : ${summary.watchOnly}`);
console.log(`Rejected            : ${summary.reject}`);
console.log("");

console.log(`Average Score       : ${summary.averageScore}`);
console.log(`Top Candidate       : ${summary.topCandidate?.name ?? "None"}`);
console.log("");

console.log("============= TOP FIVE =============");

summary.topFive.forEach((item) => {
  console.log(
    `#${item.rank} [${item.tier}] ${item.name}`
  );
  console.log(`   Score      : ${item.score}`);
  console.log(`   Class      : ${item.classification}`);
  console.log(`   Stage      : ${item.stage}`);
  console.log(`   Execution  : ${item.executionStatus}`);
  console.log("");
});

console.log("======================================");
console.log("Sentinel report generated successfully.");
console.log("Saved -> output/sentinel_report.json");
