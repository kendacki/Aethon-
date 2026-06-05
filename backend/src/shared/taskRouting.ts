import { SKILL_MANIFESTS } from "../agent/manifests/data.js";
import { INTENT_CATALOG, type TaskIntent } from "./taskIntents.js";
import type { AgentType, TaskPayload } from "./taskPayload.js";
import { ALL_AGENT_TYPES } from "./taskPayload.js";

export type IntentRouting = {
  intent: TaskIntent;
  primaryRole: AgentType;
  action: string;
  mode: "single" | "swarm";
};

export function routingForIntent(intent: TaskIntent): IntentRouting {
  const entry = INTENT_CATALOG[intent];
  const mode = entry.defaultMode;
  return {
    intent,
    primaryRole: mode === "swarm" ? "ARBITRAGE" : entry.primaryRole,
    action: mode === "swarm" ? "swarm_execute" : entry.action,
    mode,
  };
}

export function validatePayloadRouting(payload: TaskPayload): string[] {
  const errors: string[] = [];
  const intent = (payload.intent ?? payload.params.intent) as TaskIntent | undefined;
  if (!intent || !(intent in INTENT_CATALOG)) {
    errors.push("Unknown task intent");
    return errors;
  }

  const expected = routingForIntent(intent);
  const isSwarm = expected.mode === "swarm";

  if (isSwarm) {
    if (payload.primaryRole !== "ARBITRAGE") {
      errors.push(`Swarm intent ${intent} must lead with ARBITRAGE`);
    }
    if (payload.action !== "swarm_execute") {
      errors.push(`Swarm intent ${intent} must use swarm_execute`);
    }
    if (!payload.requiredRoles || payload.requiredRoles.length !== ALL_AGENT_TYPES.length) {
      errors.push("Swarm intent requires all five fleet roles");
    }
    return errors;
  }

  if (payload.primaryRole !== expected.primaryRole) {
    errors.push(
      `Intent ${intent} routes to ${expected.primaryRole}, not ${payload.primaryRole}`,
    );
  }
  if (payload.action !== expected.action) {
    errors.push(`Intent ${intent} requires action ${expected.action}, not ${payload.action}`);
  }

  const manifest = SKILL_MANIFESTS[payload.primaryRole];
  if (!manifest?.actions.includes(payload.action)) {
    errors.push(`Action "${payload.action}" is not allowed for ${payload.primaryRole}`);
  }

  return errors;
}
