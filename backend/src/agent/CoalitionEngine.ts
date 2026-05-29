import { ethers } from "ethers";
import type { AgentConfig } from "./config.js";
import { AgentApiClient } from "./apiClient.js";

export interface PeerCandidate {
  address: string;
  agentType: string;
  reputation: number;
  stake: bigint;
}

const ADP_FETCH_TIMEOUT_MS = 4000;

export class CoalitionEngine {
  private api: AgentApiClient;

  constructor(
    private config: AgentConfig,
    private provider: ethers.JsonRpcProvider
  ) {
    this.api = new AgentApiClient(config);
  }

  async discoverPeers(agentType: string): Promise<PeerCandidate[]> {
    const fromAdp = await this.discoverViaAdp(agentType);
    if (fromAdp.length > 0) {
      console.log(`[CoalitionEngine] ADP returned ${fromAdp.length} ${agentType} peers`);
      return fromAdp;
    }

    try {
      const agents = await this.api.listOnlineAgents(agentType);
      const peers = agents.map((a) => ({
        address: a.address,
        agentType: a.agentType,
        reputation: a.reputation,
        stake: 0n,
      }));
      if (peers.length > 0) {
        console.log(`[CoalitionEngine] API registry returned ${peers.length} ${agentType} peers`);
      }
      return peers;
    } catch (err) {
      console.warn(`[CoalitionEngine] Peer discovery failed for ${agentType}:`, err);
      return [];
    }
  }

  private async discoverViaAdp(agentType: string): Promise<PeerCandidate[]> {
    const host = process.env.SOMNIA_ADP_HOST ?? process.env.ADP_HOST;
    if (!host) return [];

    const url = `${host.replace(/\/+$/, "")}/agents?type=${encodeURIComponent(agentType)}&online=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ADP_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const body = (await res.json()) as {
        agents?: Array<{ address: string; agentType?: string; reputation?: number; stakeWei?: string }>;
      };
      return (body.agents ?? []).map((a) => ({
        address: a.address,
        agentType: a.agentType ?? agentType,
        reputation: a.reputation ?? 0,
        stake: BigInt(a.stakeWei ?? "0"),
      }));
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  evaluateFitness(members: PeerCandidate[], complexity: number): boolean {
    return members.length >= complexity && members.every((m) => m.reputation >= this.config.minReputation);
  }

  async signCoalitionIntent(members: string[], taskId: bigint, wallet: ethers.Wallet): Promise<string> {
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    return wallet.signMessage(ethers.getBytes(msgHash));
  }
}
