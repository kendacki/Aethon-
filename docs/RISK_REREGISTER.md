# RISK_MGMT wallet migration (complete)

The original RISK wallet was incorrectly registered as **GOVERNANCE** and could not re-register after deregister (`ReputationEngine: Already initialized`).

## Current wallets

| Role | Address | Railway service |
|------|---------|-----------------|
| **RISK_MGMT** | `0x25229e52bd699F82C1dcF3257bC3299fC98960bB` | `aethon-agent-risk` |
| **GOVERNANCE** | `0xBaB3E5C546B005794BE59A2D359a28e57EC6C9d0` | `aethon-agent-governance` |

**Retired:** `0xBA28D4122d23b64DCa1af35B49D6dA5c1d3CB2EC` — do not use.

## Railway `aethon-agent-risk`

1. Set `AGENT_PRIVATE_KEY` from `backend/env/railway-setup.local.txt` (RISK block)
2. Confirm `AGENT_TYPE=RISK_MGMT`, `AETHON_RUNTIME=agent`, start command `npm start`
3. Redeploy

## Verify

```bash
cd backend
npm run simulate:fleet
```

Update **`AGENT_HEALTH_URLS`** on the API service with the risk worker's real public domain.

## Contract note

Future registry deploys skip `initializeAgent` when reputation is already initialized (`AgentRegistry.register`). Deployed Somnia registry does not include this fix — new wallet was required on testnet.
