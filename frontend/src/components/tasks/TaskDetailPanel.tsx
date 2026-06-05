import { useCallback, useEffect, useState } from "react";
import { styled, keyframes } from "../../stitches.config";
import { api, type TaskDetailResponse } from "../../api/client";
import { formatTaskOutput, isTaskInProgress } from "../../lib/taskResult";
import { SwarmExecutionButton } from "./SwarmExecutionButton";

const pulse = keyframes({
  "0%, 100%": { opacity: 0.45 },
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
  lineHeight: 1.65,
});

const Thinking = styled("p", {
  margin: "0 0 $4",
  paddingLeft: "$3",
  borderLeft: "2px solid rgba(255,255,255,0.14)",
  fontSize: "0.8125rem",
  lineHeight: 1.55,
  opacity: 0.58,
  fontStyle: "italic",
});

const Body = styled("div", {
  color: "rgba(255,255,255,0.92)",
  whiteSpace: "pre-wrap",
  "& p": { margin: "0 0 $3" },
});

const Recommendation = styled("div", {
  marginTop: "$5",
  padding: "$4 $4",
  borderRadius: "$md",
  background: "rgba(13, 188, 130, 0.08)",
  border: "1px solid rgba(13, 188, 130, 0.22)",
  fontSize: "0.875rem",
  lineHeight: 1.55,
});

const RecommendationLabel = styled("div", {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
  opacity: 0.65,
  marginBottom: "$2",
});

const PendingDots = styled("span", {
  display: "inline-block",
  animation: `${pulse} 1.4s ease-in-out infinite`,
});

const ErrorText = styled("p", {
  margin: "$4 0 0",
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
    setError(null);
    try {
      const data = await api.taskDetail(taskId);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load result");
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
    if (taskId == null || !detail || !isTaskInProgress(detail.task.status)) return;
    const timer = window.setInterval(() => {
      void loadDetail();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [taskId, detail, loadDetail]);

  if (taskId == null) return null;

  const output = formatTaskOutput(detail);
  const showThinking = Boolean(output.thinking) && (output.isPending || Boolean(output.body));

  return (
    <ResponseShell aria-live="polite" aria-busy={loading || output.isPending}>
      <ResponseCard>
        {showThinking && (
          <Thinking>
            {output.thinking}
            {output.isPending && !detail?.skillResults.length ? (
              <>
                {" "}
                <PendingDots>●●●</PendingDots>
              </>
            ) : null}
          </Thinking>
        )}

        {loading && !detail ? (
          <Body>
            <PendingDots>Loading result...</PendingDots>
          </Body>
        ) : (
          <Body>{output.body}</Body>
        )}

        {output.recommendation ? (
          <Recommendation>
            <RecommendationLabel>recommendation</RecommendationLabel>
            {output.recommendation}
          </Recommendation>
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
