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
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const filterBtn = (active: boolean) => ({
  padding: "0.5rem 1rem",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: active ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
  color: "#FFFFFF",
  border: `1px solid ${active ? "rgba(255, 255, 255, 0.28)" : "rgba(255, 255, 255, 0.12)"}`,
});

const LayoutGrid = styled("div", {
  display: "grid",
  gap: "$8",
  "@lg": {
    gridTemplateColumns: "minmax(280px, 380px) 1fr",
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

export default function TasksPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
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
    }
  }, [lastEvent, reload, toast]);

  const prependTask = useCallback((task: Task) => {
    setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
  }, []);

  useEffect(() => {
    const state = location.state as { scrollToTasks?: boolean } | null;
    if (state?.scrollToTasks && taskListRef.current) {
      taskListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
            <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Task market</Heading>
          </HeroItem>
          <HeroItem>
            <p style={{ marginTop: "0.5rem", opacity: 0.82, maxWidth: 560, lineHeight: 1.65 }}>
              {signedIn
                ? "Submit work to the swarm and watch assignments update in real time."
                : "Browse open tasks. Sign in to submit jobs to autonomous agents."}
            </p>
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "2.5rem" }}>
        <ErrorBanner message={error} onRetry={reload} />

        <LayoutGrid>
          <div>
            <TaskSubmitPanel onSubmitted={reload} />
          </div>

          <div id="task-list" ref={taskListRef}>
            <ListHeader>
              <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>Open tasks</div>
              {data && (
                <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>
                  {data.pagination.total} total
                </span>
              )}
            </ListHeader>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button key={s || "all"} onClick={() => { setStatus(s); setPage(0); }} style={filterBtn(status === s)}>
                  {s || "All"}
                </button>
              ))}
            </div>

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
                    <Card>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <IconTask size={ICON_MD} />
                          <div>
                            <div style={{ fontWeight: 700 }}>Task #{task.id}</div>
                            <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>
                              {shortAddr(task.submitter)} · Level {task.complexity}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <Badge status={statusColor[task.status]}>{task.status}</Badge>
                          <span style={{ fontWeight: 600 }}>{formatEth(task.reward)}</span>
                          {task.coalitionAddr && (
                            <Link to={`/coalitions/${task.coalitionAddr}`} style={{ fontSize: "0.75rem", opacity: 0.82, textDecoration: "underline" }}>
                              Coalition
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {!loading && tasks.length === 0 && (
              <Card style={{ marginTop: "1rem", textAlign: "center", opacity: 0.85 }}>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>No tasks match this filter.</p>
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
