/** Natural-language parsers for task payloads (mirrors backend/src/shared/queryParsing.ts). */

const ASSET_ALIASES: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  btc: "bitcoin",
  bitcoin: "bitcoin",
  sol: "solana",
  solana: "solana",
  somnia: "somnia",
  stt: "somnia",
  usdc: "usd-coin",
  usdt: "tether",
};

export function parseAssetFromQuery(query: string): string {
  const q = query.toLowerCase();
  for (const [alias, id] of Object.entries(ASSET_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(q)) return id;
  }
  return "ethereum";
}

export function parseEthAmountFromQuery(query: string, fallback = 1): number {
  const m = query.match(/(\d+(?:\.\d+)?)\s*(?:eth|stt)\b/i);
  if (!m) return fallback;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseProposalFromQuery(query: string): string {
  const spaced = query.match(/\bAIP\s*#?\s*(\d+)\b/i);
  if (spaced) return `AIP-${spaced[1]}`;
  const compact = query.match(/\b(AIP[-_]?\d+)\b/i);
  if (compact) return compact[1].toUpperCase().replace("_", "-");
  return "AIP-1";
}

export function parseGovernanceStakes(query: string): { support: number; against: number; quorum: number } {
  const support = query.match(/(\d+(?:\.\d+)?)\s*stt\s+for\b/i);
  const against = query.match(/(\d+(?:\.\d+)?)\s*stt\s+against\b/i);
  const quorum =
    query.match(/quorum\s+(\d+(?:\.\d+)?)\s*stt\b/i) ?? query.match(/quorum\s+(\d+(?:\.\d+)?)/i);
  return {
    support: support ? Number(support[1]) : 12,
    against: against ? Number(against[1]) : 4,
    quorum: quorum ? Number(quorum[1]) : 10,
  };
}

export function parseMinSpreadBpsFromQuery(query: string, fallback = 15): number {
  const above = query.match(/above\s+(\d+(?:\.\d+)?)\s*bps\b/i);
  if (above) return Math.max(1, Math.round(Number(above[1])));
  const plain = query.match(/(\d+(?:\.\d+)?)\s*bps\b/i);
  if (plain) return Math.max(1, Math.round(Number(plain[1])));
  return fallback;
}

export function parseRiskToleranceFromQuery(query: string): "conservative" | "moderate" | "aggressive" {
  if (/\baggressive\b/i.test(query)) return "aggressive";
  if (/\bconservative\b/i.test(query)) return "conservative";
  return "moderate";
}
