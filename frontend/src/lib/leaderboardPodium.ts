import type { Agent } from "../api/client";

/** Podium layout: silver (left) · gold (center) · bronze (right). */
export type PodiumSlot = {
  agent: Agent;
  rank: 1 | 2 | 3;
  medal: "gold" | "silver" | "bronze";
};

export function buildPodiumSlots(topThree: Agent[]): PodiumSlot[] {
  if (topThree.length < 3) return [];

  return [
    { agent: topThree[1], rank: 2, medal: "silver" },
    { agent: topThree[0], rank: 1, medal: "gold" },
    { agent: topThree[2], rank: 3, medal: "bronze" },
  ];
}
