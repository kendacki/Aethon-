import { EventEmitter } from "events";
import type { AgentHealthMonitor } from "./health/AgentHealthMonitor.js";
import type { HealthEvent } from "./health/types.js";

/** Thin adapter — health logic lives in AgentHealthMonitor. */
export class Watchdog extends EventEmitter {
  constructor(private health: AgentHealthMonitor) {
    super();
    this.health.on("halt", (evt: HealthEvent) => this.emit("halt", evt));
    this.health.on("warning", (evt: HealthEvent) => this.emit("warning", evt));
    this.health.on("recovered", (evt: HealthEvent) => this.emit("recovered", evt));
  }

  start(): void {
    this.health.start();
  }

  stop(): void {
    this.health.stop();
    this.removeAllListeners();
  }
}
