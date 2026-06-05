import type { AgentType, TaskPayload } from "../../shared/taskPayload.js";
import { runAgentLoop } from "../cognition/AgentLoop.js";
import { executeArbitrage } from "./arbitrage.js";
import { executeGovernance } from "./governance.js";
import { executeOracle } from "./oracle.js";
import { executeRiskMgmt } from "./riskMgmt.js";
import type { SkillContext, SkillExecutor, SkillResult } from "./types.js";
import { validateSkillParams } from "./validate.js";
import { executeYieldOpt } from "./yieldOpt.js";

const EXECUTORS: Record<AgentType, SkillExecutor> = {
  ARBITRAGE: executeArbitrage,
  ORACLE: executeOracle,
  YIELD_OPT: executeYieldOpt,
  GOVERNANCE: executeGovernance,
  RISK_MGMT: executeRiskMgmt,
};

export async function executeSkill(
  role: AgentType,
  payload: TaskPayload,
  ctx: SkillContext,
): Promise<SkillResult> {
  const executor = EXECUTORS[role];
  if (!executor) {
    return {
      role,
      action: payload.action,
      success: false,
      data: {},
      error: `No executor for role ${role}`,
      executedAt: new Date().toISOString(),
    };
  }

  const validation = validateSkillParams(role, payload);
  if (!validation.ok) {
    return {
      role,
      action: payload.action,
      success: false,
      data: {},
      error: validation.errors.join("; "),
      executedAt: new Date().toISOString(),
    };
  }

  const sanitized: TaskPayload = { ...payload, params: validation.sanitized };
  return runAgentLoop(role, sanitized, ctx, EXECUTORS[role]);
}

export async function executeSwarmPipeline(
  roles: AgentType[],
  payload: TaskPayload,
  ctx: SkillContext,
): Promise<SkillResult[]> {
  const results: SkillResult[] = [];
  for (const role of roles) {
    results.push(await executeSkill(role, payload, ctx));
  }
  return results;
}

export { EXECUTORS };
