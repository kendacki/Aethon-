import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, formatEth, shortAddr, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import { Badge, Card, PageWrap, Heading } from "../components/ui";
import { IconTask, ICON_MD } from "../components/icons";
import { ErrorBanner } from "../components/ErrorBanner";
import { TaskSubmitPanel } from "../components/session/TaskSubmitPanel";
import { TaskDetailPanel } from "../components/tasks/TaskDetailPanel";
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";
import { GlassFilterPill } from "../components/GlassPanel";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const LayoutGrid = styled("div", {
  display: "grid",
  gap: "$8",
  "@lg": {
    gridTemplateColumns: "minmax(300px, 400px) 1fr",
    alignItems: "start",
  },
});

const ListHeader = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "$3",
  marginBottom: "$4",
});

const TaskButton = styled("button", {
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
});

export default function TasksPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [labels, setLabels] = useState<Record<number, string>>({});
  const { signedIn } = useSignedIn();
  const toast = useToast();
  const location = useLocation();
  const taskListRef = useRef<HTMLDivElement>(null);
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
      if (selectedId && lastEvent.payload.taskId === selectedId) {
        /* detail panel refetches on taskId */
      }
    }
  }, [lastEvent, reload, toast, selectedId]);

  useEffect(() => {
    const state = location.state as { scrollToTasks?: boolean; openTaskId?: number } | null;
    if (state?.openTaskId) setSelectedId(state.openTaskId);
    if (state?.scrollToTasks && taskListRef.current) {
      taskListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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
      prependTask({
        id: Number(lastEvent.payload.taskId),
        submitter: "0x…",
        taskHash: "0x…",
        reward: String(lastEvent.payload.reward ?? "0"),
        complexity: 1,
        deadline: new Date(Date.now() + 3600000).toISOString(),
        status: "PENDING",
      });
    }
  }, [lastEvent, prependTask]);

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <Badge accent>Task Market</Badge>
          </HeroItem>
          <HeroItem>
            <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Ask the swarm</Heading>
          </HeroItem>
          <HeroItem>
            <p style={{ marginTop: "0.5rem", opacity: 0.82, maxWidth: 560, lineHeight: 1.65 }}>
              {signedIn
                ? "Submit a real question — price, yield, governance, risk, or a full briefing. Track sources, agent outputs, and success criteria per task."
                : "Browse on-chain tasks. Sign in to run queries against the autonomous fleet."}
            </p>
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "2.5rem" }}>
          <ErrorBanner message={error} onRetry={reload} />

          <LayoutGrid>
            <div>
              <TaskSubmitPanel
                onSubmitted={() => {
                  reload();
                }}
              />
            </div>

            <div id="task-list" ref={taskListRef}>
              <ListHeader>
                <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>Your tasks</div>
                {data && (
                  <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>
                    {data.pagination.total} total — click a task for outputs
                  </span>
                )}
              </ListHeader>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <GlassFilterPill key={s || "all"} type="button" active={status === s} onClick={() => { setStatus(s); setPage(0); }}>
                    {s || "All"}
                  </GlassFilterPill>
                ))}
              </div>

              {selectedId != null && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <TaskDetailPanel taskId={selectedId} onClose={() => setSelectedId(null)} />
                </div>
              )}

              {loading && tasks.length === 0 && <p style={{ opacity: 0.72 }}>Loading tasks</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -24, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={{ opacity: 0, x: 24, height: 0 }}
                      transition={spring}
                    >
                      <Card
                        style={{
                          outline: selectedId === task.id ? "1px solid rgba(255,255,255,0.25)" : undefined,
                        }}
                      >
                        <TaskButton type="button" onClick={() => setSelectedId(task.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                              <IconTask size={ICON_MD} />
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {labels[task.id]
                                    ? labels[task.id].length > 64
                                      ? `${labels[task.id].slice(0, 61)}…`
                                      : labels[task.id]
                                    : `Task #${task.id}`}
                                </div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.72, marginTop: 4 }}>
                                  #{task.id} · {shortAddr(task.submitter)}
                                  {task.complexity >= 5 ? " · Swarm" : " · Single"}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <Badge status={statusColor[task.status]}>{task.status}</Badge>
                              <span style={{ fontWeight: 600 }}>{formatEth(task.reward)}</span>
                            </div>
                          </div>
                        </TaskButton>
                        {task.coalitionAddr && (
                          <Link
                            to={`/coalitions/${task.coalitionAddr}`}
                            style={{ fontSize: "0.75rem", opacity: 0.82, textDecoration: "underline", marginTop: "0.75rem", display: "inline-block" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Coalition
                          </Link>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {!loading && tasks.length === 0 && (
                <Card style={{ marginTop: "1rem", textAlign: "center", opacity: 0.85 }}>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>No tasks yet — ask the swarm using the form.</p>
                </Card>
              )}

              {data && data.pagination.total > 20 && (
                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
                    Prev
                  </button>
                  <span style={{ opacity: 0.72 }}>Page {page + 1}</span>
                  <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </LayoutGrid>
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
