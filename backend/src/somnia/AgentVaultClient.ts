import { ethers } from "ethers";
import { SOMNIA_KIT_CONTRACTS } from "./kitModules.js";

export interface VaultConfig {
  enabled: boolean;
  vaultAddr: string;
  dailyLimitWei: bigint;
  minVaultBalanceWei: bigint;
}

const VAULT_ABI = [
  "function createVault(address agent, uint256 dailyLimit)",
  "function depositNative(address agent) payable",
  "function withdrawNative(address agent, address recipient, uint256 amount)",
  "function getNativeBalance(address agent) view returns (uint256)",
  "function isVaultActive(address agent) view returns (bool)",
  "function getDailyLimitInfo(address agent) view returns (uint256 limit, uint256 spent, uint256 remaining, uint256 resetTime)",
  "event VaultCreated(address indexed agent, uint256 dailyLimit)",
  "event NativeDeposit(address indexed agent, address indexed depositor, uint256 amount)",
] as const;

export function loadVaultConfig(): VaultConfig {
  const vaultAddr =
    process.env.AETHON_FLEET_VAULT_ADDR ??
    process.env.SOMNIA_KIT_VAULT_ADDR ??
    SOMNIA_KIT_CONTRACTS.agentVault;
  return {
    enabled: process.env.SOMNIA_VAULT_ENABLED === "true",
    vaultAddr,
    dailyLimitWei: BigInt(process.env.SOMNIA_VAULT_DAILY_LIMIT_WEI ?? String(10n * 10n ** 18n)),
    minVaultBalanceWei: BigInt(process.env.SOMNIA_VAULT_MIN_BALANCE_WEI ?? "100000000000000000"), // 0.1 STT
  };
}

export function isAethonVaultAddr(addr: string): boolean {
  return Boolean(process.env.AETHON_FLEET_VAULT_ADDR && addr.toLowerCase() === process.env.AETHON_FLEET_VAULT_ADDR.toLowerCase());
}

export class AgentVaultClient {
  private vault: ethers.Contract;

  constructor(
    private cfg: VaultConfig,
    private provider: ethers.Provider,
    private signer?: ethers.Signer,
  ) {
    this.vault = new ethers.Contract(cfg.vaultAddr, VAULT_ABI, signer ?? provider);
  }

  static fromEnv(provider: ethers.Provider, signer?: ethers.Signer): AgentVaultClient | null {
    const cfg = loadVaultConfig();
    if (!cfg.enabled || !cfg.vaultAddr.startsWith("0x")) return null;
    return new AgentVaultClient(cfg, provider, signer);
  }

  async getStatus(agentAddress: string): Promise<{
    active: boolean;
    balanceWei: bigint;
    dailyLimitWei: bigint;
    spentWei: bigint;
    remainingWei: bigint;
  }> {
    const active = await this.vault.isVaultActive(agentAddress);
    if (!active) {
      return {
        active: false,
        balanceWei: 0n,
        dailyLimitWei: 0n,
        spentWei: 0n,
        remainingWei: 0n,
      };
    }
    const balanceWei = (await this.vault.getNativeBalance(agentAddress)) as bigint;
    const [limit, spent, remaining] = (await this.vault.getDailyLimitInfo(agentAddress)) as [
      bigint,
      bigint,
      bigint,
      bigint,
    ];
    return {
      active: true,
      balanceWei,
      dailyLimitWei: limit,
      spentWei: spent,
      remainingWei: remaining,
    };
  }

  async deposit(agentAddress: string, amountWei: bigint): Promise<string> {
    if (!this.signer) throw new Error("Signer required for vault deposit");
    const tx = await this.vault.depositNative(agentAddress, { value: amountWei });
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  }
}
