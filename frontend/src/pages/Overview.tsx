import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { api, shortAddr, type WalletTaskStats } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { Badge, Button, Grid, Muted, Section } from "../components/ui";
import { GlassBandPanel, GlassElevatedCard, GlassContent } from "../components/GlassPanel";
import { HomePageHero } from "../components/HomePageHero";
import { OperatorActivitySection } from "../components/overview/OperatorActivitySection";
import { TaskSubmitPanel } from "../components/session/TaskSubmitPanel";
import { SectionHeader } from "../components/session/SessionUI";
import { useToast } from "../components/ToastProvider";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG } from "../components/icons";
import {
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
import { useEffect } from "react";
import { PageMotion, HeroActions, HeroItem } from "../components/motion/PageMotion";
import { styled } from "../stitches.config";

const Home = styled("main", {
  width: "100%",
  paddingTop: "5rem",
});

const HeroContent = styled("div", {
  width: "100%",
  maxWidth: "520px",
});

const HeroHeading = styled("h1", {
  fontFamily: "$primary",
  fontWeight: 700,
  fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lineHeight: 1.15,
  letterSpacing: "-0.03em",
  color: "$text",
});

const HeroSub = styled("p", {
  fontFamily: "$secondary",
  fontWeight: 400,
  fontSize: "$md",
  color: "$text",
  opacity: 0.8,
  lineHeight: 1.65,
  marginTop: "$3",
  maxWidth: "28rem",
});

const StatsSection = styled(Section, {
  paddingTop: "$8",
  paddingBottom: "$6",
});

const PageBand = styled("section", {
  width: "100%",
  padding: "$6 $6 $8",
  position: "relative",
  zIndex: 10,
});

const BandGlass = styled(GlassBandPanel, {
  padding: "$10 $6",
  "@md": {
    padding: "$12 $8",
  },
});

const BandGlassMotion = motion(BandGlass);

const StatCell = styled(motion.div, {
  height: "100%",
});

const StatGlassCard = styled(GlassElevatedCard, {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "$6 $5",
  "@md": {
    padding: "$8 $6",
  },
});

const StatFigure = styled("div", {
  fontFamily: "$primary",
  fontSize: "clamp(2rem, 4vw, 2.75rem)",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
  marginTop: "$4",
});

const StatTitle = styled("div", {
  fontWeight: "$bold",
  fontSize: "$sm",
  marginTop: "$3",
  letterSpacing: "-0.01em",
});

const StatDesc = styled("p", {
  fontSize: "$xs",
  opacity: 0.68,
  lineHeight: 1.6,
  marginTop: "$2",
  marginBottom: 0,
});

const SectionTitle = styled("h2", {
  fontFamily: "$primary",
  fontSize: "$2xl",
  fontWeight: 700,
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

const ProtocolCardMotion = motion(GlassElevatedCard);

const QuickLinkCard = styled(GlassElevatedCard, {
  padding: "$5 $5",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  cursor: "pointer",
  transition: "border-color 150ms ease, transform 150ms ease",
  "&:hover": {
    borderColor: "$borderStrong",
    transform: "translateY(-2px)",
  },
});

const WorkspaceGrid = styled("div", {
  display: "grid",
  gap: "$6",
  marginTop: "$8",
  gridTemplateColumns: "1fr",
  "@lg": {
    gridTemplateColumns: "1.15fr 0.85fr",
    alignItems: "start",
  },
});

const StepRow = styled("div", {
  display: "flex",
  gap: "$4",
  alignItems: "flex-start",
  padding: "$4 0",
  borderBottom: "1px solid $glassDivider",
  "&:last-child": { borderBottom: "none" },
});

const StepNum = styled("div", {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid rgba(13, 188, 130, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: 800,
  flexShrink: 0,
  color: "#0dbc82",
});

const GuideCard = styled(GlassElevatedCard, {
  padding: "$6",
  height: "100%",
});

const DEMO_OVERVIEW_STATS = {
  tasks: 10,
  stakeLabel: "50 STT",
} as const;

const OVERVIEW_STAT_DEFS = [
  {
    key: "agents",
    label: "Registered agents",
    description: "Specialists that register on chain and compete for work",
    icon: IconAgent,
    fixedValue: "5",
  },
  {
    key: "tasks",
    label: "Your tasks",
    description: "Jobs you submit to the on chain task market",
    icon: IconTask,
  },
  {
    key: "roles",
    label: "Agent roles",
    description: "Arbitrage, oracle, yield, governance, and risk",
    icon: IconCoalition,
    fixedValue: "5",
  },
  {
    key: "stake",
    label: "STT staked",
    description: "STT held in escrow from your wallet on submitted tasks",
    icon: IconShield,
  },
] as const;

const PROTOCOL_FEATURES = [
  {
    title: "Fast execution",
    body: "Agents respond to on chain events in real time without polling.",
  },
  {
    title: "Coalition formation",
    body: "Agents combine stake and signatures when a job needs more than one role.",
  },
  {
    title: "Verified oracles",
    body: "Oracle and governance roles use trusted platform agents for prices and summaries.",
  },
] as const;

const OPERATOR_QUICK_LINKS = [
  { to: "/tasks", label: "Task market", desc: "Submit and track jobs", icon: IconTask },
  { to: "/agents", label: "Agent fleet", desc: "Five on chain roles", icon: IconAgent },
  { to: "/governance", label: "Safety", desc: "Circuit breaker status", icon: IconShield },
  { to: "/leaderboard", label: "Leaderboard", desc: "Reputation rankings", icon: IconCoalition },
] as const;

const SWARM_STEPS = [
  {
    title: "Submit a task",
    body: "Pick a single agent role or full swarm mode, then sign the payload with your wallet.",
  },
  {
    title: "Form a coalition",
    body: "When complexity requires it, specialists stake and coordinate on chain.",
  },
  {
    title: "Settle on chain",
    body: "Workers run skills, report results, and rewards settle through the task market.",
  },
] as const;

function GuestOverview() {
  const statCards = OVERVIEW_STAT_DEFS.map((def) => ({
    ...def,
    value:
      def.key === "agents" || def.key === "roles"
        ? def.fixedValue!
        : def.key === "tasks"
          ? String(DEMO_OVERVIEW_STATS.tasks)
          : DEMO_OVERVIEW_STATS.stakeLabel,
    demo: true,
  }));

  return (
    <PageMotion motionKey="guest-overview">
      <HomePageHero>
        <HeroContent as={motion.div} variants={heroSequence} initial="hidden" animate="show">
          <HeroItem>
            <HeroHeading>Autonomous agents on Somnia</HeroHeading>
          </HeroItem>
          <HeroItem>
            <HeroSub>
              Five agents register on chain, team up for complex work, and run tasks with live health and vault
              tracking.
            </HeroSub>
          </HeroItem>
          <HeroActions style={{ display: "flex", marginTop: "1.25rem", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="primary" size="sm" as={Link} to="/agents">
              View fleet <IconArrowRight size={16} />
            </Button>
            <Button variant="outline" size="sm" as={Link} to="/tasks">
              Explore tasks
            </Button>
          </HeroActions>
        </HeroContent>
      </HomePageHero>

      <StatsSection>
        <SectionHeader
          title="Network snapshot"
          subtitle="Connect your wallet and sign in to unlock your dashboard."
          badge={<Badge accent>Preview</Badge>}
        />
        <Grid cols={4} as={motion.div} variants={statsSequence} initial="hidden" whileInView="show" viewport={viewportOnce}>
          {statCards.map((s) => (
            <StatCell key={s.key} variants={statCard}>
              <StatGlassCard>
                <s.icon size={ICON_LG} style={{ flexShrink: 0, opacity: 0.92 }} />
                <StatFigure as={motion.div} variants={statValue} initial="hidden" animate="show">
                  {s.value}
                </StatFigure>
                <StatTitle>{s.label}</StatTitle>
                <StatDesc>
                  {s.description}
                  {". Preview until you sign in."}
                </StatDesc>
              </StatGlassCard>
            </StatCell>
          ))}
        </Grid>
      </StatsSection>

      <PageBand>
        <BandGlassMotion variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <GlassContent as={motion.div} variants={protocolContent} initial="hidden" whileInView="show" viewport={viewportOnce}>
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
          </GlassContent>
        </BandGlassMotion>
      </PageBand>
    </PageMotion>
  );
}

type OperatorOverviewProps = {
  address: string;
  walletStats: WalletTaskStats | null;
  statsLoading: boolean;
  healthError: string | null;
  walletStatsError: string | null;
  onRetry: () => void;
  onRefreshStats: () => void;
};

function OperatorOverview({
  address,
  walletStats,
  statsLoading,
  healthError,
  walletStatsError,
  onRetry,
  onRefreshStats,
}: OperatorOverviewProps) {
  return (
    <PageMotion motionKey="operator-overview">
      <HomePageHero>
        <HeroContent as={motion.div} variants={heroSequence} initial="hidden" animate="show">
          <HeroItem>
            <HeroHeading>Welcome back, {shortAddr(address)}</HeroHeading>
          </HeroItem>
          <HeroActions style={{ display: "flex", marginTop: "1.25rem", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="primary" size="sm" as={Link} to="/tasks">
              Submit task <IconArrowRight size={16} />
            </Button>
            <Button variant="outline" size="sm" as={Link} to="/agents">
              View fleet
            </Button>
          </HeroActions>
        </HeroContent>
      </HomePageHero>

      <StatsSection css={{ paddingBottom: "$8" }}>
        <OperatorActivitySection
          address={address}
          walletStats={walletStats}
          statsLoading={statsLoading}
          error={healthError ?? walletStatsError}
          onRetry={onRetry}
          onRefresh={onRefreshStats}
        />
      </StatsSection>

      <PageBand style={{ paddingBottom: "2.5rem" }}>
        <BandGlassMotion variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <GlassContent as={motion.div} variants={protocolContent} initial="hidden" whileInView="show" viewport={viewportOnce}>
            <motion.div variants={protocolItem}>
              <SectionHeader
                title="Operator console"
                subtitle="Shortcuts to the pages you use most. Submit work from home without leaving this page."
              />
            </motion.div>

            <Grid cols={4} style={{ marginTop: "0.5rem" }} as={motion.div} variants={protocolCards}>
              {OPERATOR_QUICK_LINKS.map((item) => (
                <motion.div key={item.to} variants={protocolCard}>
                  <Link to={item.to} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
                    <QuickLinkCard>
                      <item.icon size={28} style={{ opacity: 0.9 }} />
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{item.label}</div>
                      <Muted>{item.desc}</Muted>
                      <span
                        style={{
                          marginTop: "auto",
                          fontSize: "0.75rem",
                          opacity: 0.65,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Open <IconArrowRight size={14} />
                      </span>
                    </QuickLinkCard>
                  </Link>
                </motion.div>
              ))}
            </Grid>

            <WorkspaceGrid as={motion.div} variants={protocolItem} initial="hidden" whileInView="show" viewport={viewportOnce}>
              <TaskSubmitPanel onSubmitted={onRefreshStats} />
              <GuideCard>
                <CardTitle>How the swarm works</CardTitle>
                {SWARM_STEPS.map((step, i) => (
                  <StepRow key={step.title}>
                    <StepNum>{i + 1}</StepNum>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "0.875rem" }}>{step.title}</div>
                      <p style={{ fontSize: "0.8125rem", opacity: 0.72, margin: 0, lineHeight: 1.55 }}>{step.body}</p>
                    </div>
                  </StepRow>
                ))}
                <div style={{ marginTop: "$6" }}>
                  <Button variant="outline" size="sm" as={Link} to="/tasks">
                    Full task market <IconArrowRight size={16} />
                  </Button>
                </div>
              </GuideCard>
            </WorkspaceGrid>
          </GlassContent>
        </BandGlassMotion>
      </PageBand>
    </PageMotion>
  );
}

export default function OverviewPage() {
  const { signedIn, address } = useSignedIn();
  const walletAddress = address?.toLowerCase() ?? null;
  const toast = useToast();

  const { error: healthError, reload: reloadHealth } = useFetch(() => {
    if (!signedIn) return Promise.resolve(null);
    return api.health();
  }, [signedIn]);

  const {
    data: walletStats,
    loading: walletStatsLoading,
    error: walletStatsError,
    reload: reloadWalletStats,
  } = useFetch(
    () => {
      if (!signedIn || !walletAddress) return Promise.resolve(null);
      return api.walletTaskStats(walletAddress);
    },
    [signedIn, walletAddress],
  );

  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);

  useEffect(() => {
    if (!signedIn) return;
    if (lastEvent?.type === "CIRCUIT_BREAK") toast.error("Circuit breaker is on. Work is paused.");
    if (lastEvent?.type === "CIRCUIT_RESET") toast.success("Circuit breaker reset. Work has resumed.");
  }, [lastEvent, signedIn, toast]);

  useEffect(() => {
    if (!signedIn || !walletAddress) return;
    if (!lastEvent || lastEvent.channel !== "tasks") return;
    if (["TASK_SUBMITTED", "TASK_QUEUED", "TASK_RELAYED", "TASK_COMPLETED", "TASK_FAILED"].includes(lastEvent.type)) {
      reloadWalletStats();
      toast.info(`Task update: ${lastEvent.type.replace("TASK_", "").toLowerCase()}`);
    }
  }, [lastEvent, signedIn, walletAddress, reloadWalletStats, toast]);

  const handleRetry = () => {
    reloadHealth();
    reloadWalletStats();
  };

  const handleRefreshStats = () => {
    reloadHealth();
    reloadWalletStats();
  };

  return (
    <Home>
      <AnimatePresence mode="wait">
        {signedIn && address ? (
          <OperatorOverview
            address={address}
            walletStats={walletStats}
            statsLoading={walletStatsLoading}
            healthError={healthError}
            walletStatsError={walletStatsError}
            onRetry={handleRetry}
            onRefreshStats={handleRefreshStats}
          />
        ) : (
          <GuestOverview />
        )}
      </AnimatePresence>
    </Home>
  );
}
