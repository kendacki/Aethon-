import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Shield, Zap, Bot, ArrowRight } from "lucide-react";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Heading, Section, StatValue, Subheading } from "../components/ui";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { useState, useEffect } from "react";
import { styled } from "../stitches.config";

const Hero = styled("div", {
  minHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "$20 $6 $16",
  maxWidth: "1200px",
  margin: "0 auto",
  position: "relative",
  overflow: "hidden",
});

const GlowOrb = styled(motion.div, {
  position: "absolute",
  width: "600px",
  height: "600px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
  filter: "blur(40px)",
  pointerEvents: "none",
});

const DataBars = styled("div", {
  position: "absolute",
  right: "5%",
  top: "20%",
  display: "flex",
  gap: "4px",
  alignItems: "flex-end",
  opacity: 0.3,
  "@md": { opacity: 0.6 },
});

export default function OverviewPage() {
  const { data: stats } = useFetch(() => api.stats(), []);
  const { data: health } = useFetch(() => api.health(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") setToast("⚠ Circuit breaker activated — system halted");
    if (lastEvent?.type === "CIRCUIT_RESET") setToast("✓ Circuit breaker reset — operations resumed");
  }, [lastEvent]);

  const successPct = stats ? Math.round(stats.successRate * 100) : 92;

  return (
    <>
      <Hero>
        <GlowOrb animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 4, repeat: Infinity }} style={{ right: "-10%", top: "10%" }} />
        <DataBars>
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              style={{ width: 3, background: "#fff", borderRadius: 2 }}
              animate={{ height: [20, 40 + Math.random() * 80, 20] }}
              transition={{ duration: 1.5 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </DataBars>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <Badge accent>Agentic L1 · Somnia Native</Badge>
          <Heading style={{ marginTop: "1.5rem", maxWidth: "14ch" }}>
            Autonomous motion at machine speed
          </Heading>
          <Subheading>
            AETHON deploys a living ecosystem of AI agents that discover peers, form coalitions, bid on tasks, and govern — entirely without human intervention.
          </Subheading>
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
            <Button variant="primary" as={Link} to="/agents">
              Explore Fleet <ArrowRight size={16} />
            </Button>
            <Button variant="ghost" as={Link} to="/tasks">
              View Task Market
            </Button>
          </div>
        </motion.div>
      </Hero>

      <Section>
        <Grid cols={4}>
          {[
            { label: "Task Success", value: `${successPct}%`, icon: Zap, sub: "Production validated" },
            { label: "Vulnerabilities Fixed", value: "17/17", icon: Shield, sub: "Audit hardened" },
            { label: "Attacks Blocked", value: "12/12", icon: Activity, sub: "100% coverage" },
            { label: "Active Agents", value: String(stats?.activeAgents ?? "—"), icon: Bot, sub: "On-chain fleet" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.08 }} viewport={{ once: true }}>
              <Card glow={i === 0}>
                <s.icon size={20} color="#7C3AED" style={{ marginBottom: 12 }} />
                <StatValue>{s.value}</StatValue>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.sub}</div>
              </Card>
            </motion.div>
          ))}
        </Grid>
      </Section>

      <Section style={{ background: "rgba(255,255,255,0.02)", borderRadius: "1.5rem", margin: "0 1.5rem" }}>
        <Badge accent="orange">Live Network</Badge>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "1rem" }}>Built for Somnia Agentic L1</h2>
        <Grid cols={3} style={{ marginTop: "2rem" }}>
          <Card>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>On-Chain Reactivity</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>TaskSubmitted events trigger autonomous bids without off-chain polling.</p>
          </Card>
          <Card glow="orange">
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Agent Coalitions</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>Multi-agent groups with cryptographic signature binding and stake-weighted quorum.</p>
          </Card>
          <Card>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Sub-Cent Heartbeats</h3>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>IceDB enables economically viable 60s liveness checks at scale.</p>
          </Card>
        </Grid>
        {health && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Badge status={health.synced ? "online" : "offline"}>{health.synced ? "Indexer Synced" : "Syncing…"}</Badge>
            <Badge>Block {health.blockNumber.toLocaleString()}</Badge>
            <Badge status={health.circuitBreakerPaused ? "offline" : "online"}>
              Circuit {health.circuitBreakerPaused ? "HALTED" : "OK"}
            </Badge>
          </motion.div>
        )}
      </Section>

      <Notification message={toast} onClose={() => setToast("")} />
    </>
  );
}
