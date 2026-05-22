import { ethers } from "ethers";

export type AgentType = "ARBITRAGE" | "ORACLE" | "YIELD_OPT" | "GOVERNANCE" | "RISK_MGMT";

export interface AgentConfig {
  rpcUrl: string;
  wsUrl?: string;
  chainId: number;
  privateKey: string;
  agentType: AgentType;
  agentStakeWei: bigint;
  minReputation: number;
  circuitBreakerAddr: string;
  circuitBreakerABI: readonly string[];
  agentRegistryAddr: string;
  taskMarketAddr: string;
  coalitionManagerAddr: string;
  dataStreamsEnabled: boolean;
  reactivityEnabled: boolean;
  watchdogIntervalMs: number;
  maxGasPerTx: bigint;
}

export function loadAgentConfig(): AgentConfig {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("AGENT_PRIVATE_KEY is required");
  }

  return {
    rpcUrl: process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network",
    wsUrl: process.env.SOMNIA_WS_URL,
    chainId: Number(process.env.SOMNIA_CHAIN_ID ?? 50312),
    privateKey,
    agentType: (process.env.AGENT_TYPE ?? "ARBITRAGE") as AgentType,
    agentStakeWei: BigInt(process.env.AGENT_STAKE_WEI ?? "500000000000000000"),
    minReputation: Number(process.env.MIN_REPUTATION ?? 50),
    circuitBreakerAddr: process.env.CIRCUIT_BREAKER_ADDR ?? ethers.ZeroAddress,
    circuitBreakerABI: [
      "event CircuitBroken(uint256 failures, uint256 timestamp)",
      "function isPaused() view returns (bool)",
    ],
    agentRegistryAddr: process.env.AGENT_REGISTRY_ADDR ?? ethers.ZeroAddress,
    taskMarketAddr: process.env.TASK_MARKET_ADDR ?? ethers.ZeroAddress,
    coalitionManagerAddr: process.env.COALITION_MANAGER_ADDR ?? ethers.ZeroAddress,
    dataStreamsEnabled: process.env.DATA_STREAMS_ENABLED === "true",
    reactivityEnabled: process.env.REACTIVITY_ENABLED === "true",
    watchdogIntervalMs: Number(process.env.WATCHDOG_INTERVAL_MS ?? 5000),
    maxGasPerTx: BigInt(process.env.MAX_GAS_PER_TX ?? "5000000"),
  };
}

export const AGENT_TYPE_MAP: Record<AgentType, number> = {
  ARBITRAGE: 0,
  ORACLE: 1,
  YIELD_OPT: 2,
  GOVERNANCE: 3,
  RISK_MGMT: 4,
};
