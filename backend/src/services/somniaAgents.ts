import { ethers } from "ethers";

/** Somnia Agents platform on Shannon testnet */
export const SOMNIA_AGENTS_PLATFORM =
  process.env.SOMNIA_AGENTS_PLATFORM_ADDR ?? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

export const JSON_API_AGENT_ID = 13174292974160097713n;

export function somniaReceiptUrl(requestId: number | bigint | string): string {
  const id = String(requestId);
  const base =
    process.env.SOMNIA_RECEIPTS_BASE ??
    "https://agents.testnet.somnia.network/receipts";
  return `${base}/${id}`;
}

export function somniaReceiptApiUrl(requestId: number | bigint | string): string {
  const id = String(requestId);
  const platform = SOMNIA_AGENTS_PLATFORM;
  return `https://receipts.testnet.agents.somnia.host/agent-receipts?contractAddress=${platform}&requestId=${id}`;
}

export function isOraclePayload(payload: unknown): payload is { primaryRole: string; params: { asset?: string } } {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return p.primaryRole === "ORACLE";
}

export function coinIdFromOraclePayload(payload: { params: { asset?: string } }): string {
  return String(payload.params.asset ?? "ethereum");
}

export async function fetchSomniaReceipt(requestId: number | bigint | string): Promise<unknown | null> {
  try {
    const res = await fetch(somniaReceiptApiUrl(requestId), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
