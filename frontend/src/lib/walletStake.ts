import type { WalletTaskStats } from "../api/client";
import { formatEth } from "../api/client";

export type StakeSummary = {
  headline: string;
  detail: string;
  breakdown: Array<{ label: string; value: string }>;
};

/** Copy and breakdown for operator wallet stake (TaskMarket escrow), not agent earnings. */
export function summarizeWalletStake(stats: WalletTaskStats | null, taskCount: number): StakeSummary {
  if (!stats || taskCount === 0) {
    return {
      headline: "0 STT",
      detail:
        "When you submit a task, STT is sent from your connected wallet into the on chain TaskMarket as job stake. It is not a reward paid to you.",
      breakdown: [
        { label: "On completion", value: "Stake pays the agent coalition (minus platform fee)." },
        { label: "On failure / expiry", value: "Full stake refunds to your connected wallet." },
        { label: "While open", value: "Stake stays escrowed in the contract until settled." },
      ],
    };
  }

  const total = formatEth(stats.totalStakedWei);
  const active = BigInt(stats.activeEscrowWei);
  const paid = BigInt(stats.paidToAgentsWei);
  const refunded = BigInt(stats.refundedWei);

  let detail =
    "Total STT you have attached across submitted tasks. Funds move from your wallet into TaskMarket escrow at submit time.";

  if (active > 0n) {
    detail += ` ${formatEth(stats.activeEscrowWei)} is still locked for open jobs.`;
  }
  if (paid > 0n) {
    detail += ` ${formatEth(stats.paidToAgentsWei)} was paid out to agents on completed tasks (not credited back to you).`;
  }
  if (refunded > 0n) {
    detail += ` ${formatEth(stats.refundedWei)} was refunded to your connected wallet after failed or expired tasks.`;
  }

  return {
    headline: total,
    detail,
    breakdown: [
      { label: "In escrow (open)", value: formatEth(stats.activeEscrowWei) },
      { label: "Paid to agents", value: formatEth(stats.paidToAgentsWei) },
      { label: "Refunded to you", value: formatEth(stats.refundedWei) },
    ],
  };
}
