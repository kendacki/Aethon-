<div align="center">

# AETHON

**Autonomous Emergent Trading and Hierarchical Operations Network**

A multi agent desk for DeFi decisions on Somnia

**Live app:** [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app)  
**API health:** [aethon-production-3f5a.up.railway.app/v1/health](https://aethon-production-3f5a.up.railway.app/v1/health)

</div>

## What is AETHON?

AETHON is a **task market for specialized crypto agents**. You ask a question in plain English, pay a small STT reward, and five autonomous agents research, sign, and return a verified answer on chain.

Instead of one generic chatbot, you get a **desk of specialists** that work alone or together:

| Agent | Role |
|-------|------|
| **ORACLE** | Live asset prices with signed attestations |
| **ARBITRAGE** | Cross venue spread scans with gas adjusted profit |
| **YIELD_OPT** | Yield allocation from live DefiLlama pools |
| **GOVERNANCE** | Quorum math, vote recommendation, proposal summary |
| **RISK_MGMT** | Fleet health, circuit breaker, proceed or pause |

Each agent has **stake, reputation, and signed skill results** so outputs are accountable, not anonymous model text.

## Practical use case

**Scenario:** Your team is about to vote on a treasury move. You need price context, yield options, governance math, and a fleet health check before committing capital.

**What you do:**

1. Connect wallet on [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app) and sign in.
2. Ask: *"Brief me on ETH: live price, arbitrage spreads, yield options for 1 ETH, governance on AIP 1, and fleet risk."*
3. Submit one **swarm task** (all five agents).
4. Within minutes you receive a **single coordinated answer**: spot price, spread view, allocation plan, vote analysis, and risk score with clear next steps.

**Why it matters:** One submission replaces five dashboards, three APIs, and a manual spreadsheet. Every number comes from **live tools** (CoinGecko, DefiLlama, on chain state), not hallucinated chat.

## How it works

```
You submit a task (wallet + STT reward)
        ↓
TaskMarket on Somnia records the job on chain
        ↓
Agents form a coalition when the job needs multiple roles
        ↓
Each agent runs its skill (price, spread, yield, vote, risk)
        ↓
Results are signed, aggregated, and settled with reputation updates
```

**Single agent tasks** (e.g. "What is ETH price?") route to one specialist.  
**Swarm tasks** run all five agents and merge their reports.

Agents also use **retrieval augmented knowledge** (PostgreSQL full text + optional pgvector) and a **plan → execute → verify** loop so failures degrade gracefully with recovery guidance.

## Try it in five steps

1. Open the [live app](https://aethon-lemon.vercel.app).
2. Connect wallet on **Somnia (chain 50312)**.
3. **Sign in** with SIWE.
4. Go to **Tasks**, pick an example or type your question, then **Run task**.
5. Watch the answer appear when status reaches **COMPLETED**.

Testnet STT: [testnet.somnia.network](https://testnet.somnia.network/)

## Built on Somnia

| Layer | What AETHON uses |
|-------|------------------|
| **Somnia EVM** | Contracts, stakes, tasks, coalitions (chain 50312) |
| **Platform agents** | Consensus price feeds and LLM summaries via `SomniaAgentConsumer` |
| **Agent Kit registry** | Fleet discovery (Kit IDs #47 to #51) |
| **AethonFleetVault** | Per agent operational reserves |

Details: [docs/SOMNIA_INTEGRATION.md](docs/SOMNIA_INTEGRATION.md)

## Core contracts (Somnia 50312)

| Contract | Address |
|----------|---------|
| AgentRegistry | [`0x98b1Ea58222842fddA6351dB5b8e73BAC40EF52F`](https://shannon-explorer.somnia.network/address/0x98b1Ea58222842fddA6351dB5b8e73BAC40EF52F) |
| TaskMarket | [`0x8C9D76B82fB7bd5D56061CfA0Df0983028f314Fc`](https://shannon-explorer.somnia.network/address/0x8C9D76B82fB7bd5D56061CfA0Df0983028f314Fc) |
| CoalitionManager | [`0x55B189B30980c95Bfb2936de0ed11e54fC590648`](https://shannon-explorer.somnia.network/address/0x55B189B30980c95Bfb2936de0ed11e54fC590648) |
| ReputationEngine | [`0xC02bEdcBeBFd05cDcB9E0C35afaed444A8979B91`](https://shannon-explorer.somnia.network/address/0xC02bEdcBeBFd05cDcB9E0C35afaed444A8979B91) |
| CircuitBreaker | [`0x4Eed8B20f302b8A28f375F5b7FE33E2296803893`](https://shannon-explorer.somnia.network/address/0x4Eed8B20f302b8A28f375F5b7FE33E2296803893) |
| SomniaAgentConsumer | [`0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353`](https://shannon-explorer.somnia.network/address/0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353) |
| AethonFleetVault | [`0x71bb54c9507387B716199D72858a1F4DEB8FfE1b`](https://shannon-explorer.somnia.network/address/0x71bb54c9507387B716199D72858a1F4DEB8FfE1b) |

Full deployment record: [`backend/deployments/somniaTestnet-50312.json`](backend/deployments/somniaTestnet-50312.json)

## Tech stack

| Layer | Stack |
|-------|--------|
| Chain | Somnia (EVM, 50312) |
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Backend | Node.js, TypeScript, Express, PostgreSQL |
| Real time | WebSocket (`tasks`, `agents`, `circuit_breaker`) |
| Auth | SIWE + JWT |
| Frontend | React 18, Vite, ethers v6 |
| Agents | Custom runtime, live data tools, RAG knowledge base |
| Deploy | Railway (API + workers), Vercel (frontend) |

## Repository layout

```
Aethon/
├── backend/          API, agent workers, contracts, migrations
├── frontend/         React app (Overview, Tasks, Agents)
├── docs/             Integration and ops guides
└── docker-compose.yml
```

## Run locally

**Prerequisites:** Node.js 22+, PostgreSQL 16 (or Docker), wallet with Somnia testnet STT.

```bash
git clone https://github.com/kendacki/Aethon-.git
cd Aethon-/backend && npm install && npm run db:migrate && npm run build && npm run start:api
cd ../frontend && npm install && npm run dev
```

Copy contract addresses from `backend/deployments/somniaTestnet-50312.json` into `backend/.env`.  
Optional agent worker: `AGENT_TYPE=ORACLE AGENT_PRIVATE_KEY=<key> npm run start:agent`

More detail: [docs/AGENTS.md](docs/AGENTS.md) · [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md)

## Production notes

**Railway (backend):** Set root to `backend`. Migrations run on deploy via `preDeployCommand` (not on every API replica). Template env: [`backend/env/railway-contracts-50312.env.example`](backend/env/railway-contracts-50312.env.example)

**Vercel (frontend):**

```env
VITE_API_URL=https://aethon-production-3f5a.up.railway.app
VITE_WS_URL=wss://aethon-production-3f5a.up.railway.app/ws
VITE_SIWE_DOMAIN=aethon-lemon.vercel.app
VITE_SIWE_URI=https://aethon-lemon.vercel.app
VITE_SOMNIA_CHAIN_ID=50312
```

Never commit private keys or production secrets.

## API quick reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/health` | Sync and circuit state |
| GET | `/v1/stats` | Fleet and task stats |
| GET | `/v1/agents/fleet-health` | Agent diagnostics |
| GET | `/v1/knowledge/:role` | RAG citations for agents |
| POST | `/v1/tasks/submit` | Submit task (SIWE required) |

OpenAPI docs: `{API_URL}/docs`

## Network

| | |
|---|---|
| Chain ID | 50312 |
| RPC | `https://dream-rpc.somnia.network` |
| Explorer | [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network) |
| Faucet | [testnet.somnia.network](https://testnet.somnia.network/) |

## License

MIT
