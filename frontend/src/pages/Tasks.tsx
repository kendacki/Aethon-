import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { api, formatEth, shortAddr, type Task } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, PageWrap, Section, Heading } from "../components/ui";
import { IconTask, ICON_MD } from "../components/icons";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { getAuthToken } from "../auth/token";
import { useWallet } from "../wallet/WalletContext";
import {
  ALL_AGENT_TYPES,
  defaultPayloadForRole,
  hashTaskPayload,
  parseEthToWei,
  signTaskSubmission,
  swarmPayload,
  type AgentType,
} from "../task/payload";

const STATUSES = ["", "PENDING", "ASSIGNED", "COMPLETED", "FAILED", "EXPIRED"];

const filterBtn = (active: boolean) => ({
  padding: "0.5rem 1rem",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
  color: "#FFFFFF",
  border: `1px solid ${active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}`,
});

export default function TasksPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<AgentType>("ORACLE");
  const [complexity, setComplexity] = useState(1);
  const [rewardEth, setRewardEth] = useState("0.01");
  const [swarmMode, setSwarmMode] = useState(false);
  const { data, loading, reload } = useFetch(() => api.tasks(page, status || undefined), [page, status]);
  const { lastEvent, connected } = useWebSocket(["tasks"]);
  const { isConnected, address, signer, isCorrectChain, connect } = useWallet();

  useEffect(() => {
    if (data) setTasks(data.data);
  }, [data]);

  useEffect(() => {
    if (!lastEvent) return;
    if (["TASK_SUBMITTED", "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_FAILED", "TASK_EXPIRED", "TASK_RELAYED"].includes(lastEvent.type)) {
      setToast(`Live update: ${lastEvent.type.replace("TASK_", "").toLowerCase()}`);
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

  const handleSubmit = async () => {
    setToast("");
    if (!isConnected || !address || !signer) {
      setToast("Connect your wallet and sign in first.");
      return;
    }
    if (!isCorrectChain) {
      setToast("Switch to Somnia Shannon Testnet in your wallet.");
      await connect();
      return;
    }
    if (!getAuthToken()) {
      setToast("Sign in with your wallet to submit tasks.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = swarmMode ? swarmPayload(complexity) : defaultPayloadForRole(role);
      const taskHash = hashTaskPayload(payload);
      const rewardWei = parseEthToWei(rewardEth);
      const signature = await signTaskSubmission(signer, address, taskHash, complexity, rewardWei);

      await api.submitTask({
        payload,
        taskHash,
        complexity,
        rewardWei,
        submitter: address,
        signature,
      });

      setToast(`Task submitted — ${payload.label ?? payload.action}`);
      reload();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Task submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrap>
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <Badge accent>Task Market</Badge>
            <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Open work queue</Heading>
            <p style={{ marginTop: "0.5rem", opacity: 0.82 }}>
              Live task feed. {connected ? "Connected" : "Reconnecting"}
            </p>
          </div>
        </div>

        <Card style={{ marginTop: "2rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Submit task to swarm</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
              Mode
              <select
                value={swarmMode ? "swarm" : "single"}
                onChange={(e) => {
                  const swarm = e.target.value === "swarm";
                  setSwarmMode(swarm);
                  if (swarm) setComplexity(5);
                }}
                style={{ padding: "0.5rem", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <option value="single">Single role</option>
                <option value="swarm">Full swarm (5 agents)</option>
              </select>
            </label>
            {!swarmMode && (
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
                Agent role
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AgentType)}
                  style={{ padding: "0.5rem", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {ALL_AGENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
              Complexity (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={complexity}
                disabled={swarmMode}
                onChange={(e) => setComplexity(Number(e.target.value))}
                style={{ padding: "0.5rem", borderRadius: 8, width: 80, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
              Reward (STT)
              <input
                type="text"
                value={rewardEth}
                onChange={(e) => setRewardEth(e.target.value)}
                style={{ padding: "0.5rem", borderRadius: 8, width: 100, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </label>
            <Button variant="outline" size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit task"}
            </Button>
          </div>
          <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", opacity: 0.65 }}>
            Tasks route to specialized agents by role — not generic LLM calls. Swarm mode requires all 5 agents online.
          </p>
        </Card>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem", flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <button key={s || "all"} onClick={() => { setStatus(s); setPage(0); }} style={filterBtn(status === s)}>
              {s || "All"}
            </button>
          ))}
        </div>

        {loading && tasks.length === 0 && <p style={{ marginTop: "2rem", opacity: 0.72 }}>Loading tasks</p>}

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
                      <IconTask size={ICON_MD} />
                      <div>
                        <div style={{ fontWeight: 700 }}>Task #{task.id}</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>
                          {shortAddr(task.submitter)} · Complexity {task.complexity}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <Badge status={statusColor[task.status]}>{task.status}</Badge>
                      <span style={{ fontWeight: 600 }}>{formatEth(task.reward)}</span>
                      {task.coalitionAddr && (
                        <Link to={`/coalitions/${task.coalitionAddr}`} style={{ fontSize: "0.75rem", opacity: 0.82, textDecoration: "underline" }}>
                          View coalition
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
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ opacity: 0.72 }}>Page {page + 1}</span>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </Section>
      <Notification message={toast} onClose={() => setToast("")} />
    </PageWrap>
  );
}

const statusColor: Record<string, "online" | "offline" | undefined> = {
  COMPLETED: "online",
  FAILED: "offline",
  EXPIRED: "offline",
};
