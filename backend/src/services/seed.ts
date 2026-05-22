import { store } from "./store.js";

/** Seed demo records when contracts are not yet deployed on-chain. */
export function seedDemoData(): void {
  if (store.listAgents().length > 0) return;

  const agents = [
    { address: "0xA000000000000000000000000000000000000001", agentType: "ARBITRAGE", stake: "200000000000000000", reputation: 122 },
    { address: "0xA000000000000000000000000000000000000002", agentType: "ORACLE", stake: "100000000000000000", reputation: 120 },
    { address: "0xA000000000000000000000000000000000000003", agentType: "YIELD_OPT", stake: "500000000000000000", reputation: 130 },
  ] as const;

  for (const a of agents) {
    store.upsertAgent({
      ...a,
      online: true,
      lastHeartbeat: new Date().toISOString(),
    });
  }

  store.upsertTask({
    id: 1,
    submitter: "0xB000000000000000000000000000000000000001",
    taskHash: "0x" + "ab".repeat(32),
    reward: "1000000000000000000",
    complexity: 2,
    deadline: new Date(Date.now() + 3_600_000).toISOString(),
    status: "PENDING",
  });
  store.taskCounter = 1;
}
