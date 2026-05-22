# AETHON Frontend

Dashboard UI for the AETHON agent economy. Consumes the backend REST API and WebSocket.

## Planned routes

| Route | Backend |
|-------|---------|
| `/` | `GET /v1/stats`, `GET /v1/health` |
| `/agents` | `GET /v1/agents?page=&type=&online=` |
| `/agents/:address` | `GET /v1/agents/:address`, `GET /v1/reputation/:address` |
| `/tasks` | `GET /v1/tasks?status=` + WS `tasks` |
| `/tasks/submit` | `POST /v1/tasks/submit` (signed + API key) |
| `/coalitions` | `GET /v1/coalitions` + WS `coalitions` |
| `/coalitions/:address` | `GET /v1/coalitions/:address` |
| `/leaderboard` | `GET /v1/leaderboard` |
| `/governance` | `GET /v1/circuit-breaker` + WS `circuit_breaker` |

## Environment

```env
VITE_API_URL=http://localhost:3001/v1
VITE_WS_URL=ws://localhost:3001/ws
VITE_API_KEY=dev-api-key
```

## API docs

Open [http://localhost:3001/docs](http://localhost:3001/docs) when the backend is running.

OpenAPI spec: `backend/openapi.yaml`
