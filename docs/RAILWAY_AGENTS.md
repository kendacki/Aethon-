# Railway Agent Fleet Setup

Deploy **5 worker services** alongside your existing API service. All services use `npm start`, which reads **`AETHON_RUNTIME`** to choose API vs agent (see `scripts/railway-start.cjs`).

## Prerequisites

- API service live at `https://aethon-production-3f5a.up.railway.app`
- Agent wallets funded (5 STT each) — see `backend/env/fleet.addresses.json`
- Agent keys in `backend/env/agents/*.env` (gitignored)

## 1. Generate local paste file (on your machine)

```bash
cd backend
node scripts/print-railway-agent-env.cjs
```

Opens `backend/env/railway-setup.local.txt` — **gitignored**, contains private keys. Paste each block into Railway, then delete the file.

## 2. Create 5 Railway services

In your **existing Railway project** (same as API):

| Service name | AGENT_TYPE | Required variable |
|--------------|------------|-------------------|
| `aethon-agent-arbitrage` | ARBITRAGE | `AETHON_RUNTIME=agent` |
| `aethon-agent-oracle` | ORACLE | `AETHON_RUNTIME=agent` |
| `aethon-agent-yield` | YIELD_OPT | `AETHON_RUNTIME=agent` |
| `aethon-agent-governance` | GOVERNANCE | `AETHON_RUNTIME=agent` |
| `aethon-agent-risk` | RISK_MGMT | `AETHON_RUNTIME=agent` |

For **each** service:

1. **New → GitHub Repo** → select `Aethon-` (same repo as API)
2. **Settings → Root Directory** → `backend`
3. **Start command** — use default **`npm start`** (from `railway.toml`). Do **not** override with `npm run start:api`.
4. **Variables** → **`AETHON_RUNTIME=agent`** plus block from `railway-setup.local.txt`
5. **Deploy**

Agent workers do **not** need Postgres — they call the API over HTTP.

## 3. Verify API service env (main service)

Ensure your **API** service has:

```env
AETHON_RUNTIME=api
API_PUBLIC_URL=https://aethon-production-3f5a.up.railway.app
API_BASE_URL=https://aethon-production-3f5a.up.railway.app/v1
RELAYER_PRIVATE_KEY=<deployer key — funded for task rewards>
REACTIVITY_ENABLED=true
```

Redeploy API after adding `API_PUBLIC_URL` / `API_BASE_URL` if missing.

## 4. Confirm agents registered

Within ~2 minutes of deploy, check logs for each worker:

```
[AgentCore] Registered on-chain with manifest https://aethon-production-3f5a.up.railway.app/v1/agents/manifests/ORACLE
[AgentCore] Agent 0x... online (ORACLE)
```

Dashboard: [aethon-lemon.vercel.app/agents](https://aethon-lemon.vercel.app/agents) — expect **5 online**.

Manifest example: `GET https://aethon-production-3f5a.up.railway.app/v1/agents/manifests/ORACLE`

## 5. Test a task

1. Connect wallet on frontend + SIWE sign-in
2. **Tasks** → submit **ORACLE** complexity-1 task (0.01 STT reward)
3. Watch task move PENDING → ASSIGNED → COMPLETED

Swarm (complexity 5) requires all 5 agents online.

## Config reference

- Agent deploy config: `backend/railway.agent.toml`
- Shared var template: `backend/env/railway-agents.env.example`
- Fleet addresses: `backend/env/fleet.addresses.json`

## Troubleshooting

| Log error | Fix |
|-----------|-----|
| `node dist/api/server.js` / Postgres errors on agent service | Set **`AETHON_RUNTIME=agent`**, redeploy; remove custom `start:api` override |
| `AGENT_PRIVATE_KEY is required` | Set key in service Variables |
| `Payload fetch failed` | API_BASE_URL must include `/v1` |
| `Insufficient stake` | Fund agent wallet (≥0.1 STT stake, you have 5 STT) |
| Heartbeat failed | Check SOMNIA_RPC_URL, wallet gas |
| Coalition timeout | Not all 5 agents running / registered |
