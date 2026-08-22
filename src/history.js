import fs from "fs";

const HISTORY_FILE = "./data/scan-history.json";

function ensureDataDirectory() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data", { recursive: true });
  }
}

function loadHistory() {
  ensureDataDirectory();

  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf8");

    if (!raw.trim()) {
      return [];
    }

    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  ensureDataDirectory();

  fs.writeFileSync(
    HISTORY_FILE,
    JSON.stringify(history, null, 2),
    "utf8"
  );
}

function getCollectionKey(candidate) {
  return (
    candidate?.identity?.contract ??
    candidate?.identity?.slug ??
    candidate?.identity?.name ??
    null
  );
}

function number(value) {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

export function getPreviousSnapshot(candidate) {
  const history = loadHistory();

  const key = getCollectionKey(candidate);

  if (!key) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.collectionKey === key) {
      return history[i];
    }
  }

  return null;
}

export function buildMomentum(candidate, previous) {
  const currentMarket = candidate?.marketIntel;
  const currentScore = number(candidate?.goldenEggScore?.score);

  const currentFloor = number(
    currentMarket?.stats?.floorPrice
  );

  const currentVolume = number(
    currentMarket?.stats?.volume
  );

  const currentSales = number(
    currentMarket?.stats?.sales
  );

  const currentOwners = number(
    currentMarket?.stats?.numOwners
  );

  if (!previous) {
    return {
      hasPrevious: false,

      scoreDelta: 0,
      floorDelta: 0,
      volumeDelta: 0,
      salesDelta: 0,
      ownersDelta: 0,

      classification: "NEW"
    };
  }

  const scoreDelta =
    currentScore - number(previous.score);

  const floorDelta =
    currentFloor - number(previous.floor);

  const volumeDelta =
    currentVolume - number(previous.volume);

  const salesDelta =
    currentSales - number(previous.sales);

  const ownersDelta =
    currentOwners - number(previous.owners);

  let classification = "STABLE";

  if (
    scoreDelta >= 10 ||
    volumeDelta >= 100 ||
    salesDelta >= 25 ||
    floorDelta >= 0.25
  ) {
    classification = "BREAKOUT";
  } else if (
    scoreDelta >= 5 ||
    volumeDelta > 0 ||
    salesDelta > 0 ||
    ownersDelta > 0 ||
    floorDelta > 0
  ) {
    classification = "RISING";
  } else if (
    scoreDelta <= -10 ||
    floorDelta < 0 ||
    volumeDelta < 0
  ) {
    classification = "WEAKENING";
  }

  return {
    hasPrevious: true,

    scoreDelta,
    floorDelta,
    volumeDelta,
    salesDelta,
    ownersDelta,

    classification
  };
}

export function recordSnapshot(candidate, momentum) {
  const history = loadHistory();

  const collectionKey =
    getCollectionKey(candidate);

  if (!collectionKey) {
    return;
  }

  const market =
    candidate?.marketIntel;

  const snapshot = {
    timestamp: new Date().toISOString(),

    collectionKey,

    name:
      candidate?.identity?.name ??
      null,

    slug:
      candidate?.identity?.slug ??
      null,

    contract:
      candidate?.identity?.contract ??
      null,

    score:
      number(candidate?.goldenEggScore?.score),

    classification:
      candidate?.goldenEggScore?.classification ??
      null,

    floor:
      number(market?.stats?.floorPrice),

    volume:
      number(market?.stats?.volume),

    sales:
      number(market?.stats?.sales),

    owners:
      number(market?.stats?.numOwners),

    momentum:
      momentum?.classification ??
      "UNKNOWN"
  };

  history.push(snapshot);

  /*
   * Keep the history manageable.
   * Maximum 10,000 snapshots.
   */

  const trimmed =
    history.length > 10000
      ? history.slice(-10000)
      : history;

  saveHistory(trimmed);
}

export function getHistoryStats() {
  const history = loadHistory();

  return {
    snapshots: history.length,
    collections: new Set(
      history
        .map((item) => item.collectionKey)
        .filter(Boolean)
    ).size
  };
}
