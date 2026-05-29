import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Button, Card, Grid, Section, StatValue } from "../components/ui";
import { ErrorBanner } from "../components/ErrorBanner";
import { FleetHealthPanel } from "../components/FleetHealthPanel";
import { SomniaPanel } from "../components/SomniaPanel";
import { GlassCard, GlassContent, GlassPanel } from "../components/GlassPanel";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG } from "../components/icons";
import { Notification } from "../components/Layout";
import { PageHero } from "../components/PageHero";
import {
  healthBadge,
  healthSequence,
  heroButton,
  heroItem,
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
import { env } from "../config/env";

const Home = styled("main", {
  paddingTop: "5rem",
  width: "100%",
});

const HeroContent = styled("div", {
  width: "100%",
  maxWidth: "520px",
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
  lineHeight: 1.65,
  marginTop: "$3",
  maxWidth: "28rem",
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
  gap: "$3",
  flexWrap: "wrap",
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
    title: "Fast task execution",
    body: "Agents react to on chain events in real time. No polling needed on Somnia.",
  },
  {
    title: "Coalition formation",
    body: "Agents team up with stake and signatures when a job needs more than one role.",
  },
  {
    title: "Verified oracles",
    body: "ORACLE and GOVERNANCE use Somnia platform agents for prices and summaries.",
  },
] as const;

export default function OverviewPage() {
  const { data: stats, loading: statsLoading, error: statsError, reload: reloadStats } = useFetch(() => api.stats(), []);
  const { data: health, error: healthError, reload: reloadHealth } = useFetch(() => api.health(), []);
  const { data: fleet, loading: fleetLoading } = useFetch(() => api.fleetHealth(), []);
  const { data: somnia, loading: somniaLoading } = useFetch(() => api.somniaReport(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") setToast("Circuit breaker on. Work paused.");
    if (lastEvent?.type === "CIRCUIT_RESET") setToast("Circuit reset. Work resumed.");
  }, [lastEvent]);

  const statCards = stats
    ? [
        {
          label: "Registered agents",
          value: stats.agentCount.toLocaleString(),
          icon: IconAgent,
          sub: `${stats.activeAgents} active on Somnia testnet`,
        },
        {
          label: "Tasks in market",
          value: stats.taskCount.toLocaleString(),
          icon: IconTask,
          sub: `${stats.completedTasks} done, ${Math.round(stats.successRate * 100)}% success rate`,
        },
        {
          label: "Agent roles",
          value: "5",
          icon: IconCoalition,
          sub: "Arbitrage, oracle, yield, governance, risk",
        },
        {
          label: "Fleet stake",
          value: formatEth(stats.tvl),
          icon: IconShield,
          sub: stats.circuitBreakerPaused ? "Circuit breaker halted" : "Backing reputation & coalitions",
        },
      ]
    : [];

  const healthBadges = health
    ? [
        { key: "sync", status: health.synced ? ("online" as const) : ("offline" as const), label: health.synced ? "Indexer synced" : "Syncing" },
        { key: "block", label: `Block ${health.blockNumber.toLocaleString()}` },
        {
          key: "circuit",
          status: health.circuitBreakerPaused ? ("offline" as const) : ("online" as const),
          label: `Circuit ${health.circuitBreakerPaused ? "HALTED" : "OK"}`,
        },
        { key: "chain", label: `Chain ${health.chainId ?? env.somniaChainId}` },
      ]
    : [];

  return (
    <Home>
      <PageHero tall>
        <HeroContent as={motion.div} variants={heroSequence} initial="hidden" animate="show">
          <motion.div variants={heroItem}>
            <Badge accent style={{ marginBottom: "0.75rem" }}>Somnia testnet</Badge>
          </motion.div>
          <motion.div variants={heroItem}>
            <HeroHeading>Autonomous agents on Somnia</HeroHeading>
          </motion.div>
          <motion.div variants={heroItem}>
            <HeroSub>
              Five agents register on chain, team up for complex jobs, and run tasks with live health and vault
              tracking.
            </HeroSub>
          </motion.div>
          <ActionRow variants={heroButton}>
            <Button variant="primary" size="sm" as={Link} to="/agents">
              View fleet <IconArrowRight size={16} />
            </Button>
            <Button variant="outline" size="sm" as={Link} to="/tasks">
              Submit task
            </Button>
          </ActionRow>
        </HeroContent>
      </PageHero>

      <StatsSection>
        <ErrorBanner
          message={statsError ?? healthError}
          onRetry={() => {
            reloadStats();
            reloadHealth();
          }}
        />

        {statsLoading && !stats && <p style={{ opacity: 0.72 }}>Loading stats</p>}

        {statCards.length > 0 && (
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
        )}
      </StatsSection>

      <Section style={{ paddingTop: 0 }}>
        <FleetHealthPanel fleet={fleet} loading={fleetLoading} compact />
      </Section>

      <Section style={{ paddingTop: 0 }}>
        <SomniaPanel report={somnia} loading={somniaLoading} compact />
      </Section>

      <ProtocolBand>
        <ProtocolGlassMotion variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <GlassContent as={motion.div} variants={protocolContent} initial="hidden" whileInView="show" viewport={viewportOnce}>
            <motion.div variants={protocolItem}>
              <Badge accent>Protocol</Badge>
            </motion.div>
            <motion.div variants={protocolItem}>
              <SectionTitle>How it works</SectionTitle>
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
