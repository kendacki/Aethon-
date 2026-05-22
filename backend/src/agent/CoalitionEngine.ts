import { ethers } from "ethers";
import type { AgentConfig } from "./config.js";

export interface PeerCandidate {
  address: string;
  agentType: string;
  reputation: number;
  stake: bigint;
}

export class CoalitionEngine {
  constructor(
    private config: AgentConfig,
    private provider: ethers.JsonRpcProvider
  ) {}

  async discoverPeers(agentType: string): Promise<PeerCandidate[]> {
    // ADP discovery stub — production would query Somnia ADP port 9090
    console.log(`[CoalitionEngine] Discovering ${agentType} peers via ADP`);
    return [];
  }

  evaluateFitness(members: PeerCandidate[], complexity: number): boolean {
    return members.length >= complexity && members.every((m) => m.reputation >= this.config.minReputation);
  }

  async signCoalitionIntent(members: string[], taskId: bigint, wallet: ethers.Wallet): Promise<string> {
    const msgHash = ethers.solidityPackedKeccak256(["address[]", "uint256"], [members, taskId]);
    return wallet.signMessage(ethers.getBytes(msgHash));
  }
}
