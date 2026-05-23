const trimSlash = (value: string) => value.replace(/\/+$/, "");

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return "/v1";

  const clean = trimSlash(raw);
  if (clean.endsWith("/v1")) return clean;
  if (clean.startsWith("http")) return `${clean}/v1`;
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function resolveApiOrigin(apiBase: string): string {
  if (apiBase.startsWith("http")) {
    return trimSlash(apiBase.replace(/\/v1$/, ""));
  }
  if (import.meta.env.DEV) return "http://localhost:3001";
  return typeof window !== "undefined" ? window.location.origin : "";
}

function resolveWsUrl(apiBase: string, apiOrigin: string): string {
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

  if (import.meta.env.DEV && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  if (import.meta.env.PROD) {
    console.warn("[AETHON] Set VITE_WS_URL in production (or VITE_API_URL so WebSocket can be derived).");
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
  isDev: import.meta.env.DEV,
};
