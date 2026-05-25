import fs from "fs";
import os from "os";
import path from "path";
import type { AgentHealthSnapshot } from "./types.js";

const DEFAULT_PATH = path.join(os.tmpdir(), "aethon-agent-health.json");

export class HealthReporter {
  private lastWrite = 0;

  constructor(private filePath = process.env.AGENT_HEALTH_FILE ?? DEFAULT_PATH) {}

  publish(snapshot: AgentHealthSnapshot): void {
    const now = Date.now();
    if (now - this.lastWrite < 500) return;
    this.lastWrite = now;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(snapshot), "utf8");
    } catch (err) {
      console.warn("[HealthReporter] Failed to write snapshot:", err);
    }
  }

  static readSnapshot(filePath = process.env.AGENT_HEALTH_FILE ?? DEFAULT_PATH): AgentHealthSnapshot | null {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw) as AgentHealthSnapshot;
    } catch {
      return null;
    }
  }
}
