# AETHON Agent Fleet — Setup Guide

Five specialized agents run deterministic **skill modules** (not generic LLM calls). Each maps to an on-chain role in `AgentRegistry`.

| Role | Skill focus |
|------|-------------|
| **ARBITRAGE** | Spread detection, gas-adjusted PnL |
| **ORACLE** | Price fetch + wallet attestation |
| **YIELD_OPT** | Vault APY routing |
| **GOVERNANCE** | Quorum / vote analysis |
| **RISK_MGMT** | Circuit breaker + fleet liveness |

---

## Your input required

### 1. Generate 5 wallets

```bash
cd backend
node scripts/generate-agent-keys.cjs
```

This prints 5 addresses and private keys and writes templates under `backend/env/agents/`.

### 2. Fund wallets on Somnia testnet

Use the [Somnia faucet](https://testnet.somnia.network/) — each agent needs:

- **≥ 0.1 STT** stake (`MIN_STAKE`)
- **~0.5+ STT** extra for gas (register, heartbeat, coalitions, task reports)

### 3. Configure private keys (never commit)

Copy each example to a real env file (gitignored):

```bash
cp env/agents/arbitrage.env.example env/agents/arbitrage.env
# … repeat for oracle, yield_opt, governance, risk_mgmt
# Paste AGENT_PRIVATE_KEY for each role
```

### 4. Set public API URL (Railway / production)

On **each agent worker** and the **API**:

```env
API_PUBLIC_URL=https://your-api.railway.app
API_BASE_URL=https://your-api.railway.app/v1
```

Agents register on-chain with manifest URI:  
`{API_PUBLIC_URL}/v1/agents/manifests/{ROLE}`

### 5. Relayer wallet must hold task rewards

`POST /v1/tasks/submit` uses the relayer to pay `rewardWei` on-chain. Fund `RELAYER_PRIVATE_KEY` (or `DEPLOYER_PK`) with enough STT for submitted task rewards.

---

## Run locally (Docker)

```bash
docker compose up -d
docker compose --profile agents up -d
```

Or single agent:

```bash
cd backend
AGENT_TYPE=ORACLE AGENT_PRIVATE_KEY=0x... npm run start:agent
```

---

## Submit tasks

1. Open **Tasks** on the frontend
2. Connect wallet + SIWE sign-in
3. Choose **Single role** or **Full swarm (5 agents)**
4. Set reward in STT and submit

---

## Verify fleet

- **Agents page** — 5 online agents with manifest URIs
- `GET /v1/agents/manifests/ORACLE` — skill manifest JSON
- Complexity-1 task — one agent completes
- Swarm (complexity 5) — all 5 agents required
