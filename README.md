<div align="center">

# AETHON

**Autonomous Emergent Trading and Hierarchical Operations Network**

A multi agent desk for DeFi decisions on Somnia

**Live app:** [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app)  
**API health:** [aethon-production-3f5a.up.railway.app/v1/health](https://aethon-production-3f5a.up.railway.app/v1/health)

</div>

## What is AETHON?

AETHON is a **task market for specialized crypto agents**. You ask a question in plain English, pay a small STT reward, and five autonomous agents research, sign, and return a verified answer on chain.

Instead of one chatbot, you get a **desk of Agent specialists** that work alone or together:

| Agent | Role |
|-------|------|
| **ORACLE** | Live asset prices with signed attestations |
| **ARBITRAGE** | Cross venue spread scans with gas adjusted profit |
| **YIELD_OPT** | Yield allocation from live DefiLlama pools |
| **GOVERNANCE** | Quorum math, vote recommendation, proposal summary |
| **RISK_MGMT** | Fleet health, circuit breaker, proceed or pause |

Each agent has **stake, reputation, and signed skill results** so outputs are accountable, not anonymous model text.

## Practical use case (story)

**Maria, DAO treasury lead**

Maria manages a community treasury on Somnia. AIP 12 will allocate 80,000 STT toward liquidity incentives. Before the vote, she needs one trusted briefing: current ETH price, whether arbitrage is worth acting on, where idle ETH could earn yield, whether the proposal meets quorum, and if the agent fleet is healthy enough to run production tasks.

**Her goal**

> "I want a single verified briefing I can share with delegates. No juggling five tabs. Every number must come from live data, not guesswork."

**The process**

1. Maria opens [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app), connects her wallet on Somnia, and signs in with SIWE.
2. She asks: *"Brief me on ETH: live price, arbitrage spreads, yield options for 1 ETH, governance on AIP 12 with 15 STT for and 4 STT against quorum 10 STT, and fleet risk."*
3. She submits one **swarm task** (0.5 STT reward, all five agents).
4. On chain, **TaskMarket** records the job. Agents post coalition intents, form a group, and each specialist runs its skill.
5. **ORACLE** pulls a signed spot price. **ARBITRAGE** compares live venues and gas. **YIELD_OPT** ranks DefiLlama pools. **GOVERNANCE** runs quorum math and vote logic. **RISK_MGMT** checks the circuit breaker and fleet liveness.
6. Each agent signs its result. The lead agent aggregates everything into one answer in the app.

**The tech stack behind Maria's task**

| Layer | What runs |
|-------|-----------|
| **Frontend** | React app on Vercel. Wallet connect, task submit, live task status. |
| **API** | Express on Railway. Auth, payloads, knowledge retrieval, WebSocket updates. |
| **Agents** | Five Railway workers. Plan, retrieve, execute, verify loop with live tools. |
| **Data** | CoinGecko, DefiLlama, DexScreener, on chain RPC, PostgreSQL RAG knowledge base. |
| **Chain** | Somnia EVM. TaskMarket, CoalitionManager, ReputationEngine, signed skill results. |

**The end result**

Maria receives one coordinated report in under two minutes:

- **Price:** Ethereum at a fresh USD quote with wallet attestation.
- **Arbitrage:** Spread in basis points, best venues, hold or execute after gas.
- **Yield:** Allocation split across live pools with blended APY.
- **Governance:** Quorum status, support ratio, recommended FOR or AGAINST vote.
- **Risk:** Fleet score out of 100, circuit state, clear proceed or pause guidance.

She pastes the summary into the delegate forum. The vote proceeds with shared facts instead of conflicting screenshots. Reputation and rewards settle on chain for every agent that participated.

**Why it matters:** Maria asked once and got everything in one place. The agents handled the research. She focused on the vote.

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

**Single agent tasks** (e.g. "What is ETH price?") route to one Agent specialist.  
**Swarm tasks** run all five agents and merge their reports.

Agents also use **retrieval augmented knowledge** (PostgreSQL full text and optional pgvector) and a **plan, execute, verify** loop so failures degrade gracefully with recovery guidance.
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
| **Somnia EVM** | Contracts, stakes, tasks, coalitions |
| **Platform agents** | Consensus price feeds and LLM summaries via `SomniaAgentConsumer` |
| **Agent Kit registry** | Fleet discovery (Kit IDs #47 to #51) |
| **AethonFleetVault** | Per agent operational reserves |

Details: [docs/SOMNIA_INTEGRATION.md](docs/SOMNIA_INTEGRATION.md)

## Core contracts

| Contract | Address |
|----------|---------|
| AgentRegistry | [`0xd5F9C2BaDf583181416Fa42dcF21413c7E29FC88`](https://shannon-explorer.somnia.network/address/0xd5F9C2BaDf583181416Fa42dcF21413c7E29FC88) |
| TaskMarket | [`0x26fFf2529F76B23AD04863AcAFf7e926c16d2D60`](https://shannon-explorer.somnia.network/address/0x26fFf2529F76B23AD04863AcAFf7e926c16d2D60) |
| CoalitionManager | [`0x3199def700569334B4fCc13C3CF6f0dFf0BEdC99`](https://shannon-explorer.somnia.network/address/0x3199def700569334B4fCc13C3CF6f0dFf0BEdC99) |
| ReputationEngine | [`0x31945318720129a63b400afd98AE66970399F55e`](https://shannon-explorer.somnia.network/address/0x31945318720129a63b400afd98AE66970399F55e) |
| CircuitBreaker | [`0xC3989534379C8DEb993DD8DA2a3c356a218c63CB`](https://shannon-explorer.somnia.network/address/0xC3989534379C8DEb993DD8DA2a3c356a218c63CB) |
| SomniaAgentConsumer | [`0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353`](https://shannon-explorer.somnia.network/address/0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353) |
| AethonFleetVault | [`0x6325Cdc86b8103eB31B55934Ce73A52B38198Abb`](https://shannon-explorer.somnia.network/address/0x6325Cdc86b8103eB31B55934Ce73A52B38198Abb) |

Full deployment record: [`backend/deployments/somniaTestnet-50312.json`](backend/deployments/somniaTestnet-50312.json)

## Production fleet status (June 2026)

Last verified: **2026-06-06** on Somnia testnet (chain 50312). Minimum recommended balance: **0.5 STT** gas + **0.5 STT** registry stake per agent; **2+ STT** on relayer for task rewards.

### Wallets and balances

| Role | Address | STT balance | On-chain |
|------|---------|-------------|----------|
| **Relayer / deployer** | [`0x2132…d6D6`](https://shannon-explorer.somnia.network/address/0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6) | 5.44 | Task reward payouts (API only) |
| **ARBITRAGE** | [`0x0eec…8037`](https://shannon-explorer.somnia.network/address/0x0eec621450cA9a0445DBdadC0624FDD5cc888037) | 9.42 | Registered, active, online |
| **ORACLE** | [`0xfc50…482C`](https://shannon-explorer.somnia.network/address/0xfc501c679aFb3689191448f92621ACD49e86482C) | 9.38 | Registered, active, online |
| **YIELD_OPT** | [`0x6BDe…4F9e`](https://shannon-explorer.somnia.network/address/0x6BDe11143f5aE057eBFbc24Ce6189D99cd0B4F9e) | 8.51 | Registered, active, online |
| **GOVERNANCE** | [`0xBaB3…C9d0`](https://shannon-explorer.somnia.network/address/0xBaB3E5C546B005794BE59A2D359a28e57EC6C9d0) | 8.47 | Registered, active, online |
| **RISK_MGMT** | [`0x2522…60bB`](https://shannon-explorer.somnia.network/address/0x25229e52bd699F82C1dcF3257bC3299fC98960bB) | 9.44 | Registered, active, online |

Retired wallet `0xBA28…CB2EC` must **not** be used for relayer or agents.

### Railway services

| Service | URL | Expected |
|---------|-----|----------|
| **API** | [aethon-production-3f5a.up.railway.app](https://aethon-production-3f5a.up.railway.app/v1/health) | `AETHON_RUNTIME=api`, returns JSON health (**fix required if 503**) |
| **ARBITRAGE** | [aethon-agent-arbitrage-production.up.railway.app/health](https://aethon-agent-arbitrage-production.up.railway.app/health) | Live, correct wallet; DEGRADED until API is fixed |
| **ORACLE** | [aethon-agent-oracle-production.up.railway.app/health](https://aethon-agent-oracle-production.up.railway.app/health) | same |
| **YIELD_OPT** | [aethon-agent-yield-production.up.railway.app/health](https://aethon-agent-yield-production.up.railway.app/health) | same |
| **GOVERNANCE** | [aethon-agent-governance-production.up.railway.app/health](https://aethon-agent-governance-production.up.railway.app/health) | same |
| **RISK_MGMT** | [aethon-agent-risk-production.up.railway.app/health](https://aethon-agent-risk-production.up.railway.app/health) | same |

**API service checklist:** `AETHON_RUNTIME=api`, `RELAYER_PRIVATE_KEY` → deployer `0x2132…d6D6`, contract vars from [`backend/env/railway-contracts-50312.env.example`](backend/env/railway-contracts-50312.env.example), `INDEXER_START_BLOCK=401587367`. Run `node backend/scripts/print-railway-env.cjs` after deploy.

**Agent workers:** `AETHON_RUNTIME=agent`, role-specific `AGENT_PRIVATE_KEY` from `backend/env/agents/*.env`. **Do not** set `RELAYER_PRIVATE_KEY` on agents.

After redeploying contracts, re-register: `node backend/scripts/register-agents-on-registry.cjs`

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

**Contract upgrade (June 2026):** Redeploy TaskMarket if your deployment predates owner-gated `setOracleResolver` / `setFleetVault` and reporter-only `executeSwarmForTask`. See [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md#contract-security-taskmarket-v31).

See [Production fleet status](#production-fleet-status-june-2026) for live wallet balances, Railway URLs, and env checklist.

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
