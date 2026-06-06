#!/usr/bin/env node
/**
 * Railway entrypoint — lives in dist/ after build (see copy-assets.cjs).
 * API:  AETHON_RUNTIME=api (default) or non-agent Railway service name
 * Agent: AETHON_RUNTIME=agent + AGENT_TYPE + AGENT_PRIVATE_KEY on aethon-agent-* services
 */
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const distDir = __dirname;
const healthFile = process.env.AGENT_HEALTH_FILE ?? path.join(os.tmpdir(), "aethon-agent-health.json");

/** Prefer Railway service identity over a mis-set AETHON_RUNTIME on the API service. */
function resolveRuntime() {
  const serviceName = (process.env.RAILWAY_SERVICE_NAME ?? "").toLowerCase();
  const publicDomain = (process.env.RAILWAY_PUBLIC_DOMAIN ?? "").toLowerCase();

  if (serviceName.includes("agent")) {
    return "agent";
  }

  if (serviceName || publicDomain) {
    return "api";
  }

  return (process.env.AETHON_RUNTIME ?? "api").toLowerCase() === "agent" ? "agent" : "api";
}

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

if (runtime === "agent") {
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.error("[railway-start] AETHON_RUNTIME=agent requires AGENT_PRIVATE_KEY");
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
  env: { ...process.env, AETHON_RUNTIME: runtime },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
