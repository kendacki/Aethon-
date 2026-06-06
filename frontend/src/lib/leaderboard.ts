import type { Agent } from "../api/client";
import { dedupeFleetByRole } from "./fleetAgentStatus";

export const LEADERBOARD_PAGE_SIZE = 20;

/** Global rank: 1 = highest reputation, total = lowest. */
export function globalRank(page: number, index: number, pageSize = LEADERBOARD_PAGE_SIZE): number {
  return page * pageSize + index + 1;
}

export function rankRangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "no agents ranked";
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return `rank ${start}–${end} of ${total}`;
}

export type RankTier = "leader" | "podium" | "field";

/** Visual tier from global position — rank 1 is leader, 2–3 podium, rest field. */
export function rankTier(rank: number): RankTier {
  if (rank === 1) return "leader";
  if (rank <= 3) return "podium";
  return "field";
}

export function isLastRankOnPage(rank: number, page: number, pageSize: number, total: number): boolean {
  const end = Math.min((page + 1) * pageSize, total);
  return rank === end && total > 1;
}

/** Match API / DB order: reputation desc, then stake desc, then address asc. */
export function compareLeaderboardAgents(a: Agent, b: Agent): number {
  if (b.reputation !== a.reputation) return b.reputation - a.reputation;
  try {
    const stakeA = BigInt(a.stake || "0");
    const stakeB = BigInt(b.stake || "0");
    if (stakeB > stakeA) return 1;
    if (stakeB < stakeA) return -1;
  } catch {
    /* ignore invalid stake */
  }
  return a.address.localeCompare(b.address);
}

/** One agent per role, ranked highest reputation first (for leaderboard + podium). */
export function rankAgentsForLeaderboard(agents: Agent[]): Agent[] {
  return [...dedupeFleetByRole(agents)].sort(compareLeaderboardAgents);
}

/** Highest reputation on the current ranked page. */
export function pageTopReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return Math.max(...agents.map((a) => a.reputation));
}

/** Lowest reputation on the current ranked page. */
export function pageBottomReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return Math.min(...agents.map((a) => a.reputation));
}
