import { EventEmitter } from "events";

export type WsChannel = "tasks" | "coalitions" | "agents" | "circuit_breaker" | "somnia_agents";

export interface WsEvent {
  type: string;
  channel: WsChannel;
  payload: Record<string, unknown>;
  timestamp: string;
}

class EventBus extends EventEmitter {
  publish(channel: WsChannel, type: string, payload: Record<string, unknown>): void {
    const event: WsEvent = {
      type,
      channel,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.emit("broadcast", event);
    this.emit(channel, event);
  }
}

export const eventBus = new EventBus();
