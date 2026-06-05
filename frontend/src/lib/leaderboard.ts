import type { Agent } from "../api/client";

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

/** Highest reputation on the current page (matches API sort: reputation desc). */
export function pageTopReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return agents[0]?.reputation ?? null;
}

/** Lowest reputation on the current page. */
export function pageBottomReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return agents[agents.length - 1]?.reputation ?? null;
}
