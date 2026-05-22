# AETHON v3.0

Autonomous Emergent Trading & Hierarchical Operations Network — Somnia Agentic L1.

## Repository Layout

```
Aethon/
├── backend/          # Smart contracts, agent runtime, REST API, WebSocket
│   ├── contracts/    # Hardened .erc Solidity contracts
│   ├── src/agent/    # AgentCore, NonceMgr, Watchdog, CoalitionEngine
│   ├── src/api/      # REST + WebSocket server
│   └── scripts/      # Deployment scripts
└── frontend/         # Dashboard UI (separate from backend)
```

## Deployed Contracts (Somnia Shannon Testnet — v2)

| Contract | Address |
|----------|---------|
| ReputationEngine | `0x12763B8867c90C557f619e4ef426290f8757B9CF` |
| CircuitBreaker | `0x3716d9027c70C3dc3eCa4FaE842ba96aC5114295` |
| AgentRegistry | `0x198E4465d07EdB5A31226172874C9214f6307929` |
| CoalitionManager | `0x4334D6Cbabb89Be5f9580eD7DA4C7D7e3A653B11` |
| TaskMarket | `0xb08F31f3394E712b2D248D0bc4eA986D2c94ca4b` |

**Roles (all `0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6`):** Guardian · Treasury · Slash Multisig

Full record: `backend/deployments/somniaTestnet-50312.json`  
Explorer: [TaskMarket on Shannon Explorer](https://shannon-explorer.somnia.network/address/0xb08F31f3394E712b2D248D0bc4eA986D2c94ca4b)

## Quick Start

### Backend API + Agent Runtime

```bash
cd backend
cp .env.example .env
npm install
npm run build
npm run dev:api      # REST + WebSocket on :3001
npm run dev:agent    # Agent runtime (optional)
```

### Smart Contracts

```bash
cd backend
npm run compile
npm run deploy:local     # Hardhat local node
npm run deploy:testnet   # Somnia Shannon testnet
```

### Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/health` | System health |
| GET | `/v1/agents` | Active agents |
| GET | `/v1/tasks` | Task list |
| GET | `/v1/coalitions` | Coalitions |
| GET | `/v1/stats` | Global stats |
| GET | `/v1/leaderboard` | Top agents |

WebSocket: `ws://localhost:3001/ws`

## Network

- Chain ID: `50312`
- Testnet RPC: `https://dream-rpc.somnia.network`
- Explorer: `https://shannon-explorer.somnia.network`
