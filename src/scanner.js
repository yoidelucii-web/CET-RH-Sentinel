import fs from "fs";

import { getUpcomingDrops } from "./opensea.js";
import { normalizeDrop } from "./normalizer.js";
import { evaluateHardGates } from "./gates.js";

import {
  classifyMintStage
} from "./stage.js";

import {
  getExecutionStatus,
  evaluateExecutionApproval
} from "./execution.js";

import {
  analyzeCreator
} from "./creator.js";

import {
  analyzeMetadata
} from "./metadata.js";

import {
  analyzeMarket
} from "./market.js";

import {
  calculateRisk
} from "./risk.js";

import {
  calculateAlpha
} from "./alpha.js";

import {
  analyzeWallet
} from "./wallet.js";

import {
  analyzeSocial
} from "./social.js";

import {
  calculateGoldenEggScore
} from "./score.js";

import {
  buildSummary
} from "./summary.js";

import {
  getPreviousSnapshot,
  buildMomentum,
  recordSnapshot
} from "./history.js";


/* ==========================================================
 * CONFIGURATION
 * ========================================================== */

const apiKey = process.env.OPENSEA_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing OPENSEA_API_KEY"
  );
}


/* ==========================================================
 * FETCH DROPS
 * ========================================================== */

const drops = await getUpcomingDrops(
  apiKey
);

if (
  !drops ||
  !Array.isArray(drops.drops) ||
  drops.drops.length === 0
) {
  throw new Error(
    "No drops returned by OpenSea."
  );
}


/* ==========================================================
 * PROCESS CANDIDATES
 * ========================================================== */

const candidates = [];


