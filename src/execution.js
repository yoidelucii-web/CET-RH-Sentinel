export function getExecutionStatus(stageClassification) {
  if (stageClassification === "PUBLIC") {
    return "EXECUTION_ELIGIBLE";
  }

  return "WATCH_ONLY";
}

export function evaluateExecutionApproval(candidate) {
  const reasons = [];
  const blockers = [];

  const hardGatesPassed =
    candidate?.hardGates?.passed === true;

  const technicalExecution =
    candidate?.executionStatus === "EXECUTION_ELIGIBLE";

  const score =
    Number(candidate?.goldenEgg?.score ?? 0);

  const risk =
    Number(candidate?.riskIntel?.score ?? 40);

  const classification =
    candidate?.goldenEgg?.classification ?? "IGNORE";

  /*
   * ==========================================================
   * HARD GATE
   * ==========================================================
   */

  if (!hardGatesPassed) {
    blockers.push("HARD_GATES_FAILED");
  } else {
    reasons.push("Hard gates passed.");
  }

  /*
   * ==========================================================
   * TECHNICAL EXECUTION
   * ==========================================================
   */

  if (!technicalExecution) {
    blockers.push("NOT_TECHNICALLY_EXECUTABLE");
  } else {
    reasons.push("Mint stage is technically executable.");
  }

  /*
   * ==========================================================
   * GOLDEN EGG SCORE
   * ==========================================================
   */

  if (score < 90) {
    blockers.push("SCORE_BELOW_AUTO_MINT_THRESHOLD");
  } else {
    reasons.push(
      `Golden Egg score ${score}/100 meets auto-mint threshold.`
    );
  }

  /*
   * ==========================================================
   * CLASSIFICATION
   * ==========================================================
   */

  if (
    classification !== "AUTO_MINT_ELIGIBLE"
  ) {
    blockers.push(
      "CLASSIFICATION_NOT_AUTO_MINT_ELIGIBLE"
    );
  } else {
    reasons.push(
      "Golden Egg classification is AUTO_MINT_ELIGIBLE."
    );
  }

  /*
   * ==========================================================
   * RISK
   * ==========================================================
   */

  if (risk > 10) {
    blockers.push("RISK_ABOVE_AUTO_MINT_LIMIT");
  } else {
    reasons.push(
      `Risk score ${risk}/40 is within auto-mint limit.`
    );
  }

  /*
   * ==========================================================
   * FINAL DECISION
   * ==========================================================
   */

  const approved =
    blockers.length === 0;

  return {
    approved,
    status: approved
      ? "AUTO_MINT_APPROVED"
      : "AUTO_MINT_BLOCKED",

    threshold: {
      minScore: 90,
      maxRisk: 10
    },

    score,
    risk,

    classification,

    reasons,
    blockers
  };
}
