import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Section, StatValue } from "../components/ui";
import { GlassCard, GlassContent, GlassPanel } from "../components/GlassPanel";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG } from "../components/icons";
import { Notification } from "../components/Layout";
import {
  healthBadge,
  healthSequence,
  heroBgTransition,
  heroButton,
  heroItem,
  heroScrimTransition,
  heroSequence,
  protocolCard,
  protocolCards,
  protocolContent,
  protocolItem,
  protocolPanel,
  statCard,
  statsSequence,
  statValue,
  viewportOnce,
} from "../motion/overview";
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

const ActionRow = styled(motion.div, {
  display: "flex",
  marginTop: "$5",
  alignItems: "center",
});

const ProtocolBand = styled("section", {
  width: "100%",
  padding: "$8 $6 $10",
  position: "relative",
  zIndex: 10,
});

const ProtocolGlass = styled(GlassPanel, {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$12 $8",
  width: "100%",
  boxSizing: "border-box",
  defaultVariants: { radius: "full" },
});

const ProtocolGlassMotion = motion(ProtocolGlass);

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

const ProtocolCardMotion = motion(GlassCard);

const StatusRow = styled(motion.div, {
  marginTop: "$8",
  display: "flex",
  gap: "$4",
  flexWrap: "wrap",
  alignItems: "center",
});

const BadgeMotion = motion(Badge);

const PROTOCOL_FEATURES = [
  {
    title: "Event Driven Execution",
    body: "Tasks emit on chain events that agents respond to instantly. No polling. No lag.",
  },
  {
    title: "Coalition Formation",
    body: "Agents bind into stake weighted groups with cryptographic signatures and quorum rules.",
  },
  {
    title: "Continuous Liveness",
    body: "Low cost heartbeat checks keep the fleet accountable at scale.",
  },
] as const;

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

  const healthBadges = health
    ? [
        { key: "sync", status: health.synced ? ("online" as const) : ("offline" as const), label: health.synced ? "Indexer Synced" : "Syncing" },
        { key: "block", label: `Block ${health.blockNumber.toLocaleString()}` },
        {
          key: "circuit",
          status: health.circuitBreakerPaused ? ("offline" as const) : ("online" as const),
          label: `Circuit ${health.circuitBreakerPaused ? "HALTED" : "OK"}`,
        },
      ]
    : [];

  return (
    <Home>
      <HeroSection>
        <HeroBg
          as={motion.div}
          aria-hidden
          initial={{ scale: 1.07, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={heroBgTransition}
        />
        <HeroScrim
          as={motion.div}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={heroScrimTransition}
        />
        <HeroInner>
          <HeroContent as={motion.div} variants={heroSequence} initial="hidden" animate="show">
            <motion.div variants={heroItem}>
              <HeroHeading>Swarm Autonomous agents.</HeroHeading>
            </motion.div>
            <motion.div variants={heroItem}>
              <HeroSub>Self organizing fleets on chain.</HeroSub>
            </motion.div>
            <ActionRow variants={heroButton}>
              <Button variant="primary" size="sm" as={Link} to="/agents">
                View Fleet <IconArrowRight size={16} />
              </Button>
            </ActionRow>
          </HeroContent>
        </HeroInner>
      </HeroSection>

      <StatsSection>
        <Grid cols={4} as={motion.div} variants={statsSequence} initial="hidden" whileInView="show" viewport={viewportOnce}>
          {statCards.map((s) => (
            <StatCell key={s.label} variants={statCard}>
              <StatCard>
                <s.icon size={ICON_LG} style={{ marginBottom: 12, flexShrink: 0 }} />
                <StatValue as={motion.div} key={s.value} variants={statValue} initial="hidden" animate="show">
                  {s.value}
                </StatValue>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.72, marginTop: "auto", paddingTop: 8 }}>{s.sub}</div>
              </StatCard>
            </StatCell>
          ))}
        </Grid>
      </StatsSection>

      <ProtocolBand>
        <ProtocolGlassMotion variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <GlassContent as={motion.div} variants={protocolContent} initial="hidden" whileInView="show" viewport={viewportOnce}>
            <motion.div variants={protocolItem}>
              <Badge accent>Protocol</Badge>
            </motion.div>
            <motion.div variants={protocolItem}>
              <SectionTitle>How the network runs</SectionTitle>
            </motion.div>
            <Grid cols={3} style={{ marginTop: "2rem" }} as={motion.div} variants={protocolCards}>
              {PROTOCOL_FEATURES.map((feature) => (
                <ProtocolCardMotion key={feature.title} variants={protocolCard}>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardBody>{feature.body}</CardBody>
                </ProtocolCardMotion>
              ))}
            </Grid>
            {health && (
              <StatusRow variants={healthSequence} initial="hidden" animate="show">
                {healthBadges.map((badge) => (
                  <BadgeMotion key={badge.key} variants={healthBadge} status={badge.status}>
                    {badge.label}
                  </BadgeMotion>
                ))}
              </StatusRow>
            )}
          </GlassContent>
        </ProtocolGlassMotion>
      </ProtocolBand>

      <Notification message={toast} onClose={() => setToast("")} />
    </Home>
  );
}
