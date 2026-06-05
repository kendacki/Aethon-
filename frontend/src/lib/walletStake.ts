import type { WalletTaskStats } from "../api/client";
import { formatEth } from "../api/client";

export type StakeSummary = {
  headline: string;
  detail: string;
  breakdown: Array<{ label: string; value: string }>;
};

/** Operator wallet stake in the on-chain TaskMarket (not agent earnings). */
export function summarizeWalletStake(stats: WalletTaskStats | null, taskCount: number): StakeSummary {
  if (!stats || taskCount === 0) {
    return {
      headline: "0 STT",
      detail: "STT moves to the on-chain TaskMarket when you submit a task.",
      breakdown: [
        { label: "Completed", value: "Stake pays agents after the platform fee." },
        { label: "Failed or expired", value: "Stake returns to your wallet." },
        { label: "Open", value: "Stake stays in the contract until settled." },
      ],
    };
  }

  const total = formatEth(stats.totalStakedWei);
  const active = BigInt(stats.activeEscrowWei);
  const paid = BigInt(stats.paidToAgentsWei);
  const refunded = BigInt(stats.refundedWei);

  let detail = "Total STT across your submitted tasks.";

  if (active > 0n) {
    detail += ` ${formatEth(stats.activeEscrowWei)} is locked in open tasks.`;
  }
  if (paid > 0n) {
    detail += ` ${formatEth(stats.paidToAgentsWei)} went to agents on completed tasks.`;
  }
  if (refunded > 0n) {
    detail += ` ${formatEth(stats.refundedWei)} was returned to your wallet.`;
  }

  return {
    headline: total,
    detail,
    breakdown: [
      { label: "Open tasks", value: formatEth(stats.activeEscrowWei) },
      { label: "Paid to agents", value: formatEth(stats.paidToAgentsWei) },
      { label: "Refunded", value: formatEth(stats.refundedWei) },
    ],
  };
}
