import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, formatEth } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Button, Card, Grid, Section, StatValue } from "../components/ui";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_LG, ICON_SM } from "../components/icons";
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
  maxWidth: "100%",
});

const HeroLine = styled("h1", {
  fontFamily: "$sans",
  fontWeight: "$extrabold",
  fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
  color: "$text",
  whiteSpace: "normal",
  "@md": {
    fontSize: "clamp(2.25rem, 4.5vw, 4rem)",
    whiteSpace: "nowrap",
  },
});

const HeroLineMuted = styled("span", {
  fontWeight: "$semibold",
  opacity: 0.82,
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
  marginTop: "$6",
  alignItems: "center",
});

const EMPTY = "...";

export default function OverviewPage() {
  const { data: stats } = useFetch(() => api.stats(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker", "tasks"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") setToast("Circuit breaker activated. Operations paused.");
    if (lastEvent?.type === "CIRCUIT_RESET") setToast("Circuit breaker reset. Operations resumed.");
  }, [lastEvent]);

  const statCards = [
    {
      label: "Registered Agents",
      value: stats != null ? String(stats.agentCount) : EMPTY,
      icon: IconAgent,
      sub: "Specialists that self register and compete for work",
    },
    {
      label: "Tasks in Market",
      value: stats != null ? String(stats.taskCount) : EMPTY,
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
      value: stats != null ? formatEth(stats.tvl) : EMPTY,
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
            <HeroLine>
              Swarm Autonomous agents. <HeroLineMuted>Self organizing fleets on chain.</HeroLineMuted>
            </HeroLine>
            <ActionRow>
              <Button variant="primary" as={Link} to="/agents">
                View Fleet <IconArrowRight size={ICON_SM} />
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

      <Notification message={toast} onClose={() => setToast("")} />
    </Home>
  );
}
