# AETHON Production Deployment & Verification Checklist

This checklist contains the exact technical steps and sequence required to compile, build, configure, deploy, and verify the AETHON agent fleet cleanly on production (Railway + Vercel).

---

## Step A — Local Build Verification (Sequence)

Verify that both the backend and frontend compile and build without errors locally before pushing:

```bash
# 1. Backend — Contracts
cd backend
npm install
npm run compile            # hardhat compile — must compile clean
npx hardhat test           # hardhat unit tests (not 'npm run test')

# 2. Backend — TypeScript build (this is what Railway runs on boot)
npm run build              # tsc -p tsconfig.json + copy-assets.cjs

# 3. Frontend — Build
cd ../frontend
npm install
npm run build              # vite build → frontend/dist succeeds
```

> [!NOTE]
> Do not set `NODE_ENV=production` on your local laptop, as the `validateEnv.ts` fail-fast guard will reject localhost DB URLs and weak secrets. Keep it unset (defaults to development).

---

## Step B — Static Configuration Adjustments

Before committing and pushing, double-check these static files:

1. **`config.toml` network details**:
   Ensure `network` is set to `somnia-shannon-testnet` and `chain_id` to `50312` (rather than the old `somnia-mainnet` / `5031`) so Somnia judges see a clean, matching repository configuration.
2. **`package.json` testing script**:
   Note that there is no plain `npm run test` script in `backend/package.json` — use `npm run test:contracts` or `npx hardhat test` for unit tests.
3. **README.md start block documentation**:
   Ensure the README documents the new deployment block `395765007` to match the actual deployed state.

---

## Step C — Deployment Sequence

### 1. Resolve Git Tree
Ensure there are no active rebases or conflicts:
```bash
git status
# If in a rebase, either complete it:
git rebase --continue
# Or abort to clean tree:
git rebase --abort
```

### 2. Update Railway Environment Variables (CRITICAL)
Railway auto-redeploys on push, but **it will use the old env vars** unless you update them in the dashboard **before or alongside** the deployment!

1. Run `node scripts/print-railway-env.cjs` inside `backend`.
2. Copy and paste all the printed env vars into the **Railway API service** (specifically check `TASK_MARKET_ADDR`, `AGENT_REGISTRY_ADDR`, `COALITION_MANAGER_ADDR`, `REPUTATION_ENGINE_ADDR`, `CIRCUIT_BREAKER_ADDR`, and `ORACLE_RESOLVER_ADDR`).
3. Run `node scripts/print-railway-agent-env.cjs` inside `backend`.
4. Update the contract address variables on **each of the 5 Railway Agent services**.

### 3. Commit and Push
```bash
git add .
git commit -m "demo: live Shannon evidence (registrations + task + oracle)"
git push origin main
```

---

## Step D — Production Verification (Don't Assume)

Once Vercel and Railway complete their auto-deployments, perform these checks:

1. **API Health check**:
   ```bash
   curl -s https://aethon-production-3f5a.up.railway.app/v1/health | jq
   ```
   * Confirm `taskMarket` matches `0xA31fFc0a91e7C577b798241A30167b8E062A0616`.
   * Confirm `synced` is `true` and the block lag is `0`.

2. **Fleet Health check**:
   Visit [aethon-lemon.vercel.app/agents](https://aethon-lemon.vercel.app/agents) or query:
   ```bash
   curl -s https://aethon-production-3f5a.up.railway.app/v1/agents/fleet-health | jq
   ```
   * Confirm that all 5 agent workers show as `HEALTHY` and `reachable=true`.
