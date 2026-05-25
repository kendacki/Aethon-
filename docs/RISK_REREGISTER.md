# RISK_MGMT on-chain re-register

The RISK wallet was incorrectly registered as **GOVERNANCE** on-chain. This guide covers automated stake return after the 24h timelock and Railway redeploy as **RISK_MGMT**.

## Wallets (do not swap)

| Role | Address | Railway service |
|------|---------|-----------------|
| **RISK_MGMT** | `0xBA28D4122d23b64DCa1af35B49D6dA5c1d3CB2EC` | `aethon-agent-risk` |
| **GOVERNANCE** | `0xBaB3E5C546B005794BE59A2D359a28e57EC6C9d0` | `aethon-agent-governance` |

## Current status

Tracked in `backend/env/reregister.risk_mgmt.json`:

- **Deregister requested:** tx `0x4cd9c7829902dda591a5b6b981b5f08143e887135db000610cb6bb7efeb99104`
- **Unlock (complete allowed):** `2026-05-26T02:57:07.000Z`
- **Target manifest:** `https://aethon-production-3f5a.up.railway.app/v1/agents/manifests/RISK_MGMT`

---

## Phase 1 — Now (timelock active)

### Railway `aethon-agent-risk`

1. **Scale to 0 replicas** (or keep stopped) until stake is returned.
2. **Verify variables** — copy from `backend/env/agents/risk_mgmt.env.example` and set `AGENT_PRIVATE_KEY`.
3. **Critical:** `AGENT_TYPE=RISK_MGMT` (not `GOVERNANCE`).
4. **Settings:** Root Directory `backend`, start command **`npm start`**.

### GitHub automation (one-time setup)

Add repo secret **`RISK_MGMT_AGENT_PRIVATE_KEY`** (same private key as Railway `aethon-agent-risk`).

Workflow `.github/workflows/reregister-risk.yml` runs **hourly** and completes deregister when the timelock expires.

Manual trigger: **Actions → Reregister RISK_MGMT → Run workflow**.

### Local automation (optional)

```powershell
cd backend
node scripts/reregister-agent.cjs wait-and-complete --role RISK_MGMT
```

---

## Phase 2 — After unlock

Automation runs `auto-complete` and returns 0.5 STT stake to the RISK wallet.

Verify:

```bash
cd backend
npm run reregister:status
```

Expect `stake: "0"` and state file `status: "stake_returned"`.

---

## Phase 3 — Redeploy RISK on Railway

1. **Scale `aethon-agent-risk` to 1 replica** (or Redeploy).
2. Logs:

```
[AgentCore] Registered on-chain with manifest .../manifests/RISK_MGMT
[AgentCore] Agent 0xBA28... online (RISK_MGMT)
```

3. **API service** — set real worker URL in `AGENT_HEALTH_URLS` for `RISK_MGMT`, redeploy API.
4. Check `GET /v1/agents/fleet-health` — RISK_MGMT should be `HEALTHY` and `reachable`.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run reregister:status` | On-chain + state file status |
| `npm run reregister:complete` | Manual complete-deregister (after unlock) |
| `node scripts/reregister-agent.cjs auto-complete --role RISK_MGMT` | CI/cron |
