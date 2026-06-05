import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, formatEth, shortAddr, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import { Badge, PageWrap, Heading } from "../components/ui";
import { ErrorBanner } from "../components/ErrorBanner";
import { TaskSubmitPanel } from "../components/session/TaskSubmitPanel";
import { TaskDetailPanel } from "../components/tasks/TaskDetailPanel";
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";
import { GlassFilterPill } from "../components/GlassPanel";
import { GLASS } from "../theme/glass";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const ChatPage = styled("div", {
  width: "100%",
  maxWidth: "52rem",
  margin: "0 auto",
});

const SectionDivider = styled("div", {
  margin: "$10 0 $6",
  borderTop: `1px solid ${GLASS.divider}`,
});

const SectionLabel = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "$3",
  marginBottom: "$4",
});

const SectionTitle = styled("h2", {
  margin: 0,
  fontSize: "0.8125rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.55,
  fontFamily: "$secondary",
});

const UserBubble = styled("div", {
  marginBottom: "$4",
  padding: "$4 $5",
  borderRadius: "$lg",
  border: `1px solid ${GLASS.borderSoft}`,
  background: "rgba(255,255,255,0.04)",
  fontSize: "0.9375rem",
  lineHeight: 1.55,
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$4",
  padding: "$3 $4",
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
  fontSize: "0.875rem",
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
  marginTop: "$1",
});

const HistoryAside = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "$2",
  flexShrink: 0,
});

const FilterRow = styled("div", {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "$4",
  flexWrap: "wrap",
});

const EmptyHistory = styled("div", {
  padding: "$6",
  textAlign: "center",
  borderRadius: "$md",
  border: `1px dashed ${GLASS.borderSoft}`,
  opacity: 0.75,
  fontSize: "0.875rem",
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
    if (state?.openTaskId) setSelectedId(state.openTaskId);
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
    }
  }, [lastEvent, prependTask]);

  const selectedLabel = selectedId != null ? labels[selectedId] : null;

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <Badge accent>Task Market</Badge>
          </HeroItem>
          <HeroItem>
            <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", marginTop: "1rem", textAlign: "center" }}>
              Ask the swarm
            </Heading>
          </HeroItem>
          <HeroItem>
            <p
              style={{
                marginTop: "0.5rem",
                opacity: 0.82,
                maxWidth: 520,
                lineHeight: 1.65,
                textAlign: "center",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {signedIn
                ? "Type a question like ChatGPT — agents run it on-chain with live sources and measurable success criteria."
                : "Browse task history below. Sign in to submit queries to the autonomous fleet."}
            </p>
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "2rem" }}>
          <ErrorBanner message={error} onRetry={reload} />

          <ChatPage>
            <TaskSubmitPanel
              variant="chat"
              onSubmitted={() => {
                reload();
              }}
            />

            {selectedId != null && selectedLabel && (
              <UserBubble aria-label="Selected task query">
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", opacity: 0.5, marginBottom: 6 }}>
                  Your query
                </div>
                {selectedLabel}
              </UserBubble>
            )}

            {selectedId != null && (
              <div style={{ marginBottom: "0.5rem" }}>
                <TaskDetailPanel taskId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            )}

            <SectionDivider id="task-list" ref={historyRef} />

            <SectionLabel>
              <SectionTitle>History</SectionTitle>
              {data && (
                <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>
                  {data.pagination.total} task{data.pagination.total === 1 ? "" : "s"}
                </span>
              )}
            </SectionLabel>

            <FilterRow>
              {STATUSES.map((s) => (
                <GlassFilterPill
                  key={s || "all"}
                  type="button"
                  active={status === s}
                  onClick={() => {
                    setStatus(s);
                    setPage(0);
                  }}
                >
                  {s || "All"}
                </GlassFilterPill>
              ))}
            </FilterRow>

            {loading && tasks.length === 0 && <p style={{ opacity: 0.72, fontSize: "0.875rem" }}>Loading history…</p>}

            <HistoryList>
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => {
                  const query =
                    labels[task.id] ??
                    `Task #${task.id}`;
                  const truncated = query.length > 120 ? `${query.slice(0, 117)}…` : query;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={spring}
                    >
                      <HistoryItem type="button" active={selectedId === task.id} onClick={() => setSelectedId(task.id)}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <HistoryQuery>{truncated}</HistoryQuery>
                          <HistoryMeta>
                            #{task.id} · {shortAddr(task.submitter)}
                            {task.complexity >= 5 ? " · Swarm" : " · Single"}
                            {task.coalitionAddr ? " · Coalition" : ""}
                          </HistoryMeta>
                        </div>
                        <HistoryAside>
                          <Badge status={statusColor[task.status]}>{task.status}</Badge>
                          <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{formatEth(task.reward)}</span>
                        </HistoryAside>
                      </HistoryItem>
                      {task.coalitionAddr && selectedId === task.id && (
                        <Link
                          to={`/coalitions/${task.coalitionAddr}`}
                          style={{
                            fontSize: "0.75rem",
                            opacity: 0.82,
                            textDecoration: "underline",
                            margin: "0.25rem 0 0.5rem 0.75rem",
                            display: "inline-block",
                          }}
                        >
                          View coalition
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </HistoryList>

            {!loading && tasks.length === 0 && (
              <EmptyHistory>
                <p style={{ margin: 0 }}>No tasks yet — ask the swarm using the composer above.</p>
              </EmptyHistory>
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
          </ChatPage>
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
