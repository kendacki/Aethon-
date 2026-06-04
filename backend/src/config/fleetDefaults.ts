import type { AgentType } from "../shared/taskPayload.js";

/** Baked-in fleet wallets — used when env/*.json is missing from the production image. */
export const DEFAULT_FLEET_AGENTS: Record<AgentType, string> = {
  ARBITRAGE: "0x0eec621450cA9a0445DBdadC0624FDD5cc888037",
  ORACLE: "0xfc501c679aFb3689191448f92621ACD49e86482C",
  YIELD_OPT: "0x6BDe11143f5aE057eBFbc24Ce6189D99cd0B4F9e",
  GOVERNANCE: "0xBaB3E5C546B005794BE59A2D359a28e57EC6C9d0",
  RISK_MGMT: "0x25229e52bd699F82C1dcF3257bC3299fC98960bB",
};

export const DEFAULT_RELAYER_ADDRESS = "0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6";

/** Railway production worker health endpoints (also set via AGENT_HEALTH_URLS). */
export const DEFAULT_FLEET_HEALTH_URLS: Record<AgentType, string> = {
  ARBITRAGE: "https://aethon-agent-arbitrage-production.up.railway.app",
  ORACLE: "https://aethon-agent-oracle-production.up.railway.app",
  YIELD_OPT: "https://aethon-agent-yield-production.up.railway.app",
  GOVERNANCE: "https://aethon-agent-governance-production.up.railway.app",
  RISK_MGMT: "https://aethon-agent-risk-production.up.railway.app",
};
