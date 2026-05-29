# AETHON v3.0

Autonomous Emergent Trading & Hierarchical Operations Network — a self-governing agent economy on **Somnia Agentic L1**.

Agents self-register, bid on tasks, form stake-weighted coalitions, and execute work on chain. The backend indexes chain events into Postgres; the frontend provides a live fleet dashboard with wallet connection for signing and approving transactions.

## Repository Layout

```
Aethon/
├── backend/
│   ├── contracts/           # Solidity (.sol) — 5 core contracts + interfaces
│   ├── deployments/         # Deployed address records per network
│   ├── scripts/             # Hardhat deploy scripts
│   └── src/
│       ├── agent/           # AgentCore, NonceMgr, Watchdog, CoalitionEngine
│       ├── api/             # REST + WebSocket server
│       ├── db/              # Postgres schema, migrations, repository
│       └── services/        # Indexer, relayer, event bus
├── frontend/
│   └── src/
│       ├── pages/           # Overview, Agents, Tasks, Leaderboard, Governance
│       ├── components/      # UI, glass panels, Connect wallet button
│       ├── wallet/          # Somnia wallet context (ethers v6)
│       └── api/             # REST + WebSocket client
├── docker-compose.yml       # Postgres + API (+ optional agent profile)
└── vercel.json              # Frontend deploy config
```

## Deployed Contracts (Somnia Shannon Testnet — v3)

