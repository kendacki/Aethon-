import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "../config/env";
import { getAuthToken } from "../auth/token";

const WS_BASE = env.wsUrl;

function wsUrlWithToken(): string | null {
  if (!WS_BASE) return null;
  const token = getAuthToken();
  if (!token) return WS_BASE;
  const sep = WS_BASE.includes("?") ? "&" : "?";
  return `${WS_BASE}${sep}token=${encodeURIComponent(token)}`;
}

export type WsChannel = "tasks" | "coalitions" | "agents" | "circuit_breaker" | "somnia_agents";

export interface WsMessage {
  type: string;
  channel: WsChannel;
  payload: Record<string, unknown>;
  timestamp: string;
}

export function useWebSocket(channels: WsChannel[]) {
  const [lastEvent, setLastEvent] = useState<WsMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const connect = useCallback(() => {
    const url = wsUrlWithToken();
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "subscribe", channels: channelsRef.current }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsMessage;
        if (msg.type && msg.channel) setLastEvent(msg);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { lastEvent, connected };
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
