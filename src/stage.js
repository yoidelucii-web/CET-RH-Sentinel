export function classifyMintStage(stageType) {
  switch (stageType) {
    case "public_sale":
      return "PUBLIC";

    case "presale":
    case "signed_presale":
      return "PRESALE";

    default:
      return "UNKNOWN";
  }
}
