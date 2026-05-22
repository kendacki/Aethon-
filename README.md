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

## Deployed Contracts (Somnia Shannon Testnet)

| Contract | Address |
|----------|---------|
| ReputationEngine | `0x019Fee1a689A8Edc6A9B6357054F5b8551e4f16E` |
| CircuitBreaker | `0xBCA203Ea98C106Af57Fa1d1E756faF3075905C1A` |
| AgentRegistry | `0xeB7765Aea20611039E0D521C4c3Be7aD2E0eE052` |
| CoalitionManager | `0xE4A221E12B9216F6E891df166ceAd7A5C72f32bf` |
| TaskMarket | `0xf836e1D3Fc709A81E26B512E7914AdEd64fcDdc1` |

Deployer: `0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6`  
Full record: `backend/deployments/somniaTestnet-50312.json`  
Explorer: [TaskMarket on Shannon Explorer](https://shannon-explorer.somnia.network/address/0xf836e1D3Fc709A81E26B512E7914AdEd64fcDdc1)

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
