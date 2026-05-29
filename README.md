<div align="center" style="font-family: 'Times New Roman', Times, serif;">

# AETHON

**Autonomous Emergent Trading & Hierarchical Operations Network**

*A self-governing agent economy on Somnia*

---

**Live app:** [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app)  
**API:** [aethon-production-3f5a.up.railway.app](https://aethon-production-3f5a.up.railway.app/v1/health)  
**Repo:** [github.com/kendacki/Aethon-](https://github.com/kendacki/Aethon-)

</div>

<div style="font-family: 'Times New Roman', Times, serif;">

---

## What is AETHON?

AETHON is a **multi-agent operating system for financial decisions**.

Instead of one chatbot doing everything, AETHON runs **five specialized agents** that work together like a small desk:

| Agent | What it does (in plain English) |
|-------|----------------------------------|
| **ARBITRAGE** | Checks if prices differ enough across venues to make a trade worthwhile |
| **ORACLE** | Fetches and signs verified asset prices |
| **YIELD_OPT** | Recommends where to park funds for the best risk-adjusted yield |
| **GOVERNANCE** | Analyzes DAO proposals — quorum, vote math, and plain-language summaries |
| **RISK_MGMT** | Monitors protocol health and recommends proceed or pause |

You **submit one task** (with a small STT reward). Agents pick it up on-chain, form a **coalition** when the job is complex, execute their skills, and settle rewards and reputation on-chain.

**New to Web3?** Think of it as: *post a job → autonomous workers bid and collaborate → you get a signed report back.*

---

## What problem does it solve?

| Problem today | How AETHON helps |
|---------------|------------------|
| DAOs and treasuries rely on manual spreadsheets and forum posts before big moves | One **swarm task** produces price, yield, governance, liquidity, and risk checks in parallel |
| “AI agents” are often a single LLM with no accountability | Five **role-specific agents** with on-chain stake, reputation, and signed skill results |
| DeFi ops are fragmented across dashboards | One **Task Market** + live **fleet health** view |
| Oracle and LLM calls are hard to trust | **Somnia L1 platform agents** provide validator-consensus JSON API and LLM inference |
| Failures can cascade silently | **Circuit breaker** halts the system; **RISK_MGMT** surfaces composite risk scores |

**Example use case:** A grants committee submits a complexity-5 swarm task before voting on an $80k allocation. In under two minutes they receive a coordinated diligence pack — not five separate tool outputs.

---

## How Somnia is used

AETHON is an **application layer** on [Somnia Agentic L1](https://docs.somnia.network/agents). Somnia provides two things we rely on:

### 1. EVM chain (Somnia)

All AETHON contracts, agent wallets, stakes, tasks, and coalitions live on **chain ID 50312**.

### 2. Somnia platform agents (validator-consensus compute)

| Somnia base agent | Used by | Purpose |
|-------------------|---------|---------|
| **JSON API Request** | ORACLE | Consensus-verified price feeds (e.g. ETH/USD) |
| **LLM Inference** | GOVERNANCE | Deterministic plain-language proposal summaries |
| **LLM Parse Website** | *(planned)* | Future news / prediction-market resolution |

Our relay contract **`SomniaAgentConsumer`** invokes the Somnia platform; agent workers read results and attach them to skill outputs.

### 3. Somnia Agent Kit registry (discovery)

All five fleet wallets are registered in the official Kit registry for ecosystem discovery and hackathon visibility:

| Role | Kit ID | Wallet |
|------|--------|--------|
| ARBITRAGE | #47 | `0x0eec621450cA9a0445DBdadC0624FDD5cc888037` |
| ORACLE | #48 | `0xfc501c679aFb3689191448f92621ACD49e86482C` |
| YIELD_OPT | #49 | `0x6BDe11143f5aE057eBFbc24Ce6189D99cd0B4F9e` |
| GOVERNANCE | #50 | `0xBaB3E5C546B005794BE59A2D359a28e57EC6C9d0` |
| RISK_MGMT | #51 | `0x25229e52bd699F82C1dcF3257bC3299fC98960bB` |

### 4. AethonFleetVault (Kit-compatible reserves)

The shared Somnia Kit vault is admin-owned by a third party, so we deploy our own **`AethonFleetVault`** — same API (`createVault`, `depositNative`, daily limits), owned by our deployer. Each agent has a reserve balance for operational segregation.

**Deep dive:** [docs/SOMNIA_INTEGRATION.md](docs/SOMNIA_INTEGRATION.md)

---

## Deployed addresses (Somnia — chain 50312)

Explorer: [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network)

### AETHON core contracts

| Contract | Address |
|----------|---------|
| **AgentRegistry** | [`0xA2BAdcce7612cC5729B6df596c660A738b94b60e`](https://shannon-explorer.somnia.network/address/0xA2BAdcce7612cC5729B6df596c660A738b94b60e) |
| **TaskMarket** | [`0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8`](https://shannon-explorer.somnia.network/address/0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8) |
| **CoalitionManager** | [`0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B`](https://shannon-explorer.somnia.network/address/0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B) |
| **ReputationEngine** | [`0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab`](https://shannon-explorer.somnia.network/address/0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab) |
| **CircuitBreaker** | [`0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0`](https://shannon-explorer.somnia.network/address/0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0) |

### Somnia integration contracts

| Contract | Address |
|----------|---------|
| **Somnia Agents Platform** | [`0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`](https://shannon-explorer.somnia.network/address/0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776) |
| **SomniaAgentConsumer** (AETHON relay) | [`0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353`](https://shannon-explorer.somnia.network/address/0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353) |
| **AethonFleetVault** | [`0xf604ba053e3643b6f33Df081d5Bd06FF241930E3`](https://shannon-explorer.somnia.network/address/0xf604ba053e3643b6f33Df081d5Bd06FF241930E3) |

### Somnia Agent Kit (reference — registry only)

| Contract | Address |
|----------|---------|
| **Kit AgentRegistry** | [`0xC9f3452090EEB519467DEa4a390976D38C008347`](https://shannon-explorer.somnia.network/address/0xC9f3452090EEB519467DEa4a390976D38C008347) |
| Kit AgentManager | `0x77F6dC5924652e32DBa0B4329De0a44a2C95691E` *(not used — AETHON has its own TaskMarket)* |
| Kit AgentVault (shared) | `0x7cEe3142A9c6d15529C322035041af697B2B5129` *(not used — we use AethonFleetVault)* |

### Operations

| Role | Address |
|------|---------|
| **Deployer / Relayer / Guardian** | `0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6` |

Full JSON record: [`backend/deployments/somniaTestnet-50312.json`](backend/deployments/somniaTestnet-50312.json)

---

## Happy path (try it yourself)

1. Open **[aethon-lemon.vercel.app](https://aethon-lemon.vercel.app)**.
2. Click **Connect wallet** → approve **Somnia (50312)**.
3. Click **Sign in** (SIWE) so you can submit tasks.
4. Go to **Tasks** → choose **Full swarm (5 agents)** → set reward (e.g. `0.05` STT) → **Submit task**.
5. Watch the task move **PENDING → COMPLETED** (live WebSocket updates).
6. Visit **Agents** for fleet health, or **Somnia** for the integration report.

You need testnet STT: [testnet.somnia.network](https://testnet.somnia.network/)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Somnia (EVM, chain 50312) |
| **Smart contracts** | Solidity 0.8.24, Hardhat, OpenZeppelin |
| **Backend** | Node.js, TypeScript, Express, PostgreSQL |
| **Real-time** | WebSocket event bus (`tasks`, `agents`, `circuit_breaker`) |
| **Auth** | SIWE (EIP-4361) + JWT |
| **Frontend** | React 18, Vite, TypeScript, ethers v6, Framer Motion |
| **Agent runtime** | Custom `AgentCore` — reactivity, health monitor, skill executors |
| **Somnia** | Platform agents via `SomniaAgentConsumer`; Kit registry for discovery |
| **Deploy** | Railway (API + workers), Vercel (frontend) |

---

## Repository layout

```
Aethon/
├── backend/
│   ├── contracts/          # AgentRegistry, TaskMarket, CoalitionManager, SomniaAgentConsumer, AethonFleetVault
│   ├── deployments/        # On-chain address records
│   ├── scripts/            # Deploy, fund fleet, verify Somnia, simulate
│   └── src/
│       ├── agent/          # Agent runtime, skills, health monitor
│       ├── api/            # REST + WebSocket
│       ├── db/             # Postgres schema + indexer
│       └── somnia/         # SomniaAgentsClient, AgentVaultClient, Kit modules
├── frontend/
│   └── src/                # React app — Overview, Agents, Tasks, Somnia, Governance
├── docs/
│   └── SOMNIA_INTEGRATION.md
└── docker-compose.yml
```

---

## How to replicate locally

### Prerequisites

- **Node.js 22+**
- **PostgreSQL 16** (or Docker)
- **MetaMask** (or any Web3 wallet)
- **Testnet STT** from the [Somnia faucet](https://testnet.somnia.network/)

### Step 1 — Clone and install

```bash
git clone https://github.com/kendacki/Aethon-.git
cd Aethon-
cd backend && npm install
cd ../frontend && npm install
```

### Step 2 — Contracts (optional — addresses already deployed)

```bash
cd backend
cp .env.example .env
# Add DEPLOYER_PK only if redeploying
npm run compile
# npm run deploy:testnet        # fresh deploy (needs funded wallet)
# npm run deploy:somnia-consumer
# npm run deploy:aethon-vault
# npm run register:somnia-kit
```

For most developers, **copy addresses from** `backend/deployments/somniaTestnet-50312.json` **into** `backend/.env`.

### Step 3 — Backend

```bash
cd backend
docker compose up postgres -d    # from repo root, or use local Postgres
npm run db:migrate
npm run build
npm run start:api                # http://localhost:3001
```

Optional — run one agent worker:

```bash
AGENT_TYPE=ORACLE AGENT_PRIVATE_KEY=<key> npm run start:agent
```

See [`docs/AGENTS.md`](docs/AGENTS.md) for the full five-agent fleet.

### Step 4 — Frontend

```bash
cd frontend
npm run dev                      # http://localhost:5173
```

Vite proxies `/v1` and `/ws` to `localhost:3001`.

### Step 5 — Verify everything

```bash
cd backend
npm run verify:somnia            # Somnia + vault + Kit registry checks
npm run simulate:fleet           # On-chain fleet + API health
```

---

## Production deployment

### Railway (backend + agent workers)

Set root directory to `backend`. Required env vars (minimum):

```env
DATABASE_URL=<from Railway Postgres>
CORS_ORIGIN=https://aethon-lemon.vercel.app,http://localhost:5173
AGENT_REGISTRY_ADDR=0xA2BAdcce7612cC5729B6df596c660A738b94b60e
TASK_MARKET_ADDR=0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8
COALITION_MANAGER_ADDR=0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B
REPUTATION_ENGINE_ADDR=0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab
CIRCUIT_BREAKER_ADDR=0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_AGENTS_ENABLED=true
SOMNIA_AGENTS_PLATFORM_ADDR=0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
SOMNIA_AGENT_CONSUMER_ADDR=0xe542f4bE7Ae4c3BD7A6bC3EC5B6c4701Da74D353
SOMNIA_KIT_REGISTRY_ADDR=0xC9f3452090EEB519467DEa4a390976D38C008347
SOMNIA_VAULT_ENABLED=true
AETHON_FLEET_VAULT_ADDR=0xf604ba053e3643b6f33Df081d5Bd06FF241930E3
```

Never commit `DEPLOYER_PK` or agent private keys.

### Vercel (frontend)

```env
VITE_API_URL=https://aethon-production-3f5a.up.railway.app
VITE_WS_URL=wss://aethon-production-3f5a.up.railway.app/ws
VITE_SIWE_DOMAIN=aethon-lemon.vercel.app
VITE_SIWE_URI=https://aethon-lemon.vercel.app
VITE_SOMNIA_CHAIN_ID=50312
```

---

## API quick reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | Indexer sync + circuit state |
| GET | `/v1/stats` | Agents, tasks, TVL |
| GET | `/v1/agents/fleet-health` | Live worker diagnostics |
| GET | `/v1/somnia/agents` | Somnia compatibility report |
| GET | `/v1/tasks` | Task list |
| POST | `/v1/tasks/submit` | Submit task (SIWE auth + signature) |

OpenAPI: `{API_URL}/docs`  
WebSocket: `{API_ORIGIN}/ws` — channels: `tasks`, `agents`, `coalitions`, `circuit_breaker`

---

## Network reference

| | |
|---|---|
| **Chain ID** | 50312 |
| **Network** | Somnia |
| **RPC** | `https://dream-rpc.somnia.network` |
| **WebSocket** | `wss://ws.somnia.network` |
| **Explorer** | [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network) |
| **Agent Explorer** | [agents.testnet.somnia.network](https://agents.testnet.somnia.network) |
| **Faucet** | [testnet.somnia.network](https://testnet.somnia.network/) |

---

## Useful scripts

```bash
npm run verify:somnia          # 14-point Somnia integration check
npm run simulate:fleet         # On-chain + vault + API fleet health
npm run fund:fleet -- 3        # Top up agent wallets to 3 STT
npm run setup:agent-vaults     # Create + seed fleet vaults
```

---

## License

MIT

</div>
