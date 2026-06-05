import { useCallback, useEffect, useState } from "react";
import { styled, keyframes } from "../../stitches.config";
import { api, type TaskDetailResponse } from "../../api/client";
import { formatTaskOutput, isTaskInProgress } from "../../lib/taskResult";
import { SwarmExecutionButton } from "./SwarmExecutionButton";

const pulse = keyframes({
  "0%, 100%": { opacity: 0.4 },
  "50%": { opacity: 1 },
});

const ResponseShell = styled("div", {
  width: "100%",
  maxWidth: "48rem",
  margin: "$6 auto 0",
});

const ResponseCard = styled("article", {
  padding: "$5 $6",
  borderRadius: "$lg",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  fontSize: "0.9375rem",
  lineHeight: 1.7,
});

const StatusLine = styled("p", {
  margin: 0,
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  opacity: 0.55,
});

const Body = styled("div", {
  color: "rgba(255,255,255,0.94)",
  whiteSpace: "pre-wrap",
  fontSize: "0.9375rem",
  lineHeight: 1.7,
});

const NextStep = styled("p", {
  margin: "$4 0 0",
  paddingTop: "$4",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  fontSize: "0.875rem",
  lineHeight: 1.6,
  opacity: 0.82,
});

const PendingDots = styled("span", {
  display: "inline-block",
  marginLeft: 4,
  animation: `${pulse} 1.4s ease-in-out infinite`,
});

const ErrorText = styled("p", {
  margin: "$3 0 0",
  color: "#f87171",
  fontSize: "0.875rem",
});

const ExecuteBlock = styled("div", {
  marginTop: "$5",
  paddingTop: "$4",
  borderTop: "1px solid rgba(255,255,255,0.08)",
});

type TaskDetailPanelProps = {
  taskId: number | null;
  onClose?: () => void;
};

export function TaskDetailPanel({ taskId }: TaskDetailPanelProps) {
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (taskId == null) return;
    setLoading(true);
    try {
      const data = await api.taskDetail(taskId);
      if (data) {
        setDetail(data);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the answer.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId == null) {
      setDetail(null);
      setError(null);
      return;
    }
    void loadDetail();
  }, [taskId, loadDetail]);

  useEffect(() => {
    if (taskId == null) return;
    const inProgress = !detail || isTaskInProgress(detail.task.status);
    if (!inProgress) return;
    const timer = window.setInterval(() => {
      void loadDetail();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [taskId, detail, loadDetail]);

  if (taskId == null) return null;

  const output = formatTaskOutput(detail);
  const showStatus = output.isPending || (loading && !detail);

  return (
    <ResponseShell aria-live="polite" aria-busy={loading || output.isPending}>
      <ResponseCard>
        {showStatus && (
          <StatusLine>
            {output.thinking || "Analyzing your question with live market and fleet data."}
            <PendingDots aria-hidden>···</PendingDots>
          </StatusLine>
        )}

        {output.body ? <Body>{output.body}</Body> : null}

        {output.recommendation ? (
          <NextStep>
            <strong style={{ fontWeight: 600, opacity: 0.9 }}>Recommended next step. </strong>
            {output.recommendation}
          </NextStep>
        ) : null}

        {error ? <ErrorText>{error}</ErrorText> : null}

        {detail?.execution && detail.task.status === "COMPLETED" && (
          <ExecuteBlock>
            <SwarmExecutionButton
              targetContract={detail.execution.targetContract}
              executionPayload={detail.execution.executionPayload}
            />
          </ExecuteBlock>
        )}
      </ResponseCard>
    </ResponseShell>
  );
}
