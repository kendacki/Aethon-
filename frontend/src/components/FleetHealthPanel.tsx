import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { AgentFleetHealth, FleetHealth } from "../api/client";
import { shortAddr } from "../api/client";
import { Badge, Card, Grid } from "./ui";
import { IconShield, ICON_LG } from "./icons";
import { spring } from "../stitches.config";

function healthLabel(status: string): string {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DEGRADED":
      return "Degraded";
    case "HALTED":
      return "Halted";
    case "STARTING":
      return "Starting";
    default:
      return "Unknown";
  }
}

function HealthStatusBadge({ status }: { status: string }) {
  if (status === "HEALTHY") return <Badge status="online">{healthLabel(status)}</Badge>;
  if (status === "DEGRADED") return <Badge accent>{healthLabel(status)}</Badge>;
  return <Badge status="offline">{healthLabel(status)}</Badge>;
}

function FleetSummaryBadge({ fleet }: { fleet: FleetHealth }) {
  if (fleet.status === "HEALTHY") return <Badge status="online">Fleet healthy</Badge>;
  if (fleet.status === "HALTED") return <Badge status="offline">Fleet halted</Badge>;
  if (fleet.status === "DEGRADED") return <Badge accent>Fleet degraded</Badge>;
  return <Badge accent>Partial fleet</Badge>;
}

function CheckRow({ check }: { check: { name: string; ok: boolean; message: string } }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.5rem 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: "0.8125rem",
      }}
    >
      <span style={{ opacity: 0.72, textTransform: "lowercase" }}>{check.name.replace(/_/g, " ")}</span>
      <span style={{ textAlign: "right", opacity: check.ok ? 0.92 : 0.72 }}>{check.message}</span>
    </div>
  );
}

function AgentHealthCard({ agent, index }: { agent: AgentFleetHealth; index: number }) {
  const metrics = agent.snapshot?.metrics;
  const checks = agent.snapshot?.checks?.slice(0, 4) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
    >
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div style={{ fontWeight: 700 }}>{agent.role}</div>
          <HealthStatusBadge status={agent.status} />
        </div>

        {agent.address && (
          <div style={{ marginTop: "0.75rem" }}>
            {agent.online ? (
              <Link
                to={`/agents/${agent.address}`}
                style={{ fontSize: "0.875rem", opacity: 0.72, fontFamily: "monospace" }}
              >
                {shortAddr(agent.address)}
              </Link>
            ) : (
              <div style={{ fontSize: "0.875rem", opacity: 0.72, fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "0.8125rem", flexWrap: "wrap" }}>
          <span>
            On-chain <strong>{agent.online ? "Online" : "Offline"}</strong>
          </span>
          {typeof metrics?.uptimeSec === "number" && (
            <span>
              Uptime <strong>{Math.floor(Number(metrics.uptimeSec) / 60)}m</strong>
            </span>
          )}
          {typeof metrics?.rpcLatencyMs === "number" && (
            <span>
              RPC <strong>{metrics.rpcLatencyMs}ms</strong>
            </span>
          )}
        </div>

        {checks.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            {checks.map((check) => (
              <CheckRow key={check.name} check={check} />
            ))}
          </div>
        )}

        {agent.snapshot?.checks?.some((c) => c.name === "vault_reserve") && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", opacity: 0.72 }}>
            Vault: {agent.snapshot?.checks?.find((c) => c.name === "vault_reserve")?.message ?? "—"}
          </p>
        )}

        {agent.error && !agent.reachable && (
          <p style={{ marginTop: "1rem", fontSize: "0.8125rem", opacity: 0.65 }}>{agent.error}</p>
        )}

        {agent.snapshot?.haltReasons && agent.snapshot.haltReasons.length > 0 && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", opacity: 0.72 }}>
            Halt: {agent.snapshot.haltReasons.join(", ")}
          </p>
        )}
      </Card>
    </motion.div>
  );
}

interface FleetHealthPanelProps {
  fleet: FleetHealth | null;
  loading?: boolean;
  compact?: boolean;
}

export function FleetHealthPanel({ fleet, loading, compact }: FleetHealthPanelProps) {
  if (loading && !fleet) {
    return <p style={{ marginTop: compact ? 0 : "2rem", opacity: 0.72 }}>Loading fleet health…</p>;
  }
  if (!fleet) return null;

  return (
    <div style={{ marginTop: compact ? 0 : "2.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: compact ? "0.75rem" : "1rem", flexWrap: "wrap" }}>
        <IconShield size={ICON_LG} />
        <h2 style={{ fontWeight: 700, fontSize: compact ? "1.125rem" : "1.25rem" }}>Fleet health</h2>
        <FleetSummaryBadge fleet={fleet} />
      </div>

      <p style={{ opacity: 0.72, fontSize: "0.875rem", marginBottom: compact ? "1rem" : "1.5rem" }}>
        {compact ? (
          <>
            {fleet.healthyCount}/{fleet.totalRoles} workers healthy ·{" "}
            <Link to="/agents" style={{ opacity: 0.9 }}>View agents</Link>
          </>
        ) : (
          <>
            Live worker diagnostics — {fleet.healthyCount}/{fleet.totalRoles} healthy
            {fleet.configuredWorkers < fleet.totalRoles && " (configure AGENT_HEALTH_URLS on API for full coverage)"}
          </>
        )}
      </p>

      <Grid cols={compact ? 2 : 3}>
        {fleet.agents.map((agent, i) => (
          <AgentHealthCard key={agent.role} agent={agent} index={i} />
        ))}
      </Grid>
    </div>
  );
}

export function AgentHealthDetail({ health }: { health: AgentFleetHealth | null }) {
  if (!health) return null;

  const checks = health.snapshot?.checks ?? [];
  const metrics = health.snapshot?.metrics;

  return (
    <Card style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconShield size={ICON_LG} />
          <h2 style={{ fontWeight: 700 }}>Worker health</h2>
        </div>
        <HealthStatusBadge status={health.status} />
      </div>

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.25rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
        <span>
          Worker <strong>{health.reachable ? "Reachable" : "Unreachable"}</strong>
        </span>
        {typeof metrics?.gasPriceGwei === "string" && (
          <span>
            Gas <strong>{metrics.gasPriceGwei} gwei</strong>
          </span>
        )}
        {typeof metrics?.tasksInFlight === "number" && (
          <span>
            Tasks in flight <strong>{String(metrics.tasksInFlight)}</strong>
          </span>
        )}
        {typeof metrics?.heartbeatFailures === "number" && (
          <span>
            Heartbeat failures <strong>{String(metrics.heartbeatFailures)}</strong>
          </span>
        )}
      </div>

      {checks.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          {checks.map((check) => (
            <CheckRow key={check.name} check={check} />
          ))}
        </div>
      )}

      {health.error && !health.reachable && (
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", opacity: 0.65 }}>{health.error}</p>
      )}
    </Card>
  );
}
