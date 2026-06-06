#!/usr/bin/env node
/**
 * Railway entrypoint — lives in dist/ after build (see copy-assets.cjs).
 * API:  non-agent Railway service name (default)
 * Agent: aethon-agent-* services with AGENT_TYPE + AGENT_PRIVATE_KEY
 */
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { resolveRuntime } = require("./resolve-runtime.cjs");

const distDir = __dirname;
const healthFile = process.env.AGENT_HEALTH_FILE ?? path.join(os.tmpdir(), "aethon-agent-health.json");

const requestedRuntime = (process.env.AETHON_RUNTIME ?? "api").toLowerCase();
const runtime = resolveRuntime();

if (requestedRuntime !== runtime) {
  console.warn(
    `[railway-start] Overriding AETHON_RUNTIME=${requestedRuntime} → ${runtime} ` +
      `(service=${process.env.RAILWAY_SERVICE_NAME ?? "local"}, domain=${process.env.RAILWAY_PUBLIC_DOMAIN ?? "n/a"})`,
  );
}

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

function isAgentHealthPath(url) {
  const pathOnly = (url ?? "/").split("?")[0];
  return (
    pathOnly === "/" ||
    pathOnly === "/health" ||
    pathOnly.startsWith("/health/") ||
    pathOnly === "/v1/health" ||
    pathOnly.startsWith("/v1/health/")
  );
}

function buildChildEnv() {
  const childEnv = { ...process.env, AETHON_RUNTIME: runtime };
  if (runtime === "api") {
    if (childEnv.AGENT_PRIVATE_KEY) {
      console.warn(
        "[railway-start] Removing AGENT_PRIVATE_KEY from API runtime — delete it from Railway Variables on the API service",
      );
      delete childEnv.AGENT_PRIVATE_KEY;
    }
    if (childEnv.AGENT_TYPE) {
      delete childEnv.AGENT_TYPE;
    }
  }
  return childEnv;
}

if (runtime === "agent") {
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.error("[railway-start] Agent worker requires AGENT_PRIVATE_KEY");
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 8080);
  http
    .createServer((req, res) => {
      if (!isAgentHealthPath(req.url)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Agent worker — use API service for /v1 routes" }));
        return;
      }
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

const child = spawn(process.execPath, [entry], {
  stdio: "inherit",
  env: buildChildEnv(),
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
