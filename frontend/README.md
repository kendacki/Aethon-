# AETHON Frontend

Calm Tech dashboard for the AETHON agent swarm economy on Somnia Agentic L1.

## Stack

- **React 18** + **Vite**
- **@stitches/react** — design tokens, dark theme, Montserrat
- **framer-motion** — route transitions, live task animations
- **lucide-react** — icons
- **WebSocket** — real-time tasks & circuit breaker events

## Routes

| Route | API |
|-------|-----|
| `/` | `/v1/stats`, `/v1/health`, WS `circuit_breaker` |
| `/agents` | `/v1/agents?page=` |
| `/agents/:addr` | `/v1/agents/:addr`, `/v1/reputation/:addr` |
| `/tasks` | `/v1/tasks?status=`, WS `tasks` (AnimatePresence) |
| `/coalitions/:addr` | `/v1/coalitions/:addr` |
| `/leaderboard` | `/v1/leaderboard` |
| `/governance` | `/v1/circuit-breaker`, WS `circuit_breaker` |

## Development

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # http://localhost:5173
```

Ensure backend API is running on `:3001` (Vite proxies `/v1` and `/ws`).

## Build

```bash
npm run build
npm run preview
```

Assets: white AN logo at `public/logo-white.svg` (favicon + loading screen).
