import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { shortAddr } from "../../api/client";
import { useSignedIn, type SessionPhase } from "../../auth/useSignedIn";
import { env } from "../../config/env";
import { spring } from "../../stitches.config";
import { styled } from "../../stitches.config";
import { Badge, Button, Card, Grid, Muted } from "../ui";
import { GlassCard, GlassContent, GlassPanel } from "../GlassPanel";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask } from "../icons";

/* ── Session status bar (authenticated only) ── */

const SessionStrip = styled("div", {
  position: "sticky",
  top: "4.5rem",
  zIndex: 90,
  width: "100%",
  borderBottom: "1px solid rgba(13, 188, 130, 0.25)",
  background: "linear-gradient(90deg, rgba(13, 188, 130, 0.12) 0%, rgba(0, 0, 0, 0.92) 48%, rgba(0, 0, 0, 0.96) 100%)",
  backdropFilter: "blur(12px)",
});

const SessionInner = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$3 $6",
  display: "none",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$4",
  flexWrap: "wrap",
  "@lg": {
    display: "flex",
  },
});

const SessionInnerCompact = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$2 $4",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$3",
  minHeight: "2.5rem",
  "@lg": {
    display: "none",
  },
});

const SessionMeta = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$3",
  flexWrap: "wrap",
});

const LiveDot = styled("span", {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#0dbc82",
  boxShadow: "0 0 12px rgba(13, 188, 130, 0.8)",
  flexShrink: 0,
});

export function SessionStatusBar() {
  const { signedIn, address, isCorrectChain, chainId } = useSignedIn();
  if (!signedIn || !address) return null;

  return (
    <SessionStrip>
      <SessionInnerCompact>
        <SessionMeta>
          <LiveDot aria-hidden />
          <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>Operator</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.6875rem", opacity: 0.8 }}>{shortAddr(address)}</span>
        </SessionMeta>
        <Badge status={isCorrectChain ? "online" : undefined} accent={!isCorrectChain} style={{ fontSize: "0.625rem" }}>
          {isCorrectChain ? "Live" : "Wrong net"}
        </Badge>
      </SessionInnerCompact>

      <SessionInner>
        <SessionMeta>
          <LiveDot aria-hidden />
          <span style={{ fontWeight: 700, fontSize: "0.8125rem" }}>Swarm operator</span>
          <Badge status="online">Signed in</Badge>
          <span style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.85 }}>{shortAddr(address)}</span>
          <Badge accent={!isCorrectChain}>{isCorrectChain ? `Chain ${chainId ?? env.somniaChainId}` : "Wrong network"}</Badge>
        </SessionMeta>
        <SessionMeta>
          <Button variant="ghost" size="sm" as={Link} to="/tasks">
            Submit task
          </Button>
          <Button variant="outline" size="sm" as={Link} to="/agents">
            Fleet
          </Button>
        </SessionMeta>
      </SessionInner>
    </SessionStrip>
  );
}

/* ── Signed-in page shell ── */

const Shell = styled("div", {
  width: "100%",
});

const ContentMax = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  padding: "$8 $6 $10",
  boxSizing: "border-box",
});

const FallbackCard = styled(GlassPanel, {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "$10 $8",
  textAlign: "center",
});

type SignedInShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function SignedInShell({ title, description, children, fallback }: SignedInShellProps) {
  const { signedIn, phase } = useSignedIn();

  if (!signedIn) {
    return (
      <Shell>
        <ContentMax>
          {fallback ?? <AuthFallbackCard title={title} description={description} phase={phase} />}
        </ContentMax>
      </Shell>
    );
  }

  return (
    <Shell>
      <ContentMax>{children}</ContentMax>
    </Shell>
  );
}

function AuthFallbackCard({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase: SessionPhase;
}) {
  const hint =
    phase === "wallet"
      ? "Your wallet is connected. Click Sign in in the top right to unlock operator features."
      : "Connect your wallet, then sign in to access swarm controls and personalized data.";

  return (
    <FallbackCard>
      <GlassContent>
        <h2 style={{ fontWeight: 800, fontSize: "1.35rem", marginBottom: "0.75rem" }}>{title}</h2>
        {description && <p style={{ opacity: 0.78, lineHeight: 1.65, marginBottom: "1.25rem" }}>{description}</p>}
        <p style={{ opacity: 0.72, fontSize: "0.875rem", lineHeight: 1.6 }}>{hint}</p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" size="sm" as={Link} to="/">
            Back to overview
          </Button>
        </div>
      </GlassContent>
    </FallbackCard>
  );
}

