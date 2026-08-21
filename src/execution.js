export function getExecutionStatus(stageClassification) {
  switch (stageClassification) {
    case "PUBLIC":
      return "EXECUTION_ELIGIBLE";

    case "PRESALE":
      return "WATCH_ONLY";

    default:
      return "REJECT";
  }
}
