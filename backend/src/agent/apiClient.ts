import type { AgentConfig } from "./config.js";

export class AgentApiClient {
  constructor(private config: AgentConfig) {}

  private base(): string {
    return this.config.apiBaseUrl.replace(/\/+$/, "");
  }

  async fetchPayload(taskHash: string): Promise<unknown | null> {
    const res = await fetch(`${this.base()}/tasks/payload/${taskHash}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Payload fetch failed: ${res.status}`);
    const body = (await res.json()) as { data: { payload: unknown } };
    return body.data.payload;
  }

  async postCoalitionIntent(taskId: number, body: {
    address: string;
    agentType: string;
    members?: string[];
    signature?: string;
  }): Promise<void> {
    const res = await fetch(`${this.base()}/tasks/${taskId}/coalition-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Coalition intent failed: ${res.status}`);
  }

  async getCoalitionIntents(taskId: number): Promise<
    Array<{ agentAddress: string; agentType: string; signature?: string; members?: string[] }>
  > {
    const res = await fetch(`${this.base()}/tasks/${taskId}/coalition-intents`);
    if (!res.ok) throw new Error(`Coalition intents fetch failed: ${res.status}`);
    const body = (await res.json()) as {
      data: Array<{ agentAddress: string; agentType: string; signature?: string; members?: string[] }>;
    };
    return body.data;
  }

  async postSkillResult(taskId: number, body: {
    address: string;
    agentType: string;
    result: unknown;
    signature: string;
  }): Promise<void> {
    const res = await fetch(`${this.base()}/tasks/${taskId}/skill-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Skill result post failed: ${res.status}`);
  }

  async getSkillResults(taskId: number): Promise<
    Array<{ agentAddress: string; agentType: string; result: unknown }>
  > {
    const res = await fetch(`${this.base()}/tasks/${taskId}/skill-results`);
    if (!res.ok) throw new Error(`Skill results fetch failed: ${res.status}`);
    const body = (await res.json()) as { data: Array<{ agentAddress: string; agentType: string; result: unknown }> };
    return body.data;
  }

  async listOnlineAgents(type?: string): Promise<Array<{ address: string; agentType: string; reputation: number }>> {
    const q = type ? `?type=${encodeURIComponent(type)}&online=true&pageSize=50` : "?online=true&pageSize=50";
    const res = await fetch(`${this.base()}/agents${q}`);
    if (!res.ok) throw new Error(`Agent list failed: ${res.status}`);
    const body = (await res.json()) as { data: Array<{ address: string; agentType: string; reputation: number }> };
    return body.data;
  }

  async postTaskExecution(
    taskId: number,
    body: { targetContract: string; executionPayload: string },
  ): Promise<void> {
    const res = await fetch(`${this.base()}/tasks/${taskId}/execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Task execution persist failed: ${res.status}`);
  }

  async fetchKnowledge(role: string, queryText: string, limit = 5): Promise<
    Array<{ id: number; role: string; title: string; content: string; sourceUrl?: string; tags: string[]; score: number }>
  > {
    const q = encodeURIComponent(queryText);
    const res = await fetch(`${this.base()}/knowledge/${encodeURIComponent(role)}?q=${q}&limit=${limit}`);
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data: Array<{ id: number; role: string; title: string; content: string; sourceUrl?: string; tags: string[]; score: number }>;
    };
    return body.data ?? [];
  }

  async storeObservation(body: {
    role: string;
    taskId?: number;
    observationType?: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const res = await fetch(`${this.base()}/knowledge/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[AgentApiClient] observation store failed: ${res.status}`);
    }
  }
}
