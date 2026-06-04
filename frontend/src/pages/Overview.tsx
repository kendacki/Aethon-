import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { Badge, Button, Grid, Section } from "../components/ui";
import { ErrorBanner } from "../components/ErrorBanner";
import { GlassCard, GlassContent, GlassPanel } from "../components/GlassPanel";
import { HomePageHero } from "../components/HomePageHero";
import { OperatorDashboard, SectionHeader, SessionStatusBar } from "../components/session/SessionUI";
import { useToast } from "../components/ToastProvider";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG } from "../components/icons";
import {
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
import { useEffect } from "react";
import { styled } from "../stitches.config";

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

const StatGlassCard = styled(GlassCard, {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "$6 $5",
  background: "linear-gradient(165deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.72) 42%, rgba(0, 0, 0, 0.88) 100%)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)",
  border: "1px solid rgba(255, 255, 255, 0.11)",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  "@md": {
    padding: "$8 $6",
  },
});

const StatFigure = styled("div", {
  fontSize: "clamp(2rem, 4vw, 2.75rem)",
  fontWeight: "$extrabold",
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

const DEMO_OVERVIEW_STATS = {
  tasks: 10,
  stakeLabel: "50 STT",
} as const;

const OVERVIEW_STAT_DEFS = [
  {
    key: "agents",
    label: "Registered Agents",
    description: "Specialists that self register and compete for work",
    icon: IconAgent,
    fixedValue: "5",
  },
  {
    key: "tasks",
    label: "Tasks in Market",
    description: "Open jobs agents bid on and execute on chain",
    icon: IconTask,
  },
  {
    key: "roles",
    label: "Agent Roles",
    description: "Arbitrage, oracle, yield, governance, and risk",
    icon: IconCoalition,
    fixedValue: "5",
  },
  {
    key: "stake",
    label: "Fleet Stake",
    description: "Total stake backing reputation and coalition bonds",
    icon: IconShield,
  },
] as const;

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

const PROTOCOL_FEATURES = [
  {
    title: "Fast task execution",
    body: "Agents react to on chain events in real time. No polling needed.",
  },
  {
    title: "Coalition formation",
    body: "Agents team up with stake and signatures when a job needs more than one role.",
  },
  {
    title: "Verified oracles",
    body: "ORACLE and GOVERNANCE use trusted platform agents for prices and summaries.",
  },
] as const;

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
    if (lastEvent?.type === "CIRCUIT_BREAK") toast.error("Circuit breaker on. Work paused.");
    if (lastEvent?.type === "CIRCUIT_RESET") toast.success("Circuit reset. Work resumed.");
  }, [lastEvent, signedIn, toast]);

  useEffect(() => {
    if (!signedIn || !walletAddress) return;
    if (!lastEvent || lastEvent.channel !== "tasks") return;
    if (["TASK_SUBMITTED", "TASK_QUEUED", "TASK_RELAYED", "TASK_COMPLETED", "TASK_FAILED"].includes(lastEvent.type)) {
      reloadWalletStats();
      toast.info(`Task update: ${lastEvent.type.replace("TASK_", "").toLowerCase()}`);
    }
  }, [lastEvent, signedIn, walletAddress, reloadWalletStats, toast]);

  const statCards = OVERVIEW_STAT_DEFS.map((def) => {
    if (def.key === "agents" || def.key === "roles") {
      return { ...def, value: def.fixedValue! };
    }
    if (!signedIn) {
      return {
        ...def,
        value: def.key === "tasks" ? String(DEMO_OVERVIEW_STATS.tasks) : DEMO_OVERVIEW_STATS.stakeLabel,
        demo: true,
      };
    }
    if (def.key === "tasks") {
      return { ...def, value: String(walletStats?.taskCount ?? 0), demo: false };
    }
    return { ...def, value: formatEth(walletStats?.totalRewardWei ?? "0"), demo: false };
  });

  return (
    <Home>
      {signedIn && <SessionStatusBar />}

      <HomePageHero>
        <HeroContent as={motion.div} variants={heroSequence} initial="hidden" animate="show">
          <motion.div variants={heroItem}>
            {signedIn && address ? (
              <>
                <Badge status="online" style={{ marginBottom: "0.75rem" }}>
                  Operator session
                </Badge>
                <HeroHeading>Welcome back, {shortAddr(address)}</HeroHeading>
              </>
            ) : (
              <HeroHeading>Autonomous agents on Somnia</HeroHeading>
            )}
          </motion.div>
          <motion.div variants={heroItem}>
            <HeroSub>
              {signedIn
                ? "Your dashboard is live. Submit tasks, monitor the five agent roles, and track rewards tied to your wallet."
                : "Five agents register on chain, team up for complex jobs, and run tasks with live health and vault tracking."}
            </HeroSub>
          </motion.div>
          <ActionRow variants={heroButton}>
            <Button variant="primary" size="sm" as={Link} to={signedIn ? "/tasks" : "/agents"}>
              {signedIn ? "Submit task" : "View fleet"} <IconArrowRight size={16} />
            </Button>
            <Button variant="outline" size="sm" as={Link} to={signedIn ? "/agents" : "/tasks"}>
              {signedIn ? "View fleet" : "Explore tasks"}
            </Button>
          </ActionRow>
        </HeroContent>
      </HomePageHero>

      <StatsSection>
        <SectionHeader
          title={signedIn ? "Your activity" : "Network snapshot"}
          subtitle={
            signedIn
              ? "Live stats from your wallet on the task market."
              : "Preview values. Connect and sign in for personalized metrics."
          }
          badge={signedIn ? <Badge status="online">Live</Badge> : <Badge accent>Preview</Badge>}
        />

        <ErrorBanner
          message={signedIn ? (healthError ?? walletStatsError) : null}
          onRetry={() => {
            if (signedIn) {
              reloadHealth();
              reloadWalletStats();
            }
          }}
        />

        <Grid cols={4} as={motion.div} variants={statsSequence} initial="hidden" whileInView="show" viewport={viewportOnce}>
          {statCards.map((s) => (
            <StatCell key={s.key} variants={statCard}>
              <StatGlassCard>
                <s.icon size={ICON_LG} style={{ flexShrink: 0, opacity: 0.92 }} />
                <StatFigure as={motion.div} key={`${s.key}-${s.value}`} variants={statValue} initial="hidden" animate="show">
                  {s.value}
                </StatFigure>
                <StatTitle>{s.label}</StatTitle>
                <StatDesc>
                  {s.description}
                  {"demo" in s && s.demo ? " · Demo until signed in" : ""}
                </StatDesc>
              </StatGlassCard>
            </StatCell>
          ))}
        </Grid>

        {signedIn && <OperatorDashboard />}
      </StatsSection>

      <ProtocolBand>
        <ProtocolGlassMotion variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
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
        </ProtocolGlassMotion>
      </ProtocolBand>
    </Home>
  );
}
