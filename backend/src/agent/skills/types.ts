import type { AgentType, TaskPayload } from "../../shared/taskPayload.js";
import type { SomniaAgentsClient } from "../../somnia/SomniaAgentsClient.js";
import type { KnowledgeChunk } from "../../knowledge/types.js";
import type { AgentObservation } from "../../knowledge/types.js";

export interface SkillContext {
  agentAddress: string;
  rpcUrl: string;
  apiBaseUrl: string;
  circuitBreakerAddr: string;
  agentRegistryAddr: string;
  taskId?: number;
  signMessage: (message: string) => Promise<string>;
  knowledgeCitations?: import("../../knowledge/types.js").KnowledgeChunk[];
  /** Somnia platform agent client (JSON API, LLM) when SOMNIA_AGENTS_ENABLED + consumer deployed. */
  somnia?: SomniaAgentsClient;
  /** Retrieve role-scoped knowledge for RAG (via API). */
  fetchKnowledge?: (role: AgentType, query: string, limit?: number) => Promise<KnowledgeChunk[]>;
  /** Persist warm memory observation (via API). */
  storeObservation?: (obs: AgentObservation) => Promise<void>;
}

export interface SkillResult {
  role: AgentType;
  action: string;
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
  executedAt: string;
}

export type SkillExecutor = (
  payload: TaskPayload,
  ctx: SkillContext,
) => Promise<SkillResult>;

export function skillOk(
  role: AgentType,
  action: string,
  data: Record<string, unknown>,
): SkillResult {
  return { role, action, success: true, data, executedAt: new Date().toISOString() };
}

export function skillFail(
  role: AgentType,
  action: string,
  error: string,
): SkillResult {
  return {
    role,
    action,
    success: false,
    data: {},
    error,
    executedAt: new Date().toISOString(),
  };
}