| Contract | Address |
|----------|---------|
| ReputationEngine | [`0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab`](https://shannon-explorer.somnia.network/address/0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab) |
| CircuitBreaker | [`0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0`](https://shannon-explorer.somnia.network/address/0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0) |
| AgentRegistry | [`0xA2BAdcce7612cC5729B6df596c660A738b94b60e`](https://shannon-explorer.somnia.network/address/0xA2BAdcce7612cC5729B6df596c660A738b94b60e) |
| CoalitionManager | [`0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B`](https://shannon-explorer.somnia.network/address/0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B) |
| TaskMarket | [`0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8`](https://shannon-explorer.somnia.network/address/0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8) |
| SomniaAgentConsumer | [`0x25b77725D9BB1a5e56b694b26A79f82c2Bb136F6`](https://shannon-explorer.somnia.network/address/0x25b77725D9BB1a5e56b694b26A79f82c2Bb136F6) |

**Roles (all `0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6`):** Guardian · Treasury · Slash Multisig

Full record: [`backend/deployments/somniaTestnet-50312.json`](backend/deployments/somniaTestnet-50312.json)

### Contract stack

| Contract | Purpose |
|----------|---------|
| **AgentRegistry** | Agent registration, stake, heartbeat liveness |
| **TaskMarket** | Task submission, bidding, execution, rewards |
| **CoalitionManager** | Stake-weighted agent groups with quorum rules |
| **ReputationEngine** | On-chain reputation scoring |
| **CircuitBreaker** | Protocol-wide pause on consecutive failures |

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16 (or Docker)
- MetaMask or another Web3 wallet (frontend)

### 1. Smart contracts

```bash
cd backend
npm install
npm run compile          # hardhat compile (.sol sources)
npm run test:contracts   # lifecycle test on Hardhat
npm run deploy:testnet   # Somnia Shannon — requires funded DEPLOYER_PK
```

After testnet deploy, addresses are written to `backend/deployments/` and `backend/.env`.

### 2. Backend API + indexer

```bash
cd backend
cp .env.example .env
# Paste contract addresses from deployments/somniaTestnet-50312.json
npm run build
docker compose up postgres -d    # from repo root
npm run db:migrate
npm run start:api                # :3001 REST + WebSocket + indexer
npm run start:agent              # optional agent runtime (single process)
```

**5-agent fleet with specialized skills:** see [`docs/AGENTS.md`](docs/AGENTS.md) — generate keys, fund wallets, run `docker compose --profile agents up -d`.

OpenAPI docs: [http://localhost:3001/docs](http://localhost:3001/docs)

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # production / custom overrides
npm install
npm run dev                      # :5173 — uses .env.development + proxy to :3001
```

**Local dev:** `.env.development` sets `VITE_API_URL=/v1`. Vite proxies `/v1`, `/ws`, and `/docs` to the backend.

**Production (Vercel):** set these in the project Environment Variables:

| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://your-api.railway.app` (no `/v1` required) |
| `VITE_WS_URL` | `wss://your-api.railway.app/ws` (optional if API URL is set) |
| `VITE_API_KEY` | Same as backend `API_KEY` |

Also set backend `CORS_ORIGIN` to include `https://aethon-lemon.vercel.app` (already in `backend/.env.example`).

### Backend on Railway

1. Create a **New Project** → **Deploy from GitHub** → select this repo.
2. Add a **PostgreSQL** plugin; Railway sets `DATABASE_URL` automatically.
3. Set the service **Root Directory** to `backend`.
4. Add environment variables from `backend/.env.example` (contract addresses, `CORS_ORIGIN`, `API_KEY`, etc.).
5. Deploy — build runs `npm run build` (includes copying `schema.sql`); start runs `npm run start:api`.
6. Copy the public Railway URL into Vercel as `VITE_API_URL`.

**Required Railway variables (minimum):**

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Auto from PostgreSQL plugin |
| `CORS_ORIGIN` | `https://aethon-lemon.vercel.app,http://localhost:5173` |
| `API_KEY` | `dev-api-key` |
| `AGENT_REGISTRY_ADDR` | From `deployments/somniaTestnet-50312.json` |
| `TASK_MARKET_ADDR` | From deployments |
| `COALITION_MANAGER_ADDR` | From deployments |
| `REPUTATION_ENGINE_ADDR` | From deployments |
| `CIRCUIT_BREAKER_ADDR` | From deployments |
| `SOMNIA_RPC_URL` | `https://dream-rpc.somnia.network` |

Railway sets `PORT` automatically; the API listens on it.

### 4. Full stack (Docker)

```bash
# API + Postgres
docker compose up -d

# Include agent runtime
docker compose --profile agents up -d
```

## Frontend (Vercel)

**Live site:** [https://aethon-lemon.vercel.app](https://aethon-lemon.vercel.app)

Set the project root to the repo root (uses root `vercel.json`).

### Vercel Dashboard → Settings → Environment Variables

Add these for **Production** (and Preview if needed):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | Your **backend** URL, e.g. `https://aethon-api.up.railway.app` |
| `VITE_WS_URL` | `wss://YOUR-BACKEND-URL/ws` |
| `VITE_API_KEY` | `dev-api-key` (must match backend `API_KEY`) |

Then **Redeploy** the frontend (env vars apply at build time).

> **Note:** [aethon-lemon.vercel.app](https://aethon-lemon.vercel.app) hosts the React app only. The API (Express + Postgres + indexer) must run on a host that supports long-lived processes (Railway, Render, Fly.io, Docker VPS). Point `VITE_API_URL` at that backend, not at the Vercel frontend URL.

### Backend CORS (hosted API)

On your **backend** host, set:

```env
CORS_ORIGIN=https://aethon-lemon.vercel.app,http://localhost:5173
API_KEY=dev-api-key
```

## API Endpoints (v3.1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | Health + indexer sync state |
| GET | `/v1/health/live` | Liveness probe |
| GET | `/v1/health/ready` | Readiness (DB + indexer) |
| GET | `/v1/agents?page=&type=&online=` | Paginated agent fleet |
| GET | `/v1/agents/:address` | Agent profile |
| GET | `/v1/reputation/:address` | Score + history |
| GET | `/v1/tasks?page=&status=` | Paginated tasks |
| GET | `/v1/tasks/:id` | Task detail |
| GET | `/v1/coalitions/:address` | Coalition detail |
| GET | `/v1/circuit-breaker` | Circuit breaker state |
| GET | `/v1/stats` | Global stats |
| GET | `/v1/leaderboard` | Top agents |
| POST | `/v1/tasks/submit` | On-chain submit (auth + signature) |
| POST | `/v1/agents/register` | Pre-register metadata |

WebSocket: `ws://localhost:3001/ws` — channels: `tasks`, `agents`, `coalitions`, `circuit_breaker`

All list endpoints support `page` and `pageSize` query params.

## Network

| | |
|---|---|
| **Chain ID** | `50312` |
| **Network** | Somnia Shannon Testnet |
| **RPC** | `https://dream-rpc.somnia.network` |
| **WebSocket** | `wss://ws.somnia.network` |
| **Explorer** | [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network) |
| **Faucet** | [testnet.somnia.network](https://testnet.somnia.network/) |
| **Somnia Agents** | [Agent Explorer (testnet)](https://agents.testnet.somnia.network) |
| **AETHON ↔ Somnia fit** | [docs/SOMNIA_INTEGRATION.md](docs/SOMNIA_INTEGRATION.md) |

## License

MIT
