import type { Agent } from "../api/client";

export const LEADERBOARD_PAGE_SIZE = 20;

/** Global wallet rank on the paginated list: 1 = first row, total = last. */
export function globalRank(page: number, index: number, pageSize = LEADERBOARD_PAGE_SIZE): number {
  return page * pageSize + index + 1;
}

export type RankTier = "leader" | "podium" | "field";

/** Visual tier from role rank — role 1 is leader, roles 2–3 podium, rest field. */
export function rankTier(roleRank: number): RankTier {
  if (roleRank === 1) return "leader";
  if (roleRank <= 3) return "podium";
  return "field";
}

export function isLastRankOnPage(rank: number, page: number, pageSize: number, total: number): boolean {
  const end = Math.min((page + 1) * pageSize, total);
  return rank === end && total > 1;
}

/** Match API order: role reputation desc, role stake desc, agent type asc, address asc. */
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
  if (a.agentType !== b.agentType) return a.agentType.localeCompare(b.agentType);
  return a.address.localeCompare(b.address);
}

/** All wallets sorted for display (reputation/stake are role aggregates from API). */
export function sortLeaderboardAgents(agents: Agent[]): Agent[] {
  return [...agents].sort(compareLeaderboardAgents);
}

/** One representative wallet per role for the top three roles by aggregate reputation. */
export function topThreeRolesForPodium(agents: Agent[]): Agent[] {
  const sorted = sortLeaderboardAgents(agents);
  const seen = new Set<string>();
  const roles: Agent[] = [];
  for (const agent of sorted) {
    if (seen.has(agent.agentType)) continue;
    seen.add(agent.agentType);
    roles.push(agent);
    if (roles.length >= 3) break;
  }
  return roles;
}

export function roleRankOf(agent: Agent): number {
  return agent.roleRank ?? 99;
}

/** Highest role aggregate reputation on the current page. */
export function pageTopReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return Math.max(...agents.map((a) => a.reputation));
}

/** Lowest role aggregate reputation on the current page. */
export function pageBottomReputation(agents: Agent[]): number | null {
  if (!agents.length) return null;
  return Math.min(...agents.map((a) => a.reputation));
}
