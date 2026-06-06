import type { Agent } from "../api/client";

/** Podium layout: silver (left) · gold (center) · bronze (right). */
export type PodiumSlot = {
  agent: Agent;
  rank: 1 | 2 | 3;
  medal: "gold" | "silver" | "bronze";
};

/** Expects topThree sorted by reputation desc: [1st, 2nd, 3rd]. */
export function buildPodiumSlots(topThree: Agent[]): PodiumSlot[] {
  if (topThree.length < 3) return [];

  const [gold, silver, bronze] = topThree;

  return [
    { agent: silver, rank: 2, medal: "silver" },
    { agent: gold, rank: 1, medal: "gold" },
    { agent: bronze, rank: 3, medal: "bronze" },
  ];
}
