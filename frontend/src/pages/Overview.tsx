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

const Hero = styled("section", {
  minHeight: "calc(62vh - 5rem)",
  display: "flex",
  alignItems: "center",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$10 $6",
  width: "100%",
  boxSizing: "border-box",
  position: "relative",
});

const HeroContent = styled("div", {
  width: "100%",
  maxWidth: "420px",
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
          <HeroHeading>Autonomous agents</HeroHeading>
          <HeroSub>Self organizing fleets on chain.</HeroSub>
          <ActionRow>
            <Button variant="primary" as={Link} to="/agents">
              View Fleet <IconArrowRight size={ICON_SM} />
            </Button>
          </ActionRow>
        </HeroContent>
      </Hero>

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
