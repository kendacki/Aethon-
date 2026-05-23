const TTL_MS = 10 * 60 * 1000;

const store = new Map<string, { nonce: string; expiresAt: number }>();

export function issueNonce(address: string): string {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  store.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + TTL_MS });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const key = address.toLowerCase();
  const entry = store.get(key);
  if (!entry) return false;
  store.delete(key);
  if (Date.now() > entry.expiresAt) return false;
  return entry.nonce === nonce;
}

export function purgeExpiredNonces(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}
