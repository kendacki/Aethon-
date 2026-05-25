#!/usr/bin/env node
/**
 * Railway entrypoint — lives in dist/ after build (see copy-assets.cjs).
 * API:  AETHON_RUNTIME=api (default)
 * Agent: AETHON_RUNTIME=agent + AGENT_TYPE + AGENT_PRIVATE_KEY
 */
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const runtime = (process.env.AETHON_RUNTIME ?? "api").toLowerCase();
const distDir = __dirname;
const healthFile = process.env.AGENT_HEALTH_FILE ?? path.join(os.tmpdir(), "aethon-agent-health.json");

const entry =
  runtime === "agent"
    ? path.join(distDir, "agent", "index.js")
    : path.join(distDir, "api", "server.js");

function readAgentHealth() {
  try {
    return JSON.parse(fs.readFileSync(healthFile, "utf8"));
  } catch {
    return null;
  }
}

if (runtime === "agent") {
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.error("[railway-start] AETHON_RUNTIME=agent requires AGENT_PRIVATE_KEY");
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 8080);
  http
    .createServer((req, res) => {
      const snapshot = readAgentHealth();
      const body = snapshot
        ? { alive: true, runtime: "agent", ...snapshot }
        : {
            alive: true,
            runtime: "agent",
            agentType: process.env.AGENT_TYPE ?? "ARBITRAGE",
            status: "STARTING",
            path: req.url,
          };
      const code = snapshot?.status === "HALTED" ? 503 : 200;
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    })
    .listen(port, () => {
      console.log(`[railway-start] Agent health on :${port} (${process.env.AGENT_TYPE ?? "ARBITRAGE"})`);
    });
} else {
  console.log("[railway-start] API server");
}

const child = spawn(process.execPath, [entry], { stdio: "inherit", env: process.env });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
