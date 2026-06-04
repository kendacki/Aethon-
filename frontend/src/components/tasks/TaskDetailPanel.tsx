import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { styled } from "../../stitches.config";
import { api, formatEth, shortAddr, type Task } from "../../api/client";
import { FLEET_ROLE_META } from "../../config/fleetRoles";
import { Badge, Button } from "../ui";
import { GlassCard } from "../GlassPanel";
import type { AgentType } from "../../task/payload";

type SkillResultRow = {
  agentType: string;
  agentAddress: string;
  result: {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: string;
  };
};

type TaskDetail = {
  task: Task;
  payload: {
    userQuery?: string;
    intent?: string;
    label?: string;
    primaryRole?: string;
    successCriteria?: Array<{ id: string; label: string; description: string }>;
  } | null;
  skillResults: SkillResultRow[];
  evaluation: {
    overallSuccess: boolean;
    summary: string;
    criteria: Array<{ id: string; label: string; met: boolean; detail?: string }>;
    roleSummaries: Array<{ role: string; success: boolean; summary: string }>;
  };
  catalog: { agentWork?: string; sources?: string[]; successCriteria?: Array<{ label: string; description: string }> } | null;
};

const Panel = styled(GlassCard, {
  defaultVariants: { tone: "neutral" },
});

const Section = styled("section", {
  marginTop: "$5",
  "& h4": {
    margin: "0 0 $2",
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.55,
  },
});

const SourceList = styled("ul", {
  margin: 0,
  paddingLeft: "1.1rem",
  fontSize: "0.8125rem",
  opacity: 0.85,
  lineHeight: 1.55,
});

const RoleCard = styled("div", {
  padding: "$3",
  borderRadius: "$md",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.25)",
  marginTop: "$2",
});

const CriteriaRow = styled("div", {
  display: "flex",
  alignItems: "flex-start",
  gap: "$2",
  fontSize: "0.8125rem",
  marginTop: "$2",
  lineHeight: 1.45,
});

type TaskDetailPanelProps = {
  taskId: number | null;
  onClose: () => void;
};

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId == null) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .taskDetail(taskId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load task"))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (taskId == null) return null;

  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Task #{taskId}</div>
          <p style={{ marginTop: 6, fontSize: "0.8125rem", opacity: 0.72 }}>Query, agent work, sources, and deliverables</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {loading && <p style={{ marginTop: "1rem", opacity: 0.7 }}>Loading task detail…</p>}
      {error && <p style={{ marginTop: "1rem", color: "#f87171" }}>{error}</p>}

      {detail && (
        <>
          <Section>
            <h4>Your request</h4>
            <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.55 }}>
              {detail.payload?.userQuery ?? detail.payload?.label ?? "—"}
            </p>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <Badge status={statusBadge(detail.task.status)}>{detail.task.status}</Badge>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{formatEth(detail.task.reward)}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{shortAddr(detail.task.submitter)}</span>
            </div>
          </Section>

          <Section>
            <h4>What agents do</h4>
            <p style={{ margin: 0, fontSize: "0.8125rem", lineHeight: 1.55, opacity: 0.88 }}>
              {detail.catalog?.agentWork ?? "Fleet agents execute the signed payload action and post skill results."}
            </p>
          </Section>

          <Section>
            <h4>Data sources</h4>
            <SourceList>
              {(detail.catalog?.sources ?? []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </SourceList>
          </Section>

          <Section>
            <h4>Success criteria</h4>
            {(detail.evaluation.criteria.length > 0 ? detail.evaluation.criteria : []).map((c) => (
              <CriteriaRow key={c.id}>
                <span style={{ color: c.met ? "#4ade80" : "#f87171" }}>{c.met ? "✓" : "○"}</span>
                <span>
                  <strong>{c.label}</strong>
                  {c.detail ? <span style={{ opacity: 0.72 }}> — {c.detail}</span> : null}
                </span>
              </CriteriaRow>
            ))}
            <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", opacity: 0.8 }}>{detail.evaluation.summary}</p>
            {detail.task.status === "COMPLETED" || detail.task.status === "FAILED" ? (
              <p style={{ marginTop: "0.5rem", fontWeight: 600, fontSize: "0.8125rem" }}>
                On-chain outcome: {detail.evaluation.overallSuccess ? "Criteria met" : "Criteria not fully met"}
              </p>
            ) : (
              <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.65 }}>
                Results update as agents report skills. On-chain completion follows coalition aggregation.
              </p>
            )}
          </Section>

          <Section>
            <h4>Agent outputs</h4>
            {detail.skillResults.length === 0 && (
              <p style={{ fontSize: "0.8125rem", opacity: 0.7 }}>No skill results yet — waiting for assigned agents.</p>
            )}
            {detail.skillResults.map((row) => {
              const meta = FLEET_ROLE_META[row.agentType as AgentType];
              const data = row.result.data ?? {};
              const sources = Array.isArray(data.sources) ? (data.sources as string[]) : [];
              return (
                <RoleCard key={row.agentAddress}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{meta?.label ?? row.agentType}</span>
                    <Badge status={row.result.success !== false ? "online" : "offline"}>
                      {row.result.success !== false ? "OK" : "Failed"}
                    </Badge>
                  </div>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", lineHeight: 1.5, opacity: 0.9 }}>
                    {String(data.summary ?? row.result.error ?? "—")}
                  </p>
                  {sources.length > 0 && (
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.6875rem", opacity: 0.6 }}>
                      Sources: {sources.join(" · ")}
                    </p>
                  )}
                </RoleCard>
              );
            })}
          </Section>

          {detail.task.coalitionAddr && (
            <div style={{ marginTop: "$5" }}>
              <Link to={`/coalitions/${detail.task.coalitionAddr}`} style={{ fontSize: "0.8125rem", textDecoration: "underline" }}>
                View coalition
              </Link>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function statusBadge(status: string): "online" | "offline" | undefined {
  if (status === "COMPLETED") return "online";
  if (status === "FAILED" || status === "EXPIRED") return "offline";
  return undefined;
}