for (const drop of drops.drops) {

  /* ----------------------------------------------------------
   * NORMALIZE
   * ---------------------------------------------------------- */

  const candidate =
    normalizeDrop(drop);


  /* ----------------------------------------------------------
   * HARD GATES
   * ---------------------------------------------------------- */

  const hardGates =
    evaluateHardGates(candidate);


  /* ----------------------------------------------------------
   * MINT STAGE
   * ---------------------------------------------------------- */

  const stageClassification =
    classifyMintStage(
      candidate.mint?.type
    );


  /* ----------------------------------------------------------
   * TECHNICAL EXECUTION STATUS
   * ---------------------------------------------------------- */

  const executionStatus =
    getExecutionStatus(
      stageClassification
    );


  /* ----------------------------------------------------------
   * CREATOR INTELLIGENCE
   * ---------------------------------------------------------- */

  let creatorIntel;

  try {

    creatorIntel =
      await analyzeCreator(
        candidate,
        apiKey
      );

  } catch (error) {

    creatorIntel = {
      status: "ERROR",
      address: null,

      identity: {
        username: null,
        ensName: null
      },

      attribution: {
        source: "UNAVAILABLE",
        confidence: "LOW"
      },

      portfolio: {
        ownedCollections: 0,
        ownedItems: 0,
        estimatedUsdValue: 0
      },

      historicalCollections: {
        collectionCount: 0,
        analyzedCollections: 0,
        totalVolume: 0,
        totalSales: 0,
        totalOwners: 0,
        bestFloorPrice: 0,
        bestCollection: null,
        successfulCollections: 0,
        collections: []
      },

      flags: [],

      score: 0,
      maxScore: 25,

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * METADATA INTELLIGENCE
   * ---------------------------------------------------------- */

  let metadataIntel;

  try {

    metadataIntel =
      await analyzeMetadata(
        candidate,
        apiKey
      );

  } catch (error) {

    metadataIntel = {
      status: "ERROR",

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * MARKET INTELLIGENCE
   * ---------------------------------------------------------- */

  let marketIntel;

  try {

    marketIntel =
      await analyzeMarket(
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
      verified: false,

      collection: {},

      stats: {
        floorPrice: 0,
        volume: 0,
        sales: 0,
        averagePrice: null,
        numOwners: 0,
        marketCap: null
      },

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * RISK INTELLIGENCE
   * ---------------------------------------------------------- */

  let riskIntel;

  try {

    riskIntel =
      calculateRisk(
        {
          ...candidate,
          creatorIntel,
          metadataIntel,
          marketIntel
        }
      );

  } catch (error) {

    riskIntel = {
      level: "UNKNOWN",
      score: 40,
      maxRisk: 40,

      penalties: [],
      flags: [],

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * ENRICHED CANDIDATE
   * ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
   * ALPHA INTELLIGENCE
   * ---------------------------------------------------------- */

  let alphaIntel;

  try {

    alphaIntel =
      calculateAlpha(
        enrichedCandidate
      );

  } catch (error) {

    alphaIntel = {

      score: 0,
      maxScore: 10,

      classification: "ERROR",

      signals: [],

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * WALLET INTELLIGENCE
   * ---------------------------------------------------------- */

  let walletIntel;

  try {

    walletIntel =
      analyzeWallet(
        enrichedCandidate
      );

  } catch (error) {

    walletIntel = {

      score: 0,
      maxScore: 10,

      classification: "ERROR",

      signals: [],

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * SOCIAL INTELLIGENCE
   * ---------------------------------------------------------- */

  let socialIntel;

  try {

    socialIntel =
      analyzeSocial(
        enrichedCandidate
      );

  } catch (error) {

    socialIntel = {

      score: 0,
      maxScore: 10,

      classification: "ERROR",

      signals: [],

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * FINAL ENRICHED CANDIDATE
   * ---------------------------------------------------------- */

  const finalCandidate = {

    ...enrichedCandidate,

    alphaIntel,

    walletIntel,

    socialIntel
  };


  /* ----------------------------------------------------------
   * GOLDEN EGG SCORE
   * ---------------------------------------------------------- */

  let goldenEgg;

  try {

    goldenEgg =
      calculateGoldenEggScore(
        finalCandidate
      );

  } catch (error) {

    goldenEgg = {

      score: 0,
      maxScore: 100,

      classification: "ERROR",

      breakdown: [],

      errors: [
        error.message
      ]
    };
  }


  /* ----------------------------------------------------------
   * ATTACH GOLDEN EGG SCORE
   * ---------------------------------------------------------- */

  const scoredCandidate = {

    ...finalCandidate,

    goldenEggScore: goldenEgg,

    goldenEgg
  };


  /* ----------------------------------------------------------
   * MOMENTUM / HISTORY
   * ---------------------------------------------------------- */

  const previousSnapshot =
    getPreviousSnapshot(
      scoredCandidate
    );

  const momentum =
    buildMomentum(
      scoredCandidate,
      previousSnapshot
    );


  /* ----------------------------------------------------------
   * EXECUTION APPROVAL
   * ---------------------------------------------------------- */

  const executionApproval =
    evaluateExecutionApproval(
      {
        ...scoredCandidate
      }
    );


  /* ----------------------------------------------------------
   * STORE FINAL CANDIDATE
   * ---------------------------------------------------------- */

  const finalStoredCandidate = {

    ...scoredCandidate,

    momentum,

    executionApproval
  };


  candidates.push(
    finalStoredCandidate
  );


  /* ----------------------------------------------------------
   * RECORD HISTORY
   * ---------------------------------------------------------- */

  try {

    recordSnapshot(
      scoredCandidate,
      momentum
    );

  } catch (error) {

    console.error(
      "History error for " +
      (
        scoredCandidate.identity?.name ??
        "Unknown"
      ) +
      ": " +
      error.message
    );
  }
}


/* ==========================================================
 * SCAN TIME
 * ========================================================== */

const scanTime =
  new Date().toISOString();


/* ==========================================================
 * SUMMARY
 * ========================================================== */

const summary =
  buildSummary(
    candidates,
    scanTime
  );


/* ==========================================================
 * RANK CANDIDATES
 * ========================================================== */

candidates.sort(
  (a, b) =>
    (a.rank ?? 999) -
    (b.rank ?? 999)
);


/* ==========================================================
 * EXECUTION SUMMARY
 * ========================================================== */

const autoMintApproved =
  candidates.filter(
    (candidate) =>
      candidate.executionApproval?.status ===
      "AUTO_MINT_APPROVED"
  ).length;


const autoMintBlocked =
  candidates.filter(
    (candidate) =>
      candidate.executionApproval?.status ===
      "AUTO_MINT_BLOCKED"
  ).length;


/* ==========================================================
 * MOMENTUM SUMMARY
 * ========================================================== */

const breakoutCandidates =
  candidates.filter(
    (candidate) =>
      candidate.momentum?.classification ===
      "BREAKOUT"
  ).length;


const risingCandidates =
  candidates.filter(
    (candidate) =>
      candidate.momentum?.classification ===
      "RISING"
  ).length;


/* ==========================================================
 * FINAL REPORT
 * ========================================================== */

const report = {

  scanner:
    "CET RH Sentinel",

  version:
    "1.3.0",

  network:
    "robinhood",

  scanTime,

  executionPolicy: {

    autoMintMinScore: 90,

    autoMintMaxRisk: 10,

    hardGatesRequired: true,

    technicalExecutionRequired: true
  },

  momentumPolicy: {

    breakoutScoreDelta: 10,

    breakoutVolumeDelta: 100,

    breakoutSalesDelta: 25,

    breakoutFloorDelta: 0.25
  },

  summary: {

    ...summary,

    autoMintApproved,

    autoMintBlocked,

    breakoutCandidates,

    risingCandidates
  },

  candidates
};


/* ==========================================================
 * OUTPUT DIRECTORY
 * ========================================================== */

fs.mkdirSync(
  "./output",
  {
    recursive: true
  }
);


/* ==========================================================
 * SAVE REPORT
 * ========================================================== */

fs.writeFileSync(

  "./output/sentinel_report.json",

  JSON.stringify(
    report,
    null,
    2
  )
);


/* ==========================================================
 * CONSOLE OUTPUT
 * ========================================================== */

console.log(
  "======================================"
);

console.log(
  "      CET RH SENTINEL v1.3"
);

console.log(
  "======================================"
);

console.log(
  `Scan Time           : ${scanTime}`
);

console.log(
  `Network             : Robinhood`
);

console.log(
  `Total Drops         : ${summary.totalDrops}`
);

console.log(
  `Execution Eligible  : ${summary.executionEligible}`
);

console.log(
  `Watch Only          : ${summary.watchOnly}`
);

console.log(
  `Rejected            : ${summary.reject}`
);

console.log(
  `Auto Mint Approved  : ${autoMintApproved}`
);

console.log(
  `Auto Mint Blocked   : ${autoMintBlocked}`
);

console.log(
  `Breakout Candidates : ${breakoutCandidates}`
);

console.log(
  `Rising Candidates   : ${risingCandidates}`
);

console.log(
  `Average Score       : ${summary.averageScore}`
);

console.log(
  `Top Candidate       : ${
    summary.topCandidate?.name ??
    "None"
  }`
);

console.log("");

console.log(
  "============= TOP FIVE ============="
);

summary.topFive.forEach(
  (item) => {

    const candidate =
      candidates.find(
        (c) =>
          c.rank === item.rank
      );

    console.log(
      `#${item.rank} [${item.tier}] ${item.name}`
    );

    console.log(
      `   Score      : ${item.score}`
    );

    console.log(
      `   Class      : ${item.classification}`
    );

    console.log(
      `   Stage      : ${item.stage}`
    );

    console.log(
      `   Execution  : ${item.executionStatus}`
    );

    console.log(
      `   Momentum   : ${
        candidate?.momentum?.classification ??
        "UNKNOWN"
      }`
    );

    console.log(
      `   Score Δ    : ${
        candidate?.momentum?.scoreDelta ??
        0
      }`
    );

    console.log(
      `   Floor Δ    : ${
        candidate?.momentum?.floorDelta ??
        0
      }`
    );

    console.log(
      `   Volume Δ   : ${
        candidate?.momentum?.volumeDelta ??
        0
      }`
    );

    console.log(
      `   Sales Δ    : ${
        candidate?.momentum?.salesDelta ??
        0
      }`
    );

    console.log(
      `   Auto Mint  : ${
        candidate?.executionApproval?.status ??
        "UNKNOWN"
      }`
    );

    if (
      candidate?.executionApproval?.blockers?.length
    ) {

      console.log(
        `   Blockers   : ${
          candidate.executionApproval.blockers.join(
            ", "
          )
        }`
      );
    }

    console.log("");
  }
);


console.log(
  "======================================"
);

console.log(
  "Sentinel report generated successfully."
);

console.log(
  "Saved -> output/sentinel_report.json"
);

console.log(
  "History -> data/scan-history.json"
);
