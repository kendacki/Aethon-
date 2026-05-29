# Somnia Agentic L1 — AETHON Integration

AETHON is an **application-layer agent economy** on Somnia. It complements Somnia's native **platform agents** (validator-consensus compute) with its own on-chain registry, task market, coalitions, and five specialized worker roles.

## Two layers on Somnia

| Layer | What it is | AETHON usage |
|-------|------------|--------------|
| **Somnia platform agents** | Built-in JSON API, LLM Inference, LLM Parse Website invoked via `SomniaAgents` contract | ORACLE price feeds, GOVERNANCE LLM summaries |
| **AETHON contracts** | Custom `AgentRegistry`, `TaskMarket`, `CoalitionManager`, `ReputationEngine` | Agent staking, heartbeats, task settlement, coalition rewards |

References:

- [Somnia Agents overview](https://docs.somnia.network/agents)
- [Invoking from Solidity](https://docs.somnia.network/agents/invoking-agents/from-solidity)
- [Agent Explorer (testnet)](https://agents.testnet.somnia.network)
- [Building on the Agentic L1](https://blog.somnia.network/p/building-on-the-agentic-l1-a-developers)

## Fit matrix

| Somnia capability | AETHON status | Implementation |
|-------------------|---------------|----------------|
| EVM on Somnia (50312 testnet) | Done | All contracts + wallet/SIWE on chain 50312 |
| Sub-second finality / reactive tasks | Done | `REACTIVITY_ENABLED` — agents subscribe to `TaskSubmitted` |
| JSON API oracle (consensus) | Done | ORACLE uses `SomniaAgentsClient.fetchJsonUint` when enabled |
| LLM inference (deterministic) | Done | GOVERNANCE uses `inferString` summary when enabled |
| LLM parse website | Planned | Agent ID configured; wire for prediction-market tasks |
| On-chain agent registry | Done | AETHON `AgentRegistry` (5 roles, stake, heartbeat) |
| Agent discovery (ADP) | Partial | `CoalitionEngine` tries ADP then API registry |
| Fleet health / monitoring | Done | `/v1/agents/fleet-health` + Railway worker health |
| Agentathon end-to-end demo | Needs consumer | Deploy `SomniaAgentConsumer` + fund agent wallets |

## Base agent IDs (testnet + mainnet)

| Agent | ID | Cost (practical deposit) | Used by |
|-------|-----|--------------------------|---------|
| JSON API Request | `13174292974160097713` | 0.12 STT | ORACLE |
| LLM Inference | `12847293847561029384` | 0.24 STT | GOVERNANCE |
| LLM Parse Website | `12875401142070969085` | 0.33 STT | Future tasks |

Platform contract:

- **Testnet:** `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
- **Mainnet:** `0x5E5205CF39E766118C01636bED000A54D93163E6`

## Enable Somnia platform integration

1. Deploy the relay consumer (once per network):

```bash
cd backend
npm run deploy:somnia-consumer
```

2. Set env on **API + all agent workers** (agent wallets need STT for deposits):

```env
SOMNIA_AGENTS_ENABLED=true
SOMNIA_AGENTS_PLATFORM_ADDR=0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
SOMNIA_AGENT_CONSUMER_ADDR=0x25b77725D9BB1a5e56b694b26A79f82c2Bb136F6
SOMNIA_JSON_API_AGENT_ID=13174292974160097713
SOMNIA_LLM_AGENT_ID=12847293847561029384
SOMNIA_KIT_REGISTRY_ADDR=0xC9f3452090EEB519467DEa4a390976D38C008347
```

3. Fund ORACLE and GOVERNANCE agent wallets with extra STT (~0.5 STT each for several invocations).

4. Register fleet in Somnia Agent Kit registry:

```bash
npm run register:somnia-kit
npm run verify:somnia
```

Kit IDs (testnet): ARBITRAGE #47, ORACLE #48, YIELD_OPT #49, GOVERNANCE #50, RISK_MGMT #51.

5. Verify compatibility:

```bash
curl https://<api>/v1/somnia/agents
```

Look for `"agentathonReady": true` and empty `gaps`.

## Architecture

```
User (SIWE) → API → TaskMarket (on-chain)
                         ↓ TaskSubmitted
              AETHON agent workers (5 roles)
                         ↓
         ┌───────────────┴────────────────┐
         │ SomniaAgentConsumer (on-chain) │
         │  → SomniaAgents platform       │
         │  → validator consensus         │
         └───────────────┬────────────────┘
                         ↓ callback
              ORACLE / GOVERNANCE skills
                         ↓
              Coalition completion → rewards + rep
```

## What AETHON adds beyond base Somnia agents

- **Multi-agent coalitions** — complexity-1..5 tasks require coordinated roles
- **Reputation + staking** — economic security separate from platform agent fees
- **Circuit breaker** — fleet-wide pause when failures exceed threshold
- **Skill manifests** — HTTP-discoverable capabilities at `/v1/agents/manifests/:role`
- **Signed skill results** — EIP-191 digests for off-chain coordination audit trail

## Remaining gaps (optional enhancements)

1. **TaskMarket to Somnia callback consumer** — trigger platform agents directly from task completion on-chain (today: off-chain workers invoke consumer).
2. **LLM Parse Website** — wire for news/prediction resolution tasks.
3. **Somnia Agent Kit registry** — separate ecosystem; AETHON uses its own registry by design.
4. **Mainnet migration** — swap platform address + redeploy consumer on chain 5031.

## API

`GET /v1/somnia/agents` returns full compatibility report: base agents, feature flags, gaps, and `agentathonReady`.
