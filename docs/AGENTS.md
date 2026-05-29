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
- `GET /v1/agents/manifests/ORACLE` — skill manifest JSON (v1.1.0)
- Each agent Railway service exposes **health** on `PORT` — returns full snapshot when healthy, `503` when halted
- Complexity-1 task — one agent completes
- Swarm (complexity 5) — all 5 agents required

---

## Agent health (v1.1)

Each agent runs an **AgentHealthMonitor** that checks:

| Check | Effect |
|-------|--------|
| RPC latency | Pauses task intake above 2s |
| Gas price | Pauses above 100 gwei |
| Circuit breaker | **HALT** when paused on-chain |
| Wallet balance | **HALT** below 0.5 STT (configurable via `AGENT_MIN_BALANCE_WEI`) |
| API reachability | Degraded if `/v1/health/live` fails |
| On-chain registration | **HALT** if not active in registry |
| Heartbeat failures | Degraded after 2+ consecutive failures |

Health snapshot is written to `AGENT_HEALTH_FILE` (default: OS temp dir) and served by the Railway health HTTP endpoint.

Optional env tuning:

```env
AGENT_MIN_BALANCE_WEI=500000000000000000
AGENT_MAX_GAS_GWEI=100
AGENT_MAX_RPC_LATENCY_MS=2000
WATCHDOG_INTERVAL_MS=5000
```

Skills v1.1 add **preflight param validation**, confidence scores, and role-specific depth (multi-venue arbitrage, oracle fallback feeds, diversified yield routing, governance flags, composite risk scoring).

---

## RISK_MGMT wallet

Current wallet: **`0x25229e52bd699F82C1dcF3257bC3299fC98960bB`** (see `backend/env/fleet.addresses.json`).

If migrating from a bad registration, see **[RISK_REREGISTER.md](./RISK_REREGISTER.md)**.

```bash
cd backend
npm run simulate:fleet    # on-chain + API fleet health check
```