/* ── Operator dashboard blocks ── */

const BlockTitle = styled("h2", {
  fontSize: "$xl",
  fontWeight: "$extrabold",
  letterSpacing: "-0.02em",
  marginBottom: "$2",
});

const BlockSub = styled("p", {
  fontSize: "$sm",
  opacity: 0.72,
  lineHeight: 1.6,
  marginBottom: "$6",
  maxWidth: "36rem",
});

const ActionCard = styled(GlassCard, {
  padding: "$6",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  cursor: "pointer",
  transition: "border-color 150ms ease, transform 150ms ease",
  "&:hover": {
    borderColor: "rgba(255, 255, 255, 0.22)",
    transform: "translateY(-2px)",
  },
});

const StepRow = styled("div", {
  display: "flex",
  gap: "$4",
  alignItems: "flex-start",
  padding: "$4 0",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
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

const SWARM_STEPS = [
  {
    title: "Submit a task",
    body: "Choose a single agent role or full swarm mode. Sign the payload with your wallet.",
  },
  {
    title: "Agents form a coalition",
    body: "When complexity requires it, specialists stake and coordinate on chain.",
  },
  {
    title: "Execution and settlement",
    body: "Workers run skills, report results, and rewards flow through the task market.",
  },
] as const;

const QUICK_LINKS = [
  { to: "/tasks", label: "Task market", desc: "Submit and track jobs", icon: IconTask },
  { to: "/agents", label: "Agent fleet", desc: "Five on chain roles", icon: IconAgent },
  { to: "/governance", label: "Safety", desc: "Circuit breaker status", icon: IconShield },
  { to: "/leaderboard", label: "Leaderboard", desc: "Reputation rankings", icon: IconCoalition },
] as const;

export function OperatorDashboard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{ marginTop: "2.5rem" }}
    >
      <BlockTitle>Operator console</BlockTitle>
      <BlockSub>
        You are signed in. Submit tasks to the swarm, monitor agents, and review protocol safety from one place.
      </BlockSub>

      <Grid cols={4} style={{ marginBottom: "2.5rem" }}>
        {QUICK_LINKS.map((item) => (
          <Link key={item.to} to={item.to} style={{ textDecoration: "none", color: "inherit" }}>
            <ActionCard>
              <item.icon size={28} style={{ opacity: 0.9 }} />
              <div style={{ fontWeight: 700 }}>{item.label}</div>
              <Muted>{item.desc}</Muted>
              <span style={{ marginTop: "auto", fontSize: "0.75rem", opacity: 0.65, display: "flex", alignItems: "center", gap: 4 }}>
                Open <IconArrowRight size={14} />
              </span>
            </ActionCard>
          </Link>
        ))}
      </Grid>

      <Grid cols={2}>
        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>How the swarm runs</h3>
          {SWARM_STEPS.map((step, i) => (
            <StepRow key={step.title}>
              <StepNum>{i + 1}</StepNum>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
                <p style={{ fontSize: "0.8125rem", opacity: 0.72, margin: 0, lineHeight: 1.55 }}>{step.body}</p>
              </div>
            </StepRow>
          ))}
        </Card>
        <GlassCard style={{ padding: "$6" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Ready to run</h3>
          <p style={{ fontSize: "$sm", opacity: 0.78, lineHeight: 1.65, marginBottom: "$5" }}>
            Use full swarm mode on the task market when all five agent types should collaborate on one job.
          </p>
          <Button variant="primary" size="sm" as={Link} to="/tasks">
            Go to task market <IconArrowRight size={16} />
          </Button>
        </GlassCard>
      </Grid>
    </motion.section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <BlockTitle style={{ marginBottom: 0 }}>{title}</BlockTitle>
          {badge}
        </div>
        {subtitle && <BlockSub style={{ marginBottom: 0, marginTop: "0.5rem" }}>{subtitle}</BlockSub>}
      </div>
    </div>
  );
}
