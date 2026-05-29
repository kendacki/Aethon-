import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AETHON_SOMNIA_FIT,
  SOMNIA_AGENT_EXPLORER,
  SOMNIA_BASE_AGENTS,
  SOMNIA_PLATFORM_ADDR,
  SOMNIA_PRACTICAL_DEPOSIT_WEI,
} from "../somnia/constants.js";
import { isSomniaAgentsReady, loadSomniaConfig } from "../somnia/SomniaAgentsClient.js";
import { SOMNIA_KIT_CONTRACTS, summarizeKitModules } from "../somnia/kitModules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadKitRegistrations(): Record<string, unknown> | null {
  try {
    const file = path.join(__dirname, "../../deployments/somnia-kit-registrations.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSomniaCompatibilityReport() {
  const cfg = loadSomniaConfig();
  const chainId = cfg.chainId;
  const platformAddr = cfg.platformAddr || SOMNIA_PLATFORM_ADDR[chainId] || null;
  const kitReg = loadKitRegistrations();

  const features = {
    somniaPlatformAgents: {
      ready: isSomniaAgentsReady(cfg),
      consumerDeployed: cfg.consumerAddr.startsWith("0x"),
      jsonApiOracle: cfg.enabled && cfg.consumerAddr.startsWith("0x"),
      llmGovernanceSummary: cfg.enabled && cfg.consumerAddr.startsWith("0x"),
    },
    aethonOnChain: {
      agentRegistry: Boolean(process.env.AGENT_REGISTRY_ADDR),
      taskMarket: Boolean(process.env.TASK_MARKET_ADDR),
      coalitionManager: Boolean(process.env.COALITION_MANAGER_ADDR),
      reputationEngine: Boolean(process.env.REPUTATION_ENGINE_ADDR),
      circuitBreaker: Boolean(process.env.CIRCUIT_BREAKER_ADDR),
    },
    runtime: {
      reactivity: process.env.REACTIVITY_ENABLED === "true",
      dataStreams: process.env.DATA_STREAMS_ENABLED === "true",
      adpDiscovery: Boolean(process.env.SOMNIA_ADP_HOST ?? process.env.ADP_HOST),
      fleetHealth: Boolean(process.env.AGENT_HEALTH_URLS ?? process.env.FLEET_HEALTH_URLS_FILE),
    },
    somniaKitRegistry: {
      address: process.env.SOMNIA_KIT_REGISTRY_ADDR ?? "0xC9f3452090EEB519467DEa4a390976D38C008347",
      fleetRegistered: Boolean(kitReg?.agents),
      agents: kitReg?.agents ?? null,
    },
    fleetVault: {
      enabled: process.env.SOMNIA_VAULT_ENABLED === "true",
      address: process.env.AETHON_FLEET_VAULT_ADDR ?? null,
      dailyLimitStt: process.env.SOMNIA_VAULT_DAILY_LIMIT_STT ?? "10",
      note: "AethonFleetVault — Kit-compatible reserve per agent (not shared Kit vault).",
    },
  };

  const gaps: string[] = [];
  if (!cfg.enabled) gaps.push("Set SOMNIA_AGENTS_ENABLED=true to use validator-consensus oracles and LLM.");
  if (cfg.enabled && !cfg.consumerAddr.startsWith("0x")) {
    gaps.push("Deploy SomniaAgentConsumer and set SOMNIA_AGENT_CONSUMER_ADDR (npm run deploy:somnia-consumer).");
  }
  if (!process.env.AGENT_HEALTH_URLS && !process.env.FLEET_HEALTH_URLS_FILE) {
    gaps.push("Configure AGENT_HEALTH_URLS for production fleet health aggregation.");
  }
  if (process.env.SOMNIA_VAULT_ENABLED === "true" && !process.env.AETHON_FLEET_VAULT_ADDR) {
    gaps.push("Deploy AethonFleetVault and set AETHON_FLEET_VAULT_ADDR (npm run deploy:aethon-vault).");
  }

  return {
    fit: AETHON_SOMNIA_FIT,
    somniaAgentKit: {
      ...summarizeKitModules(),
      contracts: SOMNIA_KIT_CONTRACTS,
      note: "somnia-agent-kit npm is a dev reference; runtime uses custom ethers clients — see module matrix.",
    },
    network: {
      chainId,
      platformAddr,
      explorer: SOMNIA_AGENT_EXPLORER[chainId] ?? null,
      rpcUrl: process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network",
    },
    baseAgents: {
      jsonApi: {
        agentId: String(SOMNIA_BASE_AGENTS.JSON_API),
        practicalDepositWei: String(SOMNIA_PRACTICAL_DEPOSIT_WEI.JSON_API),
        usedBy: "ORACLE fetch_price (consensus-verified price feed)",
      },
      llmInference: {
        agentId: String(SOMNIA_BASE_AGENTS.LLM_INFERENCE),
        practicalDepositWei: String(SOMNIA_PRACTICAL_DEPOSIT_WEI.LLM_INFERENCE),
        usedBy: "GOVERNANCE analyze_proposal (plain-language summary)",
      },
      llmParseWebsite: {
        agentId: String(SOMNIA_BASE_AGENTS.LLM_PARSE_WEBSITE),
        practicalDepositWei: String(SOMNIA_PRACTICAL_DEPOSIT_WEI.LLM_PARSE_WEBSITE),
        usedBy: "Available for future prediction-market / news resolution tasks",
      },
    },
    config: {
      enabled: cfg.enabled,
      consumerAddr: cfg.consumerAddr || null,
      jsonApiAgentId: String(cfg.jsonApiAgentId),
      llmAgentId: String(cfg.llmAgentId),
    },
    features,
    gaps,
    agentathonReady: gaps.length === 0 && features.aethonOnChain.agentRegistry,
  };
}
