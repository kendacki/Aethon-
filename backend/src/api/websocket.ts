import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { eventBus, type WsChannel } from "../services/eventBus.js";
import { verifyWsToken } from "./authenticateToken.js";

interface ClientState {
  channels: Set<WsChannel>;
  walletAddress?: string;
}

function parseWsToken(req: IncomingMessage): string | null {
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/ws", `http://${host}`);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Map<WebSocket, ClientState>();

  eventBus.on("broadcast", (event) => {
    const payload = JSON.stringify(event);
    for (const [ws, state] of clients) {
      if (ws.readyState === WebSocket.OPEN && state.channels.has(event.channel)) {
        ws.send(payload);
      }
    }
  });

  wss.on("connection", (ws, req) => {
    const token = parseWsToken(req);
    const walletAddress = verifyWsToken(token);

    if (token && !walletAddress) {
      ws.close(4401, "Invalid token");
      return;
    }

    clients.set(ws, { channels: new Set(), walletAddress: walletAddress ?? undefined });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; channels?: WsChannel[] };
        if (msg.type === "subscribe" && Array.isArray(msg.channels)) {
          const state = clients.get(ws);
          if (state) {
            state.channels = new Set(msg.channels);
            ws.send(JSON.stringify({ type: "subscribed", channels: msg.channels }));
          }
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => clients.delete(ws));
    ws.send(JSON.stringify({ type: "connected", channels: [] }));
  });

  console.log("[WebSocket] listening on /ws");
}
