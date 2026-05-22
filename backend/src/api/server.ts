import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import * as dotenv from "dotenv";
import {
  agentsRouter,
  coalitionsRouter,
  healthRouter,
  leaderboardRouter,
  somniaRouter,
  statsRouter,
  tasksRouter,
} from "./routes.js";
import { writeRouter } from "./writeRoutes.js";
import { attachWebSocket } from "./websocket.js";
import { blockchain } from "../services/blockchain.js";
import { seedDemoData } from "../services/seed.js";

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT ?? 3001);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "AETHON API",
    version: "3.0.0",
    docs: "/v1/health",
  });
});

const v1 = express.Router();
v1.use("/health", healthRouter);
v1.use("/agents", agentsRouter);
v1.use("/tasks", tasksRouter);
v1.use("/coalitions", coalitionsRouter);
v1.use("/stats", statsRouter);
v1.use("/leaderboard", leaderboardRouter);
v1.use("/somnia/agents", somniaRouter);
v1.use("/", writeRouter);

app.use("/v1", v1);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = createServer(app);
attachWebSocket(server);

server.listen(port, () => {
  console.log(`[AETHON API] http://localhost:${port}/v1`);
  if (!process.env.AGENT_REGISTRY_ADDR) {
    seedDemoData();
    console.log("[AETHON API] Demo data seeded (no contract addresses configured)");
  }
  blockchain.startIndexer();
});
