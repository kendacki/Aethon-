import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, formatEth, shortAddr, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import {
  PageContent,
  SectionHeading,
  SectionHeadingMeta,
  SectionHeadingTitle,
  SubpageHero,
} from "../components/layout/SubpageLayout";
import { Badge, PageWrap } from "../components/ui";
import { ErrorBanner } from "../components/ErrorBanner";
import { TaskSubmitPanel } from "../components/session/TaskSubmitPanel";
import { TaskDetailPanel } from "../components/tasks/TaskDetailPanel";
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";
import { GlassFilterPill } from "../components/GlassPanel";
import { GLASS } from "../theme/glass";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const SectionDivider = styled("div", {
  margin: "$12 0 $8",
  borderTop: `1px solid ${GLASS.divider}`,
});

const UserBubble = styled("div", {
  marginTop: "$6",
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
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  columnGap: "$5",
  rowGap: "$2",
  padding: "$4",
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

const HistoryMain = styled("div", {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "$1",
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
  lineHeight: 1.45,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: "0.35rem",
  rowGap: "0.15rem",
});

const HistoryMetaSep = styled("span", {
  opacity: 0.45,
  userSelect: "none",
});

const HistoryAside = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "$2",
  width: "6.25rem",
  flexShrink: 0,
});

const HistoryStatusSlot = styled("div", {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
});

const HistoryAmount = styled("span", {
  display: "block",
  width: "100%",
  textAlign: "center",
  fontWeight: 600,
  fontSize: "0.8125rem",
  lineHeight: 1.2,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  opacity: 0.9,
  letterSpacing: "0.01em",
});

const HistoryRowWrap = styled("div", {
  display: "flex",
  flexDirection: "column",
});

const HistoryTeamLink = styled(Link, {
  fontSize: "0.75rem",
  opacity: 0.75,
  textDecoration: "underline",
  margin: "0 0 $2",
  paddingLeft: "$4",
  alignSelf: "flex-start",
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

const BubbleLabel = styled("div", {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  opacity: 0.5,
  marginBottom: 6,
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
            <TaskSubmitPanel variant="chat" onSubmitted={reload} />

            {selectedId != null && selectedLabel && (
              <UserBubble aria-label="Selected question">
                <BubbleLabel>Your question</BubbleLabel>
                {selectedLabel}
              </UserBubble>
            )}

            {selectedId != null && (
              <div style={{ marginBottom: "$4" }}>
                <TaskDetailPanel taskId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            )}

            <SectionDivider id="task-list" ref={historyRef} />

            <SectionHeading>
              <SectionHeadingTitle>History</SectionHeadingTitle>
              {data && (
                <SectionHeadingMeta>
                  {data.pagination.total} task{data.pagination.total === 1 ? "" : "s"}
                </SectionHeadingMeta>
              )}
            </SectionHeading>

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

            {loading && tasks.length === 0 && <p style={{ opacity: 0.65, fontSize: "0.875rem" }}>Loading...</p>}

            <HistoryList>
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => {
                  const query = labels[task.id] ?? `Task #${task.id}`;
                  const truncated = query.length > 120 ? `${query.slice(0, 117)}…` : query;

                  return (
                    <HistoryRowWrap key={task.id} as={motion.div} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={spring}>
                      <HistoryItem type="button" active={selectedId === task.id} onClick={() => setSelectedId(task.id)}>
                        <HistoryMain>
                          <HistoryQuery>{truncated}</HistoryQuery>
                          <HistoryMeta>
                            <span>#{task.id}</span>
                            <HistoryMetaSep aria-hidden>·</HistoryMetaSep>
                            <span>{shortAddr(task.submitter)}</span>
                            <HistoryMetaSep aria-hidden>·</HistoryMetaSep>
                            <span>{task.complexity >= 5 ? "Swarm" : "Single"}</span>
                            {task.coalitionAddr ? (
                              <>
                                <HistoryMetaSep aria-hidden>·</HistoryMetaSep>
                                <span>Team</span>
                              </>
                            ) : null}
                          </HistoryMeta>
                        </HistoryMain>
                        <HistoryAside>
                          <HistoryStatusSlot>
                            <Badge status={statusColor[task.status]}>{task.status}</Badge>
                          </HistoryStatusSlot>
                          <HistoryAmount>{formatEth(task.reward)}</HistoryAmount>
                        </HistoryAside>
                      </HistoryItem>
                      {task.coalitionAddr && selectedId === task.id && (
                        <HistoryTeamLink to={`/coalitions/${task.coalitionAddr}`}>View team</HistoryTeamLink>
                      )}
                    </HistoryRowWrap>
                  );
                })}
              </AnimatePresence>
            </HistoryList>

            {!loading && tasks.length === 0 && (
              <EmptyHistory>
                <p style={{ margin: 0 }}>No tasks yet.</p>
              </EmptyHistory>
            )}

            {data && data.pagination.total > 20 && (
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", alignItems: "center" }}>
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
                  Previous
                </button>
                <span style={{ opacity: 0.65, fontSize: "0.875rem" }}>Page {page + 1}</span>
                <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            )}
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
