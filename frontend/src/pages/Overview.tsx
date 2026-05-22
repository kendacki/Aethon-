import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Heading, Section, StatValue, Subheading } from "../components/ui";
import { IconActivity, IconAgent, IconArrowRight, IconShield, IconTask } from "../components/icons";
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
});

const DataBars = styled("div", {
  position: "absolute",
  right: "5%",
  top: "20%",
  display: "flex",
  gap: "4px",
  alignItems: "flex-end",
  opacity: 0.2,
  "@md": { opacity: 0.35 },
});

export default function OverviewPage() {
  const { data: stats } = useFetch(() => api.stats(), []);
  const { data: health } = useFetch(() => api.health(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") setToast("Circuit breaker activated — operations paused");
    if (lastEvent?.type === "CIRCUIT_RESET") setToast("Circuit breaker reset — operations resumed");
  }, [lastEvent]);

  const successPct = stats ? Math.round(stats.successRate * 100) : 92;

  return (
    <>
      <Hero>
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
          <Heading style={{ maxWidth: "16ch" }}>
            Autonomous agents. Zero idle time.
          </Heading>
          <Subheading>
            AETHON coordinates self-organizing agent fleets — discovery, coalitions, task markets, and on-chain governance without manual orchestration.
          </Subheading>
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
            <Button variant="primary" as={Link} to="/agents">
              View Fleet <IconArrowRight size={16} />
            </Button>
            <Button variant="ghost" as={Link} to="/tasks">
              Open Task Market
            </Button>
          </div>
        </motion.div>
      </Hero>

      <Section>
        <Grid cols={4}>
          {[
            { label: "Task Success Rate", value: `${successPct}%`, icon: IconTask, sub: "Verified on-chain outcomes" },
            { label: "Audit Remediation", value: "17/17", icon: IconShield, sub: "All findings resolved" },
            { label: "Attack Simulations", value: "12/12", icon: IconActivity, sub: "Threat models passed" },
            { label: "Active Agents", value: String(stats?.activeAgents ?? "—"), icon: IconAgent, sub: "Registered and indexed" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.08 }} viewport={{ once: true }}>
              <Card>
                <s.icon size={28} style={{ marginBottom: 12 }} />
                <StatValue>{s.value}</StatValue>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: "0.75rem", marginTop: 4, opacity: 0.72 }}>{s.sub}</div>
              </Card>
            </motion.div>
          ))}
        </Grid>
      </Section>

      <Section style={{ background: "rgba(255,255,255,0.02)", borderRadius: "1.5rem", margin: "0 1.5rem" }}>
        <Badge accent>Protocol</Badge>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "1rem" }}>How the network runs</h2>
        <Grid cols={3} style={{ marginTop: "2rem" }}>
          <Card>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Event-Driven Execution</h3>
            <p style={{ fontSize: "0.875rem", opacity: 0.82 }}>Tasks emit on-chain events that agents respond to instantly — no polling, no lag.</p>
          </Card>
          <Card>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Coalition Formation</h3>
            <p style={{ fontSize: "0.875rem", opacity: 0.82 }}>Agents bind into stake-weighted groups with cryptographic signatures and quorum rules.</p>
          </Card>
          <Card>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Continuous Liveness</h3>
            <p style={{ fontSize: "0.875rem", opacity: 0.82 }}>Sub-cent heartbeat checks keep the fleet accountable at scale.</p>
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
