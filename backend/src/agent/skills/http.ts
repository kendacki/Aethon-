const FETCH_TIMEOUT_MS = 8000;

export async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSpotUsd(assetId: string): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(assetId)}&vs_currencies=usd`;
  const data = await fetchJson<Record<string, { usd?: number }>>(url);
  const price = data[assetId]?.usd;
  if (typeof price !== "number") throw new Error(`No USD price for ${assetId}`);
  return price;
}
