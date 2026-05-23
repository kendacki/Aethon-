import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";
import * as dotenv from "dotenv";
import {
  agentsRouter,
  circuitBreakerRouter,
  coalitionsRouter,
  healthRouter,
  leaderboardRouter,
  reputationRouter,
  somniaRouter,
  statsRouter,
  tasksRouter,
} from "./routes.js";
import { writeRouter } from "./writeRoutes.js";
import { attachWebSocket } from "./websocket.js";
import { migrate } from "../db/migrate.js";
import { pool } from "../db/client.js";
import { indexer } from "../services/indexer.js";
import { relayer } from "../services/relayer.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);

const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? ["http://localhost:5173", "http://localhost:3000"];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_RPM ?? 500),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const openapiPath = path.join(__dirname, "../../openapi.yaml");
if (fs.existsSync(openapiPath)) {
  const spec = yaml.parse(fs.readFileSync(openapiPath, "utf8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}

app.get("/", (_req, res) => {
  res.json({ name: "AETHON API", version: "3.1.0", docs: "/docs", health: "/v1/health" });
});

const v1 = express.Router();
v1.use("/health", healthRouter);
v1.use("/agents", agentsRouter);
v1.use("/reputation", reputationRouter);
v1.use("/tasks", tasksRouter);
v1.use("/coalitions", coalitionsRouter);
v1.use("/circuit-breaker", circuitBreakerRouter);
v1.use("/stats", statsRouter);
v1.use("/leaderboard", leaderboardRouter);
v1.use("/somnia/agents", somniaRouter);
v1.use("/", writeRouter);

app.use("/v1", v1);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const server = createServer(app);
attachWebSocket(server);

async function bootstrap(): Promise<void> {
  await migrate();
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`[AETHON API] http://localhost:${port}/v1`);
      console.log(`[AETHON API] Docs: http://localhost:${port}/docs`);
      resolve();
    });
  });
  if (process.env.AGENT_REGISTRY_ADDR) {
    void indexer.start();
    relayer.start();
  } else {
    console.warn("[AETHON API] No contract addresses — indexer/relayer disabled");
  }
}

function shutdown(): void {
  relayer.stop();
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
