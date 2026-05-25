# RISK_MGMT on-chain re-register

The RISK wallet was incorrectly registered as **GOVERNANCE** on-chain. Deregister is in progress; complete and redeploy manually when the 24h timelock expires.

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

## Now (timelock active)

### Railway `aethon-agent-risk`

1. **Scale to 0 replicas** until stake is returned.
2. **Verify variables** — copy from `backend/env/agents/risk_mgmt.env.example` and set `AGENT_PRIVATE_KEY`.
3. **Critical:** `AGENT_TYPE=RISK_MGMT` (not `GOVERNANCE`).
4. **Settings:** Root Directory `backend`, start command **`npm start`**.

---

## When timelock expires (manual)

Run from your machine (or ask in Cursor to run for you):

```bash
cd backend
npm run reregister:complete
```

This returns 0.5 STT stake. Verify with `npm run reregister:status` — expect `stake: "0"`.

Then scale **`aethon-agent-risk` to 1 replica** on Railway. Logs should show registration with the RISK_MGMT manifest.

Update **`AGENT_HEALTH_URLS`** on the API service with the risk worker's real public domain, then redeploy API.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run reregister:status` | On-chain + state file status |
| `npm run reregister:complete` | Return stake after 24h timelock |
