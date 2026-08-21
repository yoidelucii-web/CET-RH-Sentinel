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

const candidates = await Promise.all(
  drops.drops.map(async (drop) => {
    const candidate = normalizeDrop(drop);

    const gates = evaluateHardGates(candidate);

    const stageClass = classifyMintStage(
      candidate.mint.type
    );

    const executionStatus = getExecutionStatus(
      stageClass
    );

    const creatorIntel = await analyzeCreator(
      candidate,
      apiKey
    );

    const metadataIntel = await analyzeMetadata(
      candidate,
      apiKey
    );

    const marketIntel = await analyzeMarket(
      candidate,
      apiKey
    );

    const enrichedCandidate = {
      ...candidate,
      creatorIntel,
      metadataIntel,
      marketIntel
    };

    const riskIntel = calculateRisk(
      enrichedCandidate
    );

    const finalCandidate = {
      ...enrichedCandidate,
      riskIntel
    };

    const scoring = calculateGoldenEggScore(
      finalCandidate
    );

    return {
      ...finalCandidate,
      hardGates: gates,
      stageClassification: stageClass,
      executionStatus,
      goldenEgg: scoring
    };
  })
);

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

console.log("Sentinel report generated.");
console.log(`Candidates: ${candidates.length}`);
