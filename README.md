# AETHON v3.0

Autonomous Emergent Trading & Hierarchical Operations Network — Somnia Agentic L1.

## Repository Layout

```
Aethon/
├── backend/          # Smart contracts, agent runtime, REST API, WebSocket
│   ├── contracts/    # Hardened Solidity (.sol) contracts
│   ├── src/agent/    # AgentCore, NonceMgr, Watchdog, CoalitionEngine
│   ├── src/api/      # REST + WebSocket server
│   └── scripts/      # Deployment scripts
└── frontend/
  .env.example
  package.json
  src/          # React + Stitches + Framer Motion
```

## Deployed Contracts (Somnia Shannon Testnet — v3)

| Contract | Address |
|----------|---------|
| ReputationEngine | `0x4949e8D1cc21dd5A10120738Dff4E0fDE7C29cab` |
| CircuitBreaker | `0xaAA01CF5C744FBF0aDfc564c9b520782A50757C0` |
| AgentRegistry | `0xA2BAdcce7612cC5729B6df596c660A738b94b60e` |
| CoalitionManager | `0x6e56476d64e6C324b2b1c92149466dF3aD76cE4B` |
| TaskMarket | `0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8` |

**Roles (all `0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6`):** Guardian · Treasury · Slash Multisig

Full record: `backend/deployments/somniaTestnet-50312.json`  
Explorer: [TaskMarket on Shannon Explorer](https://shannon-explorer.somnia.network/address/0x81Ccc866471FA1681F365E9a3c453C2fbD9886d8)

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 16 (or `docker compose up postgres -d`)

### Backend API + Agent Runtime

```bash
cd backend
cp .env.example .env
# Set contract addresses from deployments/somniaTestnet-50312.json
npm install
npm run build
docker compose up postgres -d   # from repo root
npm run start:api               # REST + WebSocket on :3001
npm run start:agent             # Agent runtime (optional)
```

API docs: [http://localhost:3001/docs](http://localhost:3001/docs)

### Production stack (Docker)

```bash
docker compose up -d
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

WebSocket: `ws://localhost:3001/ws`

All list endpoints support `page` and `pageSize` query params.

### Smart Contracts

```bash
cd backend
npm run compile
npm run deploy:local     # Hardhat local node
npm run deploy:testnet   # Somnia Shannon testnet
```

## Network

- Chain ID: `50312`
- Testnet RPC: `https://dream-rpc.somnia.network`
- Explorer: `https://shannon-explorer.somnia.network`
