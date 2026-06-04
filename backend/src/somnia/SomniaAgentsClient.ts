import { ethers } from "ethers";
import {
  SOMNIA_BASE_AGENTS,
  SOMNIA_PER_AGENT_PRICE_WEI,
  SOMNIA_PLATFORM_ADDR,
  SOMNIA_PRACTICAL_DEPOSIT_WEI,
  SOMNIA_SUBCOMMITTEE_SIZE,
} from "./constants.js";

export interface SomniaConfig {
  enabled: boolean;
  chainId: number;
  platformAddr: string;
  consumerAddr: string;
  jsonApiAgentId: bigint;
  llmAgentId: bigint;
  parseWebsiteAgentId: bigint;
  requestTimeoutMs: number;
}

export function loadSomniaConfig(): SomniaConfig {
  const chainId = Number(process.env.SOMNIA_CHAIN_ID ?? 50312);
  const platformAddr =
    process.env.SOMNIA_AGENTS_PLATFORM_ADDR ?? SOMNIA_PLATFORM_ADDR[chainId] ?? "";
  const consumerAddr = process.env.SOMNIA_AGENT_CONSUMER_ADDR ?? "";

  return {
    enabled: process.env.SOMNIA_AGENTS_ENABLED === "true",
    chainId,
    platformAddr,
    consumerAddr,
    jsonApiAgentId: BigInt(process.env.SOMNIA_JSON_API_AGENT_ID ?? String(SOMNIA_BASE_AGENTS.JSON_API)),
    llmAgentId: BigInt(process.env.SOMNIA_LLM_AGENT_ID ?? String(SOMNIA_BASE_AGENTS.LLM_INFERENCE)),
    parseWebsiteAgentId: BigInt(
      process.env.SOMNIA_PARSE_WEBSITE_AGENT_ID ?? String(SOMNIA_BASE_AGENTS.LLM_PARSE_WEBSITE),
    ),
    requestTimeoutMs: Number(process.env.SOMNIA_REQUEST_TIMEOUT_MS ?? 90_000),
  };
}

export function isSomniaAgentsReady(cfg: SomniaConfig): boolean {
  return cfg.enabled && cfg.platformAddr.startsWith("0x") && cfg.consumerAddr.startsWith("0x");
}

const PLATFORM_ABI = [
  "function getRequestDeposit() view returns (uint256)",
  "function getRequest(uint256 requestId) view returns (tuple(uint256 id, address requester, address callbackAddress, bytes4 callbackSelector, address[] subcommittee, tuple(address validator, bytes result, uint8 status, uint256 receipt, uint256 timestamp, uint256 executionCost)[] responses, uint256 responseCount, uint256 failureCount, uint256 threshold, uint256 createdAt, uint256 deadline, uint8 status, uint8 consensusType, uint256 remainingBudget, uint256 perAgentBudget))",
  "event RequestFinalized(uint256 indexed requestId, uint8 status)",
] as const;

const CONSUMER_ABI = [
  "function invokeAgent(uint256 agentId, bytes payload) payable returns (uint256 requestId)",
  "function results(uint256 requestId) view returns (bytes)",
  "function statuses(uint256 requestId) view returns (uint8)",
  "event SomniaResponseStored(uint256 indexed requestId, uint8 status)",
] as const;

const JSON_API_IFACE = new ethers.Interface([
  "function fetchUint(string url, string selector, uint8 decimals) returns (uint256)",
]);

const LLM_IFACE = new ethers.Interface([
  "function inferString(string prompt, string system, bool chainOfThought, string[] allowedValues) returns (string)",
]);

const PARSE_WEBSITE_IFACE = new ethers.Interface([
  "function parseWebsite(string url, string instruction) returns (string)",
]);

function parseRequestIdFromReceipt(
  consumer: ethers.Contract,
  receipt: ethers.ContractTransactionReceipt | null,
): bigint {
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = consumer.interface.parseLog(log);
      if (parsed?.name === "SomniaRequestCreated") {
        return parsed.args[0] as bigint;
      }
    } catch {
      // not our event
    }
  }
  throw new Error("SomniaRequestCreated not found in tx receipt");
}

