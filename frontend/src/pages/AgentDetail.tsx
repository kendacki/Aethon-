import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch } from "../api/hooks";
import { Badge, Card, Grid, PageWrap, Section, StatValue } from "../components/ui";
import { IconArrowLeft, IconTrend } from "../components/icons";
import { spring } from "../stitches.config";

export default function AgentDetailPage() {
  const { addr } = useParams<{ addr: string }>();
  const { data: agent, loading } = useFetch(() => api.agent(addr!), [addr]);
  const { data: rep } = useFetch(() => api.reputation(addr!), [addr]);

  if (loading) return <PageWrap><Section>Loading agent…</Section></PageWrap>;
  if (!agent) return <PageWrap><Section>Agent not found</Section></PageWrap>;

  return (
    <PageWrap>
      <Section>
        <Link to="/agents" style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.72, fontSize: "0.875rem", marginBottom: "2rem" }}>
          <IconArrowLeft size={16} /> Back to fleet
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <Badge accent>{agent.agentType}</Badge>
            <Badge status={agent.online ? "online" : "offline"}>{agent.online ? "Online" : "Offline"}</Badge>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "1rem", fontFamily: "monospace" }}>{agent.address}</h1>

          <Grid cols={3} style={{ marginTop: "2rem" }}>
            <Card>
              <StatValue>{rep?.score ?? agent.reputation}</StatValue>
              <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 8 }}>Reputation Score</div>
            </Card>
            <Card>
              <StatValue style={{ fontSize: "1.75rem" }}>{formatEth(agent.stake)}</StatValue>
              <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 8 }}>Staked</div>
            </Card>
            <Card>
              <div style={{ fontSize: "0.875rem", opacity: 0.72 }}>Last Heartbeat</div>
              <div style={{ fontWeight: 600, marginTop: 8 }}>{new Date(agent.lastHeartbeat).toLocaleString()}</div>
            </Card>
          </Grid>

          {rep && rep.history.length > 0 && (
            <Card style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                <IconTrend size={20} />
                <h2 style={{ fontWeight: 700 }}>Reputation History</h2>
              </div>
              {rep.history.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.03 }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "0.875rem" }}
                >
                  <span>{h.reason}</span>
                  <span>{h.oldScore} → <strong>{h.newScore}</strong></span>
                  <span style={{ opacity: 0.6 }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                </motion.div>
              ))}
            </Card>
          )}
        </motion.div>
      </Section>
    </PageWrap>
  );
}
