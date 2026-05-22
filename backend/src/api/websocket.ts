import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { eventBus, type WsChannel } from "../services/eventBus.js";

interface ClientState {
  channels: Set<WsChannel>;
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

  wss.on("connection", (ws) => {
    clients.set(ws, { channels: new Set() });

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
