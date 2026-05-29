const trimSlash = (value: string) => value.replace(/\/+$/, "");

/** Production API fallback when VITE_API_URL is missing from the build environment. */
const PRODUCTION_API_ORIGIN = "https://aethon-production-3f5a.up.railway.app";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * In production browsers, use same-origin /v1 so Vercel rewrites proxy to Railway.
 * Avoids cross-origin CORS failures when Railway CORS_ORIGIN is not configured.
 */
function useSameOriginApi(): boolean {
  return isBrowser() && import.meta.env.PROD;
}

function resolveApiBase(): string {
  if (useSameOriginApi()) return "/v1";

  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    if (import.meta.env.PROD) return `${PRODUCTION_API_ORIGIN}/v1`;
    return "/v1";
  }

  const clean = trimSlash(raw);
  if (clean.endsWith("/v1")) return clean;
  if (clean.startsWith("http")) return `${clean}/v1`;
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function resolveApiOrigin(apiBase: string): string {
  if (useSameOriginApi()) return window.location.origin;
  if (apiBase.startsWith("http")) {
    return trimSlash(apiBase.replace(/\/v1$/, ""));
  }
  if (import.meta.env.DEV) return "http://localhost:3001";
  return PRODUCTION_API_ORIGIN;
}

function resolveWsUrl(apiBase: string, apiOrigin: string): string {
  if (useSameOriginApi()) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  const raw = import.meta.env.VITE_WS_URL?.trim();
  if (raw) return trimSlash(raw);

  if (apiBase.startsWith("http")) {
    const url = new URL(apiOrigin || apiBase.replace(/\/v1$/, ""));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return trimSlash(url.toString());
  }

  if (import.meta.env.DEV && isBrowser()) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  return "";
}

const apiBase = resolveApiBase();
const apiOrigin = resolveApiOrigin(apiBase);

export const env = {
  apiBase,
  apiKey: import.meta.env.VITE_API_KEY ?? "dev-api-key",
  wsUrl: resolveWsUrl(apiBase, apiOrigin),
  apiOrigin,
  apiHealthUrl: `${apiOrigin}/v1/health`,
  apiDocsUrl: `${apiOrigin}/docs`,
  somniaChainId: Number(import.meta.env.VITE_SOMNIA_CHAIN_ID ?? 50312),
  somniaRpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network",
  somniaExplorer: import.meta.env.VITE_SOMNIA_EXPLORER ?? "https://shannon-explorer.somnia.network",
  siweDomain: import.meta.env.VITE_SIWE_DOMAIN?.trim() || undefined,
  siweUri: import.meta.env.VITE_SIWE_URI?.trim() || undefined,
  isDev: import.meta.env.DEV,
};
