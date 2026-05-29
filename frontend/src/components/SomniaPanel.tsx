import { Link } from "react-router-dom";
import type { SomniaReport } from "../api/client";
import { shortAddr } from "../api/client";
import { env } from "../config/env";
import { Badge, Card, Grid } from "./ui";
import { IconShield, ICON_LG } from "./icons";

function explorerAddr(addr: string): string {
  return `${env.somniaExplorer}/address/${addr}`;
}

function FeatureRow({ label, ok }: { label: string; ok: boolean }) {
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
      <span style={{ opacity: 0.78 }}>{label}</span>
      <Badge status={ok ? "online" : "offline"} style={{ fontSize: "0.625rem" }}>
        {ok ? "Active" : "Off"}
      </Badge>
    </div>
  );
}

function ModuleBadge({ status }: { status: string }) {
  if (status === "integrated") return <Badge status="online">Integrated</Badge>;
  if (status === "delegated") return <Badge accent>Delegated</Badge>;
  return <Badge status="offline">Excluded</Badge>;
}

interface SomniaPanelProps {
  report: SomniaReport | null;
  loading?: boolean;
  compact?: boolean;
  showAllModules?: boolean;
}

export function SomniaPanel({ report, loading, compact, showAllModules }: SomniaPanelProps) {
  if (loading && !report) {
    return <p style={{ marginTop: compact ? 0 : "2rem", opacity: 0.72 }}>Loading Somnia status</p>;
  }
  if (!report) return null;

  const { features, config, gaps, agentathonReady, somniaAgentKit } = report;
  const fleetVault = features.fleetVault;
  const kitAgents = features.somniaKitRegistry.agents as Record<string, { id?: string }> | null;

  return (
    <div style={{ marginTop: compact ? 0 : "2.5rem" }}>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <IconShield size={ICON_LG} />
          <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>Somnia integration</h2>
          <Badge status={agentathonReady ? "online" : undefined} accent={!agentathonReady}>
            {agentathonReady ? "Ready" : "Not ready"}
          </Badge>
        </div>
      )}

      {!compact && (
        <p style={{ opacity: 0.72, fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: "42rem" }}>
          AETHON runs on Somnia testnet (chain {report.network.chainId}). Platform agents power ORACLE prices and
          GOVERNANCE summaries on top of our task market and coalitions.
        </p>
      )}

      <Grid cols={compact ? 2 : 3}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Platform agents</div>
          <FeatureRow label="Somnia agents on" ok={config.enabled} />
          <FeatureRow label="Consumer live" ok={features.somniaPlatformAgents.consumerDeployed} />
          <FeatureRow label="Price oracle (ORACLE)" ok={features.somniaPlatformAgents.jsonApiOracle} />
          <FeatureRow label="LLM summary (GOVERNANCE)" ok={features.somniaPlatformAgents.llmGovernanceSummary} />
          {config.consumerAddr && (
            <a
              href={explorerAddr(config.consumerAddr)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: "0.75rem", fontSize: "0.75rem", opacity: 0.72, fontFamily: "monospace" }}
            >
              Consumer {shortAddr(config.consumerAddr)}
            </a>
          )}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Fleet vault</div>
          <FeatureRow label="Vault enabled" ok={fleetVault.enabled} />
          {fleetVault.address ? (
            <a
              href={explorerAddr(fleetVault.address)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", fontSize: "0.75rem", opacity: 0.72, fontFamily: "monospace", marginBottom: "0.5rem" }}
            >
              {shortAddr(fleetVault.address)}
            </a>
          ) : (
            <p style={{ fontSize: "0.8125rem", opacity: 0.65, marginBottom: "0.5rem" }}>Not deployed</p>
          )}
          <p style={{ fontSize: "0.75rem", opacity: 0.65, lineHeight: 1.5 }}>{fleetVault.note}</p>
          <p style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: "0.5rem" }}>
            Daily limit: {fleetVault.dailyLimitStt} STT per agent
          </p>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Kit registry</div>
          <FeatureRow label="Fleet registered" ok={features.somniaKitRegistry.fleetRegistered} />
          {kitAgents && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem" }}>
              {Object.entries(kitAgents).map(([role, info]) => (
                <div key={role} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", opacity: 0.82 }}>
                  <span>{role}</span>
                  <span>#{info.id ?? "n/a"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Grid>

      {!compact && somniaAgentKit.modules && (
        <Card style={{ marginTop: "1.5rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Agent Kit modules</div>
          <p style={{ fontSize: "0.8125rem", opacity: 0.65, marginBottom: "1rem" }}>{somniaAgentKit.note}</p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {(showAllModules ? somniaAgentKit.modules : somniaAgentKit.modules.slice(0, 8)).map((m) => (
              <div
                key={m.module}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.5rem",
                  alignItems: "start",
                  fontSize: "0.8125rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  paddingBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.module}</div>
                  <div style={{ opacity: 0.65, marginTop: 2 }}>{m.aethonEquivalent}</div>
                </div>
                <ModuleBadge status={m.status} />
              </div>
            ))}
          </div>
          {!showAllModules && somniaAgentKit.modules.length > 8 && (
            <Link to="/somnia" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.8125rem", opacity: 0.82 }}>
              View all modules
            </Link>
          )}
        </Card>
      )}

      {gaps.length > 0 && (
        <Card style={{ marginTop: "1.5rem", borderColor: "rgba(255,255,255,0.22)" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Setup gaps</div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem", opacity: 0.82, lineHeight: 1.6 }}>
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
