import type { AgentType, TaskPayload } from "./taskPayload.js";
import { requiredRolesForTask } from "./taskPayload.js";

export type SkillResultRow = {
  agentType: string;
  result: { success?: boolean; data?: Record<string, unknown>; error?: string };
};

function isRoutingMismatchError(error?: string): boolean {
  return Boolean(error && /not in manifest/i.test(error));
}

/** Keep only skill rows relevant to the task's required roles; drop cross-role routing failures. */
export function filterSkillResultsForDisplay(
  payload: TaskPayload | null,
  complexity: number,
  rows: SkillResultRow[],
): SkillResultRow[] {
  if (!rows.length) return rows;

  const required = payload ? requiredRolesForTask(payload, complexity) : [];
  let filtered = rows.filter((row) => {
    if (required.length && !required.includes(row.agentType as AgentType)) return false;
    if (row.result.success === false && isRoutingMismatchError(row.result.error)) return false;
    return true;
  });

  const successful = filtered.filter((row) => row.result.success !== false);
  if (successful.length) filtered = successful;

  if (!filtered.length && payload?.primaryRole) {
    const primaryOk = rows.find(
      (row) => row.agentType === payload.primaryRole && row.result.success !== false,
    );
    if (primaryOk) return [primaryOk];
  }

  return filtered.length ? filtered : rows.slice(0, 1);
}
