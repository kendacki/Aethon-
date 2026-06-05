import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, formatEth, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import {
  PageContent,
  SectionHeading,
  SectionHeadingTitle,
  SubpageHero,
} from "../components/layout/SubpageLayout";
import { Badge, PageWrap } from "../components/ui";
import { ErrorBanner } from "../components/ErrorBanner";
import { TaskChatWorkspace } from "../components/tasks/TaskChatWorkspace";
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";
import { GlassFilterPill } from "../components/GlassPanel";
import { GLASS } from "../theme/glass";
import { taskStatusLabel } from "../lib/formatText";

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "all" },
  { value: "PENDING", label: "pending" },
  { value: "ASSIGNED", label: "assigned" },
  { value: "COMPLETED", label: "completed" },
  { value: "FAILED", label: "failed" },
  { value: "EXPIRED", label: "expired" },
];

const Workspace = styled("div", {
  display: "grid",
  gap: "$6",
  alignItems: "start",
  variants: {
    session: {
      true: {
        "@lg": { gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 300px)" },
      },
      false: {
        gridTemplateColumns: "1fr",
      },
    },
  },
});

const MainColumn = styled("div", {
  minWidth: 0,
});

const HistoryPanel = styled(motion.aside, {
  minWidth: 0,
  borderRadius: "$lg",
  border: `1px solid ${GLASS.borderSoft}`,
  background: "rgba(0,0,0,0.22)",
  padding: "$4",
  maxHeight: "calc(100vh - 12rem)",
  overflowY: "auto",
  position: "sticky",
  top: "$6",
});

const HistoryPanelTitle = styled("div", {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
  opacity: 0.55,
  marginBottom: "$3",
});

const HistoryList = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "$2",
});

const HistoryItem = styled("button", {
  width: "100%",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: "$2",
  padding: "$3",
  borderRadius: "$md",
  border: "1px solid transparent",
  background: "rgba(0,0,0,0.22)",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  transition: "border-color 150ms ease, background 150ms ease",
  "&:hover": {
    borderColor: GLASS.borderSoft,
    background: "rgba(255,255,255,0.04)",
  },
  variants: {
    active: {
      true: {
        borderColor: GLASS.accentBorder,
        background: GLASS.accentFillSoft,
      },
    },
  },
});

const HistoryQuery = styled("div", {
  fontSize: "0.8125rem",
  fontWeight: 600,
  lineHeight: 1.4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
});

const HistoryMeta = styled("div", {
  fontSize: "0.6875rem",
  opacity: 0.62,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.35rem",
});

const InlineHistoryBlock = styled("div", {
  marginTop: "$10",
});

const FilterRow = styled("div", {
  display: "flex",
  gap: "$2",
  marginBottom: "$5",
  flexWrap: "wrap",
  alignItems: "center",
});

const EmptyHistory = styled("div", {
  padding: "$8",
  textAlign: "center",
  borderRadius: "$md",
  border: `1px dashed ${GLASS.borderSoft}`,
  opacity: 0.7,
  fontSize: "0.875rem",
});

function HistorySection({
  tasks,
  labels,
  selectedId,
  loading,
  status,
  onStatusChange,
  onSelect,
  compact,
}: {
  tasks: Task[];
  labels: Record<number, string>;
  selectedId: number | null;
  loading: boolean;
  status: string;
  onStatusChange: (status: string) => void;
  onSelect: (id: number) => void;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && (
        <SectionHeading>
          <SectionHeadingTitle>history</SectionHeadingTitle>
        </SectionHeading>
      )}

      <FilterRow>
        {STATUSES.map((s) => (
          <GlassFilterPill
            key={s.value || "all"}
            type="button"
            active={status === s.value}
            onClick={() => onStatusChange(s.value)}
          >
            {s.label}
          </GlassFilterPill>
        ))}
      </FilterRow>

      {loading && tasks.length === 0 && <p style={{ opacity: 0.65, fontSize: "0.875rem" }}>loading...</p>}

      <HistoryList>
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => {
            const query = labels[task.id] ?? `Task #${task.id}`;
            const truncated = query.length > 120 ? `${query.slice(0, 117)}…` : query;

            return (
              <HistoryItem
                key={task.id}
                type="button"
                active={selectedId === task.id}
                onClick={() => onSelect(task.id)}
                as={motion.button}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring}
              >
                <HistoryQuery>{truncated}</HistoryQuery>
                <HistoryMeta>
                  <Badge status={statusColor[task.status]}>{taskStatusLabel(task.status)}</Badge>
                  <span>{formatEth(task.reward)}</span>
                  {!compact && <span>#{task.id}</span>}
                </HistoryMeta>
              </HistoryItem>
            );
          })}
        </AnimatePresence>
      </HistoryList>

      {!loading && tasks.length === 0 && (
        <EmptyHistory>
          <p style={{ margin: 0 }}>No tasks yet.</p>
        </EmptyHistory>
      )}
    </>
  );
}

