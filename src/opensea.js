const OPENSEA_API = "https://api.opensea.io/api/v2";

export async function getUpcomingDrops(apiKey) {
  const url =
    `${OPENSEA_API}/drops` +
    `?type=upcoming` +
    `&chains=robinhood` +
    `&limit=20`;

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(
      `OpenSea API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
