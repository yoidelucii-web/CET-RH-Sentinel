import fs from "fs";
import { getUpcomingDrops } from "./opensea.js";
import { normalizeDrop } from "./normalizer.js";
import { evaluateHardGates } from "./gates.js";
import { classifyMintStage } from "./stage.js";
import { getExecutionStatus } from "./execution.js";
import { calculateGoldenEggScore } from "./score.js";

const apiKey = process.env.OPENSEA_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENSEA_API_KEY");
}

const drops = await getUpcomingDrops(apiKey);

console.log("RAW DROP SAMPLE:");
console.log(JSON.stringify(drops.drops?.[0], null, 2));

const candidates = drops.drops.map((drop) => {
  const candidate = normalizeDrop(drop);
  const gates = evaluateHardGates(candidate);
  const stageClass = classifyMintStage(candidate.mint.type);
  const executionStatus = getExecutionStatus(stageClass);
  const scoring = calculateGoldenEggScore(candidate);

  return {
    ...candidate,
    hardGates: gates,
    stageClassification: stageClass,
    executionStatus,
    goldenEgg: scoring
  };
});

const report = {
  scanner: "CET RH Sentinel",
  version: "0.1.0",
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
