export function analyzeSocial(candidate) {
  const creator = candidate.creatorIntel;
  const metadata = candidate.metadataIntel;

  const signals = [];
  let score = 0;

  function add(signal, points, reason) {
    signals.push({
      signal,
      points,
      reason
    });
    score += points;
  }

  const username = creator?.identity?.username;
  const ensName = creator?.identity?.ensName;

  /* ==========================================================
   * CREATOR SOCIAL IDENTITY (0–4)
   * ========================================================== */

  if (username) {
    add(
      "OPENSEA_USERNAME",
      2,
      `Creator has OpenSea username "${username}".`
    );
  }

  if (ensName) {
    add(
      "ENS_IDENTITY",
      2,
      `Creator has ENS "${ensName}".`
    );
  }

  /* ==========================================================
   * PROJECT METADATA SIGNALS (0–4)
   * ========================================================== */

  const description =
    metadata?.collection?.description ?? "";

  if (description.length >= 80) {
    add(
      "LONG_PROJECT_DESCRIPTION",
      2,
      "Project has a detailed collection description."
    );
  } else if (description.length > 20) {
    add(
      "PROJECT_DESCRIPTION",
      1,
      "Project has a collection description."
    );
  }

  if (candidate.opensea?.url) {
    add(
      "OPENSEA_COLLECTION_PAGE",
      2,
      "Collection has an OpenSea page."
    );
  }

  /* ==========================================================
   * DOMAIN / TRUST SIGNALS (0–2)
   * ========================================================== */

  const website =
    metadata?.collection?.projectUrl ??
    metadata?.collection?.project_url ??
    "";

  if (website) {
    const lower = website.toLowerCase();

    if (
      lower.includes("vercel.app") ||
      lower.includes("netlify.app")
    ) {
      add(
        "TEMPORARY_DOMAIN",
        0,
        "Project uses a temporary hosting domain."
      );
    } else {
      add(
        "CUSTOM_DOMAIN",
        2,
        "Project uses a custom website domain."
      );
    }
  }

  /* ==========================================================
   * CLASSIFICATION
   * ========================================================== */

  let classification = "LOW_SOCIAL";

  if (score >= 8) {
    classification = "HIGH_SOCIAL";
  } else if (score >= 5) {
    classification = "MEDIUM_SOCIAL";
  }

  return {
    score,
    maxScore: 10,
    classification,
    signals
  };
}
