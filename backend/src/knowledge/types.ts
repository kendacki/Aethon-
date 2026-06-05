import type { AgentType } from "../shared/taskPayload.js";

export type KnowledgeChunk = {
  id: number;
  role: AgentType;
  title: string;
  content: string;
  sourceUrl?: string;
  tags: string[];
  score: number;
};

export type AgentObservation = {
  role: AgentType;
  taskId?: number;
  observationType: string;
  payload: Record<string, unknown>;
};
