#!/usr/bin/env node
/**
 * Railway entrypoint — routes to API or agent based on AETHON_RUNTIME.
 * API service:  AETHON_RUNTIME=api   (default)
 * Agent workers: AETHON_RUNTIME=agent + AGENT_TYPE + AGENT_PRIVATE_KEY
 */
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const runtime = (process.env.AETHON_RUNTIME ?? "api").toLowerCase();

const entry =
  runtime === "agent"
    ? path.join(__dirname, "..", "dist", "agent", "index.js")
    : path.join(__dirname, "..", "dist", "api", "server.js");

if (runtime === "agent") {
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.error("[railway-start] AETHON_RUNTIME=agent requires AGENT_PRIVATE_KEY");
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 8080);
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          alive: true,
          runtime: "agent",
          agentType: process.env.AGENT_TYPE ?? "ARBITRAGE",
          path: req.url,
        }),
      );
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
