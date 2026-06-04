# Deploying on Railway

AETHON backend runs on **Railway** (API + five agent workers + Postgres). The frontend is on **Vercel** only.

## Services (monorepo, root `backend/`)

| Railway service | Env | Start |
|-----------------|-----|-------|
| API | `AETHON_RUNTIME=api` | `npm run start` (via `railway.json`) |
| Agent ×5 | `AETHON_RUNTIME=agent`, `AGENT_TYPE=…` | `npm run start` |

`railway-start.cjs` branches on `AETHON_RUNTIME` and spawns the API or agent process. Agent workers expose a health HTTP endpoint on `PORT`.

## Database

In the **API service** (and any service that talks to Postgres):

```env
DATABASE_URL=postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

Use the **internal** URL from Railway Postgres → Connect. Do **not** use `localhost` on Railway.

For migrations from your laptop:

```env
DATABASE_PUBLIC_URL=postgresql://postgres:PASSWORD@HOST.proxy.rlwy.net:PORT/railway
```

Run `npm run db:migrate` locally with `DATABASE_URL` pointing at the public URL.

## Required API env vars

Copy [`env/railway-api.env.example`](env/railway-api.env.example) and set in the Railway dashboard:

- `JWT_SECRET` — strong random string (≥32 chars); rotate if ever exposed
- Contract addresses from [`deployments/somniaTestnet-50312.json`](deployments/somniaTestnet-50312.json)
- `RELAYER_PRIVATE_KEY` — funded relayer wallet (never commit)
- `CORS_ORIGIN=https://aethon-lemon.vercel.app,http://localhost:5173`
- `SOMNIA_RPC_URL=https://dream-rpc.somnia.network`
- `SOMNIA_WS_URL=wss://dream-rpc.somnia.network/ws`
- `INDEXER_START_BLOCK=390023867` (TaskMarket deploy block; avoids genesis scan)
- Somnia platform / vault addresses (see example file)

**Auth:** Protected write routes (`POST /v1/tasks/submit`, `POST /v1/agents/register`) require **SIWE + JWT** (`Authorization: Bearer`). Do not set `API_KEY=dev-api-key` in production.

## Agent workers

Per agent service, set `AGENT_TYPE` (`ARBITRAGE`, `ORACLE`, `YIELD_OPT`, `GOVERNANCE`, `RISK_MGMT`) and the matching `AGENT_PRIVATE_KEY`. See [`env/railway-agents.env.example`](env/railway-agents.env.example).

## Vercel (frontend)

```env
VITE_API_URL=https://aethon-production-3f5a.up.railway.app
VITE_WS_URL=wss://aethon-production-3f5a.up.railway.app/ws
VITE_SIWE_DOMAIN=aethon-lemon.vercel.app
VITE_SIWE_URI=https://aethon-lemon.vercel.app
VITE_SOMNIA_CHAIN_ID=50312
```

Do **not** set `VITE_API_KEY` — nothing secret belongs in `VITE_*` vars.

## Task rewards → agent stake & submitter refunds

After redeploying contracts (`npm run deploy:testnet`):

1. Run `node scripts/set-coalition-manager.cjs` from slash multisig if deploy script could not set it automatically.
2. Update Railway `TASK_MARKET_ADDR`, `AGENT_REGISTRY_ADDR`, `COALITION_MANAGER_ADDR` from the new deployment JSON.
3. Redeploy the API so the relayer uses `submitTaskFor` (refunds go to the wallet that signed the task).

Swarm task payouts are split equally across coalition members and credited to each agent’s **registry stake** (visible in fleet total staked). Failed or stale tasks refund the signed submitter; the API also forwards legacy relayer refunds when needed.

## Verify

- API: `GET https://<api-host>/v1/health` — DB connected, indexer lag reasonable
- Frontend: sign in with wallet, submit a task
- Agents: `GET https://<agent-host>/` returns fleet health JSON

## Secret rotation checklist

If `.env` or dashboard values were ever committed or shared:

1. Rotate `JWT_SECRET` (invalidates existing sessions)
2. Rotate `RELAYER_PRIVATE_KEY` / agent keys if exposed
3. Rotate Postgres password in Railway if credentials leaked
4. Redeploy API + agents + Vercel
