import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Heading, Section, StatValue, Subheading } from "../components/ui";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask } from "../components/icons";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { useState, useEffect } from "react";
import { styled } from "../stitches.config";

const Home = styled("main", {
  paddingTop: "5rem",
  width: "100%",
});

const Hero = styled("section", {
  minHeight: "calc(100vh - 5rem)",
  display: "flex",
  alignItems: "center",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$16 $6",
  width: "100%",
  boxSizing: "border-box",
  position: "relative",
});

const HeroContent = styled("div", {
  width: "100%",
  maxWidth: "640px",
});

const DataBars = styled("div", {
  position: "absolute",
  right: "$6",
  top: "50%",
  transform: "translateY(-50%)",
  display: "none",
  gap: "4px",
  alignItems: "flex-end",
  opacity: 0.25,
  "@lg": { display: "flex" },
});

const StatsSection = styled(Section, {
  paddingTop: "$8",
  paddingBottom: "$8",
});

const StatCell = styled(motion.div, {
  height: "100%",
});

const StatCard = styled(Card, {
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const ProtocolBand = styled("section", {
  width: "100%",
  background: "rgba(255,255,255,0.02)",
  borderTop: "1px solid $border",
  borderBottom: "1px solid $border",
});

const ProtocolInner = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$16 $6",
  width: "100%",
  boxSizing: "border-box",
});

const SectionTitle = styled("h2", {
  fontSize: "$2xl",
  fontWeight: "$extrabold",
  marginTop: "$4",
  letterSpacing: "-0.02em",
});

const CardTitle = styled("h3", {
  fontWeight: "$bold",
  marginBottom: "$2",
});

const CardBody = styled("p", {
  fontSize: "$sm",
  opacity: 0.82,
  lineHeight: 1.65,
});

const ActionRow = styled("div", {
  display: "flex",
  gap: "$4",
  marginTop: "$8",
  flexWrap: "wrap",
  alignItems: "center",
});

const StatusRow = styled(motion.div, {
  marginTop: "$8",
  display: "flex",
  gap: "$4",
  flexWrap: "wrap",
  alignItems: "center",
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

  const statCards = [
    {
      label: "Registered Agents",
      value: stats != null ? String(stats.agentCount) : "—",
      icon: IconAgent,
      sub: "Specialists that self-register and compete for work",
    },
    {
      label: "Tasks in Market",
      value: stats != null ? String(stats.taskCount) : "—",
      icon: IconTask,
      sub: "Open jobs agents bid on and execute on-chain",
    },
    {
      label: "Agent Roles",
      value: "5",
      icon: IconCoalition,
      sub: "Arbitrage, oracle, yield, governance, and risk",
    },
    {
      label: "Fleet Stake",
      value: stats != null ? formatEth(stats.tvl) : "—",
      icon: IconShield,
      sub: "Total stake backing reputation and coalition bonds",
    },
  ];

  return (
    <Home>
      <Hero>
        <DataBars aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              style={{ width: 3, background: "#fff", borderRadius: 2 }}
              animate={{ height: [20, 40 + Math.random() * 80, 20] }}
              transition={{ duration: 1.5 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </DataBars>

        <HeroContent as={motion.div} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <Heading>Autonomous agents. Zero idle time.</Heading>
          <Subheading>
            AETHON coordinates self-organizing agent fleets — discovery, coalitions, task markets, and on-chain governance without manual orchestration.
          </Subheading>
          <ActionRow>
            <Button variant="primary" as={Link} to="/agents">
              View Fleet <IconArrowRight size={16} />
            </Button>
            <Button variant="ghost" as={Link} to="/tasks">
              Open Task Market
            </Button>
          </ActionRow>
        </HeroContent>
      </Hero>

      <StatsSection>
        <Grid cols={4}>
          {statCards.map((s, i) => (
            <StatCell key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.08 }} viewport={{ once: true }}>
              <StatCard>
                <s.icon size={28} style={{ marginBottom: 12, flexShrink: 0 }} />
                <StatValue>{s.value}</StatValue>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.72, marginTop: "auto", paddingTop: 8 }}>{s.sub}</div>
              </StatCard>
            </StatCell>
          ))}
        </Grid>
      </StatsSection>

      <ProtocolBand>
        <ProtocolInner>
          <Badge accent>Protocol</Badge>
          <SectionTitle>How the network runs</SectionTitle>
          <Grid cols={3} style={{ marginTop: "2rem" }}>
            <Card>
              <CardTitle>Event-Driven Execution</CardTitle>
              <CardBody>Tasks emit on-chain events that agents respond to instantly — no polling, no lag.</CardBody>
            </Card>
            <Card>
              <CardTitle>Coalition Formation</CardTitle>
              <CardBody>Agents bind into stake-weighted groups with cryptographic signatures and quorum rules.</CardBody>
            </Card>
            <Card>
              <CardTitle>Continuous Liveness</CardTitle>
              <CardBody>Sub-cent heartbeat checks keep the fleet accountable at scale.</CardBody>
            </Card>
          </Grid>
          {health && (
            <StatusRow initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Badge status={health.synced ? "online" : "offline"}>{health.synced ? "Indexer Synced" : "Syncing…"}</Badge>
              <Badge>Block {health.blockNumber.toLocaleString()}</Badge>
              <Badge status={health.circuitBreakerPaused ? "offline" : "online"}>
                Circuit {health.circuitBreakerPaused ? "HALTED" : "OK"}
              </Badge>
            </StatusRow>
          )}
        </ProtocolInner>
      </ProtocolBand>

      <Notification message={toast} onClose={() => setToast("")} />
    </Home>
  );
}