export default function TasksPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const { signedIn } = useSignedIn();
  const toast = useToast();
  const location = useLocation();
  const historyRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, reload } = useFetch(() => api.tasks(page, status || undefined), [page, status]);
  const { lastEvent } = useWebSocket(["tasks"]);

  useEffect(() => {
    if (data) setTasks(data.data);
  }, [data]);

  useEffect(() => {
    if (!lastEvent) return;
    if (["TASK_SUBMITTED", "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_FAILED", "TASK_EXPIRED", "TASK_RELAYED"].includes(lastEvent.type)) {
      toast.info(`Task ${lastEvent.type.replace("TASK_", "").toLowerCase()}`);
      reload();
    }
  }, [lastEvent, reload, toast]);

  useEffect(() => {
    const state = location.state as { scrollToTasks?: boolean; openTaskId?: number } | null;
    if (state?.openTaskId) {
      setSelectedId(state.openTaskId);
      setSessionActive(true);
    }
    if (state?.scrollToTasks && historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    for (const task of tasks) {
      if (labels[task.id]) continue;
      void api
        .taskPayload(task.taskHash)
        .then((p) => {
          const q = (p?.userQuery as string) ?? (p?.label as string);
          if (q) setLabels((prev) => ({ ...prev, [task.id]: q }));
        })
        .catch(() => undefined);
    }
  }, [tasks, labels]);

  const prependTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
  }, []);

  useEffect(() => {
    if (lastEvent?.type === "TASK_SUBMITTED" && lastEvent.payload.taskId) {
      const id = Number(lastEvent.payload.taskId);
      prependTask({
        id,
        submitter: "0x…",
        taskHash: "0x…",
        reward: String(lastEvent.payload.reward ?? "0"),
        complexity: 1,
        deadline: new Date(Date.now() + 3600000).toISOString(),
        status: "PENDING",
      });
      setSelectedId(id);
      setSessionActive(true);
    }
  }, [lastEvent, prependTask]);

  const handleTaskCreated = useCallback(
    ({ taskId, userQuery }: { taskId: number; userQuery: string }) => {
      setSelectedId(taskId);
      setSessionActive(true);
      setLabels((prev) => ({ ...prev, [taskId]: userQuery }));
    },
    [],
  );

  const handleSelectTask = useCallback((id: number) => {
    setSelectedId(id);
    setSessionActive(true);
  }, []);

  const handleEndSession = useCallback(() => {
    setSelectedId(null);
    setSessionActive(false);
  }, []);

  const handleStatusChange = useCallback((next: string) => {
    setStatus(next);
    setPage(0);
  }, []);

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <SubpageHero
              badge={<Badge accent>Tasks</Badge>}
              title="Ask the swarm"
              lead={signedIn ? undefined : "Sign in to submit a question."}
            />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$20" }}>
          <ErrorBanner message={error} onRetry={reload} />

          <PageContent>
            <Workspace session={sessionActive}>
              <MainColumn>
                <TaskChatWorkspace
                  activeTaskId={selectedId}
                  onTaskCreated={handleTaskCreated}
                  onDismiss={handleEndSession}
                  onSubmitted={reload}
                />

                {!sessionActive && (
                  <InlineHistoryBlock id="task-list" ref={historyRef}>
                    <HistorySection
                      tasks={tasks}
                      labels={labels}
                      selectedId={selectedId}
                      loading={loading}
                      status={status}
                      onStatusChange={handleStatusChange}
                      onSelect={handleSelectTask}
                    />

                    {data && data.pagination.total > 20 && (
                      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", alignItems: "center" }}>
                        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
                          previous
                        </button>
                        <span style={{ opacity: 0.65, fontSize: "0.875rem" }}>Page {page + 1}</span>
                        <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>
                          next
                        </button>
                      </div>
                    )}
                  </InlineHistoryBlock>
                )}
              </MainColumn>

              <AnimatePresence>
                {sessionActive && (
                  <HistoryPanel
                    key="history-sidebar"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={spring}
                  >
                    <HistoryPanelTitle>history</HistoryPanelTitle>
                    <HistorySection
                      tasks={tasks}
                      labels={labels}
                      selectedId={selectedId}
                      loading={loading}
                      status={status}
                      onStatusChange={handleStatusChange}
                      onSelect={handleSelectTask}
                      compact
                    />
                  </HistoryPanel>
                )}
              </AnimatePresence>
            </Workspace>
          </PageContent>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}

const statusColor: Record<string, "online" | "offline" | undefined> = {
  COMPLETED: "online",
  FAILED: "offline",
  EXPIRED: "offline",
};
