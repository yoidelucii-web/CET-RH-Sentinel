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
import { calculateGoldenEggScore } from "./score.js";

const apiKey = process.env.OPENSEA_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENSEA_API_KEY");
}

const drops = await getUpcomingDrops(apiKey);

if (!drops.drops || drops.drops.length === 0) {
  throw new Error("No drops returned by OpenSea");
}

const candidates = [];

for (const drop of drops.drops) {
  const candidate = normalizeDrop(drop);

  const hardGates =
    evaluateHardGates(candidate);

  const stageClassification =
    classifyMintStage(candidate.mint.type);

  const executionStatus =
    getExecutionStatus(stageClassification);

  let creatorIntel;
  let metadataIntel;
  let marketIntel;

  try {
    creatorIntel =
      await analyzeCreator(candidate, apiKey);
  } catch (error) {
    creatorIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  try {
    metadataIntel =
      await analyzeMetadata(candidate, apiKey);
  } catch (error) {
    metadataIntel = {
      status: "ERROR",
      errors: [error.message]
    };
  }

  try {
    marketIntel =
      await analyzeMarket(candidate, apiKey);
  } catch (error) {
    marketIntel = {
      status: "ERROR",
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
    marketIntel
  };

  let riskIntel;

  try {
    riskIntel =
      calculateRisk(enrichedCandidate);
  } catch (error) {
    riskIntel = {
      level: "UNKNOWN",
      score: 0,
      maxRisk: 40,
      penalties: [],
      flags: [],
      context: {},
      errors: [error.message]
    };
  }

  const finalCandidate = {
    ...enrichedCandidate,
    riskIntel
  };

  let goldenEgg;

  try {
    goldenEgg =
      calculateGoldenEggScore(finalCandidate);
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

fs.mkdirSync("./output", {
  recursive: true
});

const report = {
  scanner: "CET RH Sentinel",
  version: "0.2.0",
  network: "robinhood",
  scanTime: new Date().toISOString(),
  totalDrops: candidates.length,
  candidates
};

fs.writeFileSync(
  "./output/sentinel_report.json",
  JSON.stringify(report, null, 2)
);

console.log(
  "CET RH Sentinel report generated."
);

console.log(
  `Candidates: ${candidates.length}`
);

for (const candidate of candidates) {
  console.log(
    `${candidate.identity.name} | ` +
    `${candidate.goldenEgg.score}/100 | ` +
    `${candidate.goldenEgg.classification}`
  );
}
