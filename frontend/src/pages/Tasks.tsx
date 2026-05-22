import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import { api, formatEth, shortAddr, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Card, PageWrap, Section, Heading } from "../components/ui";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const statusColor: Record<string, "online" | "offline" | undefined> = {
  COMPLETED: "online",
  FAILED: "offline",
  EXPIRED: "offline",
};

export default function TasksPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toast, setToast] = useState("");
  const { data, loading, reload } = useFetch(() => api.tasks(page, status || undefined), [page, status]);
  const { lastEvent, connected } = useWebSocket(["tasks"]);

  useEffect(() => {
    if (data) setTasks(data.data);
  }, [data]);

  useEffect(() => {
    if (!lastEvent) return;
    if (["TASK_SUBMITTED", "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_FAILED", "TASK_EXPIRED", "TASK_RELAYED"].includes(lastEvent.type)) {
      setToast(`Live: ${lastEvent.type.replace("TASK_", "")}`);
      reload();
    }
  }, [lastEvent, reload]);

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
    <PageWrap>
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Badge accent="orange">Task Market</Badge>
            <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Live task emission</Heading>
            <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>
              Real-time on-chain tasks via WebSocket · {connected ? "Connected" : "Reconnecting…"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem", flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <button
              key={s || "all"}
              onClick={() => { setStatus(s); setPage(0); }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: status === s ? "rgba(255,107,44,0.2)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading && tasks.length === 0 && <p style={{ marginTop: "2rem", color: "rgba(255,255,255,0.5)" }}>Loading tasks…</p>}

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -40, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 40, height: 0 }}
                transition={spring}
              >
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Zap size={20} color="#FF6B2C" />
                      <div>
                        <div style={{ fontWeight: 700 }}>Task #{task.id}</div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                          {shortAddr(task.submitter)} · Complexity {task.complexity}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Badge status={statusColor[task.status]}>{task.status}</Badge>
                      <span style={{ fontWeight: 600 }}>{formatEth(task.reward)}</span>
                      {task.coalitionAddr && (
                        <Link to={`/coalitions/${task.coalitionAddr}`} style={{ fontSize: "0.75rem", color: "#7C3AED" }}>
                          Coalition →
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {data && data.pagination.total > 20 && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Page {page + 1}</span>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </Section>
      <Notification message={toast} onClose={() => setToast("")} />
    </PageWrap>
  );
}
