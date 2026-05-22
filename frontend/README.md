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

## Vercel Deployment

1. In Vercel project settings, set **Root Directory** to `frontend` (recommended),  
   **or** leave root empty — the repo root `vercel.json` builds `frontend/` automatically.
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Add **Environment Variables** (Production):
   - `VITE_API_URL` = your backend URL + `/v1` (e.g. `https://api.example.com/v1`)
   - `VITE_WS_URL` = your backend WebSocket URL
   - `VITE_API_KEY` = your API key

The backend API must be deployed separately (Docker/Railway/Fly.io). Vercel hosts the static frontend only.

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
