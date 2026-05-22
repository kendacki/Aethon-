import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Section, StatValue } from "../components/ui";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG } from "../components/icons";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { useState, useEffect } from "react";
import { styled } from "../stitches.config";

const Home = styled("main", {
  paddingTop: "5rem",
  width: "100%",
});

const HeroSection = styled("section", {
  width: "100%",
  minHeight: "calc(62vh - 5rem)",
  position: "relative",
  overflow: "hidden",
  background: "#000000",
});

const HeroBg = styled("div", {
  position: "absolute",
  inset: 0,
  backgroundImage: "url(/hero-bg.png)",
  backgroundSize: "cover",
  backgroundPosition: "65% center",
  backgroundRepeat: "no-repeat",
  "@md": {
    backgroundSize: "cover",
    backgroundPosition: "center center",
  },
  "@lg": {
    backgroundSize: "110% auto",
    backgroundPosition: "right center",
  },
});

const HeroScrim = styled("div", {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(90deg, #000000 0%, rgba(0,0,0,0.88) 38%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.2) 100%)",
  "@md": {
    background: "linear-gradient(90deg, #000000 0%, rgba(0,0,0,0.82) 42%, rgba(0,0,0,0.35) 68%, transparent 100%)",
  },
});

const HeroInner = styled("div", {
  position: "relative",
  zIndex: 1,
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$10 $6",
  minHeight: "calc(62vh - 5rem)",
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
});

const HeroContent = styled("div", {
  width: "100%",
  maxWidth: "480px",
});

const HeroHeading = styled("h1", {
  fontFamily: "$sans",
  fontWeight: "$extrabold",
  fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lineHeight: 1.15,
  letterSpacing: "-0.03em",
  color: "$text",
});

const HeroSub = styled("p", {
  fontSize: "$md",
  color: "$text",
  opacity: 0.8,
  lineHeight: 1.6,
  marginTop: "$3",
  maxWidth: "22rem",
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

const ActionRow = styled("div", {
  display: "flex",
  marginTop: "$5",
  alignItems: "center",
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

const StatusRow = styled(motion.div, {
  marginTop: "$8",
  display: "flex",
  gap: "$4",
  flexWrap: "wrap",
  alignItems: "center",
});

const FALLBACK_STATS = {
  agentCount: 5,
  taskCount: 10,
  tvl: "50000000000000000000",
} as const;

export default function OverviewPage() {
  const { data: stats } = useFetch(() => api.stats(), []);
  const { data: health } = useFetch(() => api.health(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") setToast("Circuit breaker activated. Operations paused.");
    if (lastEvent?.type === "CIRCUIT_RESET") setToast("Circuit breaker reset. Operations resumed.");
  }, [lastEvent]);

  const agentCount = stats?.agentCount ?? FALLBACK_STATS.agentCount;
  const taskCount = stats?.taskCount ?? FALLBACK_STATS.taskCount;
  const fleetStake = stats?.tvl ?? FALLBACK_STATS.tvl;

  const statCards = [
    {
      label: "Registered Agents",
      value: agentCount.toLocaleString(),
      icon: IconAgent,
      sub: "Specialists that self register and compete for work",
    },
    {
      label: "Tasks in Market",
      value: taskCount.toLocaleString(),
      icon: IconTask,
      sub: "Open jobs agents bid on and execute on chain",
    },
    {
      label: "Agent Roles",
      value: "5",
      icon: IconCoalition,
      sub: "Arbitrage, oracle, yield, governance, and risk",
    },
    {
      label: "Fleet Stake",
      value: formatEth(fleetStake),
      icon: IconShield,
      sub: "Total stake backing reputation and coalition bonds",
    },
  ];

  return (
    <Home>
      <HeroSection>
        <HeroBg aria-hidden />
        <HeroScrim aria-hidden />
        <HeroInner>
          <HeroContent as={motion.div} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <HeroHeading>Swarm Autonomous agents.</HeroHeading>
            <HeroSub>Self organizing fleets on chain.</HeroSub>
            <ActionRow>
              <Button variant="primary" size="sm" as={Link} to="/agents">
                View Fleet <IconArrowRight size={16} />
              </Button>
            </ActionRow>
          </HeroContent>
        </HeroInner>
      </HeroSection>

      <StatsSection>
        <Grid cols={4}>
          {statCards.map((s, i) => (
            <StatCell key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.08 }} viewport={{ once: true }}>
              <StatCard>
                <s.icon size={ICON_LG} style={{ marginBottom: 12, flexShrink: 0 }} />
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
              <CardTitle>Event Driven Execution</CardTitle>
              <CardBody>Tasks emit on chain events that agents respond to instantly. No polling. No lag.</CardBody>
            </Card>
            <Card>
              <CardTitle>Coalition Formation</CardTitle>
              <CardBody>Agents bind into stake weighted groups with cryptographic signatures and quorum rules.</CardBody>
            </Card>
            <Card>
              <CardTitle>Continuous Liveness</CardTitle>
              <CardBody>Low cost heartbeat checks keep the fleet accountable at scale.</CardBody>
            </Card>
          </Grid>
          {health && (
            <StatusRow initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Badge status={health.synced ? "online" : "offline"}>{health.synced ? "Indexer Synced" : "Syncing"}</Badge>
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
