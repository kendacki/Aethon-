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
npm run start:agent              # optional agent runtime
```

OpenAPI docs: [http://localhost:3001/docs](http://localhost:3001/docs)

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                      # :5173
```

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend REST base (e.g. `http://localhost:3001/v1`) |
| `VITE_WS_URL` | WebSocket URL (e.g. `ws://localhost:3001/ws`) |
| `VITE_API_KEY` | API key for write endpoints |
| `VITE_SOMNIA_CHAIN_ID` | Optional — defaults to `50312` |
| `VITE_SOMNIA_RPC_URL` | Optional — defaults to Somnia dream RPC |

The navbar **Connect** button links a wallet on Somnia Shannon testnet for signing and approving tasks before execution.

### 4. Full stack (Docker)

```bash
# API + Postgres
docker compose up -d

# Include agent runtime
docker compose --profile agents up -d
```

## Frontend (Vercel)

Set the project root to the repo root (uses root `vercel.json`) or to `frontend/`.

Required environment variables in Vercel:

- `VITE_API_URL` → your hosted backend `/v1` URL
- `VITE_WS_URL` → your hosted backend WebSocket URL
- `VITE_API_KEY` → matches backend `API_KEY`
- `CORS_ORIGIN` on the backend must include your Vercel domain

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

## License

MIT