export type SomniaAgentKind = keyof typeof SOMNIA_BASE_AGENTS;

export class SomniaAgentsClient {
  private platform: ethers.Contract;
  private consumer: ethers.Contract;

  constructor(
    private cfg: SomniaConfig,
    private wallet: ethers.Signer,
    provider: ethers.Provider,
  ) {
    this.platform = new ethers.Contract(cfg.platformAddr, PLATFORM_ABI, provider);
    this.consumer = new ethers.Contract(cfg.consumerAddr, CONSUMER_ABI, wallet);
  }

  static fromEnv(wallet: ethers.Signer, provider: ethers.Provider): SomniaAgentsClient | null {
    const cfg = loadSomniaConfig();
    if (!isSomniaAgentsReady(cfg)) return null;
    return new SomniaAgentsClient(cfg, wallet, provider);
  }

  private async depositFor(kind: SomniaAgentKind): Promise<bigint> {
    try {
      const floor = (await this.platform.getRequestDeposit()) as bigint;
      const perAgent = SOMNIA_PER_AGENT_PRICE_WEI[kind];
      return floor + perAgent * BigInt(SOMNIA_SUBCOMMITTEE_SIZE);
    } catch {
      return SOMNIA_PRACTICAL_DEPOSIT_WEI[kind];
    }
  }

  private async waitForResult(requestId: bigint): Promise<{ status: number; result: string }> {
    const deadline = Date.now() + this.cfg.requestTimeoutMs;
    while (Date.now() < deadline) {
      const status = Number(await this.consumer.statuses(requestId));
      if (status === 2) {
        const raw = (await this.consumer.results(requestId)) as string;
        return { status, result: raw };
      }
      if (status === 3 || status === 4) {
        throw new Error(`Somnia agent request ${requestId} failed (status ${status})`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`Somnia agent request ${requestId} timed out after ${this.cfg.requestTimeoutMs}ms`);
  }

  async fetchJsonUint(url: string, selector: string, decimals = 8): Promise<number> {
    const payload = JSON_API_IFACE.encodeFunctionData("fetchUint", [url, selector, decimals]);
    const deposit = await this.depositFor("JSON_API");
    const tx = await this.consumer.invokeAgent(this.cfg.jsonApiAgentId, payload, { value: deposit });
    const receipt = await tx.wait();
    const requestId = parseRequestIdFromReceipt(this.consumer, receipt);

    const { result } = await this.waitForResult(requestId);
    const priceWei = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], result)[0] as bigint;
    return Number(priceWei) / 10 ** decimals;
  }

  async inferString(
    prompt: string,
    system: string,
    allowedValues: string[] = [],
  ): Promise<string> {
    const payload = LLM_IFACE.encodeFunctionData("inferString", [
      prompt,
      system,
      false,
      allowedValues,
    ]);
    const deposit = await this.depositFor("LLM_INFERENCE");
    const tx = await this.consumer.invokeAgent(this.cfg.llmAgentId, payload, { value: deposit });
    const receipt = await tx.wait();
    const requestId = parseRequestIdFromReceipt(this.consumer, receipt);

    const { result } = await this.waitForResult(requestId);
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], result);
    return decoded[0] as string;
  }

  /** Somnia LLM Parse Website agent (12875401142070969085) — live page context for governance. */
  async parseWebsite(url: string, instruction: string): Promise<string> {
    const payload = PARSE_WEBSITE_IFACE.encodeFunctionData("parseWebsite", [url, instruction]);
    const deposit = await this.depositFor("LLM_PARSE_WEBSITE");
    const tx = await this.consumer.invokeAgent(this.cfg.parseWebsiteAgentId, payload, { value: deposit });
    const receipt = await tx.wait();
    const requestId = parseRequestIdFromReceipt(this.consumer, receipt);
    const { result } = await this.waitForResult(requestId);
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], result);
    return decoded[0] as string;
  }
}
