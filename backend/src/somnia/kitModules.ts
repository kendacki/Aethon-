/**
 * Somnia Agent Kit SDK module fit for AETHON.
 * @see https://somnia-agent-kit.gitbook.io/somnia-agent-kit
 *
 * AETHON uses `somnia-agent-kit` as a dev reference; runtime uses custom ethers clients
 * to avoid duplicate registries/task systems.
 */

export type KitModuleStatus = "integrated" | "delegated" | "excluded";

export interface KitModuleFit {
  module: string;
  status: KitModuleStatus;
  aethonEquivalent: string;
  reason: string;
  kitContract?: string;
}

/** Somnia Agent Kit testnet contracts (reference only — most unused by AETHON). */
export const SOMNIA_KIT_CONTRACTS = {
  agentRegistry: "0xC9f3452090EEB519467DEa4a390976D38C008347",
  agentManager: "0x77F6dC5924652e32DBa0B4329De0a44a2C95691E",
  agentExecutor: "0x157C56dEdbAB6caD541109daabA4663Fc016026e",
  agentVault: "0x7cEe3142A9c6d15529C322035041af697B2B5129",
} as const;

export const SOMNIA_KIT_MODULE_MATRIX: KitModuleFit[] = [
  {
    module: "Basic Usage (SDK init)",
    status: "delegated",
    aethonEquivalent: "backend/src/somnia/SomniaAgentsClient.ts + loadSomniaConfig()",
    reason: "Custom ethers client; no somnia-agent-kit npm dependency.",
  },
  {
    module: "Working with Agents (register/discover)",
    status: "integrated",
    aethonEquivalent: "scripts/register-somnia-kit-agents.cjs + AETHON AgentRegistry.sol",
    reason: "Fleet registered in Kit registry (#47–51) AND AETHON on-chain registry for tasks.",
    kitContract: SOMNIA_KIT_CONTRACTS.agentRegistry,
  },
  {
    module: "Task Management",
    status: "excluded",
    aethonEquivalent: "TaskMarket.sol + TaskExecutor.ts + POST /v1/tasks/submit",
    reason: "Kit AgentManager tasks conflict with AETHON coalition task market — do not dual-submit.",
    kitContract: SOMNIA_KIT_CONTRACTS.agentManager,
  },
  {
    module: "Vault Operations",
    status: "integrated",
    aethonEquivalent: "AethonFleetVault.sol + AgentVaultClient + setup-agent-vaults.cjs",
    reason: "Kit-compatible fleet vault deployed by AETHON (shared Kit vault is third-party admin-only).",
  },
  {
    module: "LLM Integration (OpenAI/Ollama)",
    status: "delegated",
    aethonEquivalent: "SomniaAgentsClient.inferString() via Somnia L1 platform agent",
    reason: "GOVERNANCE uses deterministic on-chain LLM (Qwen3-30B), not external OpenAI/Ollama.",
  },
  {
    module: "Token Management (ERC20/721)",
    status: "excluded",
    aethonEquivalent: "ethers v6 in agents + TaskMarket native STT rewards",
    reason: "No ERC20/721 agent treasury flows in v3 fleet skills.",
  },
  {
    module: "Multicall Batching",
    status: "excluded",
    aethonEquivalent: "NonceMgr.ts sequential txs",
    reason: "Agent txs are low-frequency; multicall not required.",
  },
  {
    module: "Monitoring (metrics/dashboard)",
    status: "integrated",
    aethonEquivalent: "AgentHealthMonitor + /v1/agents/fleet-health + Railway health",
    reason: "Production monitoring via AETHON health reporter, not Kit dashboard.",
  },
  {
    module: "Autonomous Runtime",
    status: "integrated",
    aethonEquivalent: "AgentCore.ts + railway-start.cjs + REACTIVITY_ENABLED",
    reason: "Five persistent worker processes with heartbeat and task subscription.",
  },
  {
    module: "Storage & IPFS",
    status: "delegated",
    aethonEquivalent: "HTTP manifests at /v1/agents/manifests/:role",
    reason: "Manifest URIs in Kit registry point to API JSON, not IPFS hashes.",
  },
  {
    module: "Real-time Events (WebSocket)",
    status: "integrated",
    aethonEquivalent: "backend WebSocket /ws (tasks, agents, coalitions, circuit_breaker)",
    reason: "AETHON eventBus channels replace Kit event subscriptions.",
  },
  {
    module: "Wallet Connectors",
    status: "integrated",
    aethonEquivalent: "frontend WalletContext + SIWE (web3Auth.ts)",
    reason: "MetaMask/Somnia chain in frontend; agents use AGENT_PRIVATE_KEY server-side.",
  },
  {
    module: "Contract Deployment",
    status: "integrated",
    aethonEquivalent: "deploy_v3.cjs + deploy-somnia-consumer.cjs (DEPLOYER_PK only)",
    reason: "Hardhat deploy scripts for AETHON + SomniaAgentConsumer.",
  },
  {
    module: "RPC Load Balancer",
    status: "excluded",
    aethonEquivalent: "SOMNIA_RPC_URL env (Railway/production single RPC)",
    reason: "Kit HA RPC layer not needed at current fleet scale.",
  },
  {
    module: "Somnia L1 Platform Agents (JSON API / LLM)",
    status: "integrated",
    aethonEquivalent: "SomniaAgentConsumer + ORACLE/GOVERNANCE skills",
    reason: "Validator-consensus compute via docs.somnia.network/agents (not Kit SDK).",
  },
];

export function summarizeKitModules() {
  const integrated = SOMNIA_KIT_MODULE_MATRIX.filter((m) => m.status === "integrated");
  const delegated = SOMNIA_KIT_MODULE_MATRIX.filter((m) => m.status === "delegated");
  const excluded = SOMNIA_KIT_MODULE_MATRIX.filter((m) => m.status === "excluded");
  return {
    integrated: integrated.length,
    delegated: delegated.length,
    excluded: excluded.length,
    modules: SOMNIA_KIT_MODULE_MATRIX,
    recommendation:
      "Use Kit registry for discovery only; run tasks/rewards through AETHON TaskMarket; use Somnia platform agents for oracle/LLM.",
  };
}
