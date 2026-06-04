import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, formatEth, type Task, type WalletTaskStats } from "../../api/client";
import { useFetch } from "../../api/hooks";
import { ErrorBanner } from "../ErrorBanner";
import { GlassPanel } from "../GlassPanel";
import { IconAgent, IconArrowRight, IconCoalition, IconShield, IconTask, ICON_MD } from "../icons";
import { Badge, Button } from "../ui";
import { spring, styled, keyframes } from "../../stitches.config";

const pulse = keyframes({
  "0%, 100%": { opacity: 1, transform: "scale(1)" },
  "50%": { opacity: 0.45, transform: "scale(0.92)" },
});

const Panel = styled(GlassPanel, {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$6",
  width: "100%",
  boxSizing: "border-box",
  borderColor: "rgba(13, 188, 130, 0.22)",
  background: "linear-gradient(165deg, rgba(13, 188, 130, 0.06) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.85) 100%)",
  "@md": { padding: "$8" },
  defaultVariants: { radius: "full" },
});

const Header = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "$4",
  marginBottom: "$6",
});

const TitleBlock = styled("div", {});

const Title = styled("h2", {
  fontSize: "$xl",
  fontWeight: "$extrabold",
  letterSpacing: "-0.02em",
  margin: 0,
});

const HeaderActions = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$3",
  flexWrap: "wrap",
});

const LivePill = styled("span", {
  display: "inline-flex",
  alignItems: "center",
  gap: "$2",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "$1 $3",
  borderRadius: "$pill",
  border: "1px solid rgba(13, 188, 130, 0.4)",
  background: "rgba(13, 188, 130, 0.12)",
  color: "#0dbc82",
});

const LiveDot = styled("span", {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#0dbc82",
  boxShadow: "0 0 8px rgba(13, 188, 130, 0.8)",
  animation: `${pulse} 2s ease-in-out infinite`,
});

const MetricGrid = styled("div", {
  display: "grid",
  gap: "$4",
  gridTemplateColumns: "1fr",
  "@md": {
    gridTemplateColumns: "1fr 1fr",
  },
});

const MetricCard = styled(motion.div, {
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  padding: "$6",
  borderRadius: "$lg",
  background: "linear-gradient(165deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.5) 100%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
  transition: "border-color 150ms ease, transform 150ms ease",
  minHeight: "9.5rem",
  variants: {
    accent: {
      rewards: {
        borderColor: "rgba(13, 188, 130, 0.2)",
        background: "linear-gradient(165deg, rgba(13, 188, 130, 0.1) 0%, rgba(0, 0, 0, 0.55) 100%)",
      },
    },
  },
});

const MetricTop = styled("div", {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "$3",
});

const IconRing = styled("div", {
  width: 44,
  height: 44,
  borderRadius: "$md",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  flexShrink: 0,
});

const MetricValue = styled("div", {
  fontSize: "clamp(2rem, 4vw, 2.5rem)",
  fontWeight: "$extrabold",
  letterSpacing: "-0.03em",
  lineHeight: 1,
});

const MetricLabel = styled("div", {
  fontWeight: 700,
  fontSize: "$sm",
});

const MetricHint = styled("p", {
  margin: 0,
  fontSize: "$xs",
  opacity: 0.65,
  lineHeight: 1.5,
});

const MetricFooter = styled(Link, {
  marginTop: "auto",
  fontSize: "0.75rem",
  fontWeight: 600,
  opacity: 0.55,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  textDecoration: "none",
  color: "inherit",
  width: "fit-content",
  "&:hover": { opacity: 0.85 },
});

const FleetBar = styled(Link, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$4",
  flexWrap: "wrap",
  marginTop: "$4",
  padding: "$5 $6",
  borderRadius: "$lg",
  textDecoration: "none",
  color: "inherit",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  transition: "border-color 150ms ease",
  "&:hover": {
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
});

const FleetStat = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$3",
});

const FleetValue = styled("span", {
  fontWeight: 800,
  fontSize: "1.25rem",
  letterSpacing: "-0.02em",
});

const FleetLabel = styled("span", {
  fontSize: "$xs",
  opacity: 0.65,
  display: "block",
  marginTop: 2,
});

const RecentBlock = styled("div", {
  marginTop: "$6",
  paddingTop: "$6",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
});

const RecentTitle = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "$4",
  gap: "$3",
});

const TaskRow = styled(Link, {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: "$4",
  padding: "$3 $4",
  borderRadius: "$md",
  textDecoration: "none",
  color: "inherit",
  border: "1px solid transparent",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
});

const shimmer = keyframes({
  "0%": { backgroundPosition: "200% 0" },
  "100%": { backgroundPosition: "-200% 0" },
});

const Skeleton = styled("div", {
  borderRadius: "$md",
  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 100%)",
  backgroundSize: "200% 100%",
  animation: `${shimmer} 1.2s ease-in-out infinite`,
});

function statusBadgeVariant(status: string): "online" | "offline" | undefined {
  if (status === "COMPLETED") return "online";
  if (status === "FAILED" || status === "EXPIRED") return "offline";
  return undefined;
}

type OperatorActivitySectionProps = {
  address: string;
  walletStats: WalletTaskStats | null;
  statsLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh: () => void;
};

export function OperatorActivitySection({
  address,
  walletStats,
  statsLoading,
  error,
  onRetry,
  onRefresh,
}: OperatorActivitySectionProps) {
  const [refreshing, setRefreshing] = useState(false);
  const wallet = address.toLowerCase();

  const { data: recentPage, loading: recentLoading, reload: reloadRecent } = useFetch(
    () => api.tasks(0, undefined, wallet, 5),
    [wallet],
  );

  const recentTasks = recentPage?.data ?? [];

  const taskCount = walletStats?.taskCount ?? 0;
  const rewards = formatEth(walletStats?.totalRewardWei ?? "0");
  const avgReward =
    taskCount > 0 && walletStats?.totalRewardWei
      ? formatEth(String(BigInt(walletStats.totalRewardWei) / BigInt(taskCount)))
      : null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    onRefresh();
    reloadRecent();
    setTimeout(() => setRefreshing(false), 400);
  }, [onRefresh, reloadRecent]);

  const loading = statsLoading || refreshing;

  const emptyTasks = !loading && taskCount === 0;

  return (
    <Panel as={motion.section} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <Header>
        <TitleBlock>
          <Title>Your activity</Title>
          <Subtitle>Wallet metrics for {shortAddr(address)} on the Somnia task market.</Subtitle>
        </TitleBlock>
        <HeaderActions>
          <LivePill>
            <LiveDot aria-hidden />
            Live
          </LivePill>
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={loading}>
            {loading ? "Updating…" : "Refresh"}
          </Button>
        </HeaderActions>
      </Header>

      <ErrorBanner message={error} onRetry={onRetry} />

      <MetricGrid>
        <MetricCard>
          {loading ? (
            <>
              <Skeleton css={{ height: 44, width: 44 }} />
              <Skeleton css={{ height: 40, width: "40%" }} />
              <Skeleton css={{ height: 14, width: "70%" }} />
            </>
          ) : (
            <>
              <MetricTop>
                <div>
                  <MetricValue>{taskCount}</MetricValue>
                  <MetricLabel>Tasks submitted</MetricLabel>
                </div>
                <IconRing>
                  <IconTask size={ICON_MD} />
                </IconRing>
              </MetricTop>
              <MetricHint>
                {emptyTasks
                  ? "No jobs yet — dispatch your first task to the swarm."
                  : `${taskCount === 1 ? "1 job" : `${taskCount} jobs`} indexed for your wallet.`}
              </MetricHint>
              {emptyTasks ? (
                <Button variant="primary" size="sm" as={Link} to="/tasks" style={{ marginTop: "0.25rem", alignSelf: "flex-start" }}>
                  Submit first task
                </Button>
              ) : (
                <MetricFooter as={Link} to="/tasks">
                  View task market <IconArrowRight size={14} />
                </MetricFooter>
              )}
            </>
          )}
        </MetricCard>

        <MetricCard accent="rewards">
          {loading ? (
            <>
              <Skeleton css={{ height: 44, width: 44 }} />
              <Skeleton css={{ height: 40, width: "50%" }} />
              <Skeleton css={{ height: 14, width: "60%" }} />
            </>
          ) : (
            <>
              <MetricTop>
                <div>
                  <MetricValue>{rewards}</MetricValue>
                  <MetricLabel>Rewards earned</MetricLabel>
                </div>
                <IconRing>
                  <IconShield size={ICON_MD} />
                </IconRing>
              </MetricTop>
              <MetricHint>
                {taskCount === 0
                  ? "Rewards appear after agents complete your tasks."
                  : avgReward
                    ? `~${avgReward} STT average per completed job.`
                    : "Settlement credited on chain to your wallet."}
              </MetricHint>
              <MetricFooter as={Link} to="/tasks">
                Track on task market <IconArrowRight size={14} />
              </MetricFooter>
            </>
          )}
        </MetricCard>
      </MetricGrid>

      <FleetBar to="/agents">
        <FleetStat>
          <IconRing>
            <IconAgent size={ICON_MD} />
          </IconRing>
          <div>
            <FleetValue>5</FleetValue>
            <FleetLabel>Registered agents</FleetLabel>
          </div>
        </FleetStat>
        <FleetStat>
          <IconRing>
            <IconCoalition size={ICON_MD} />
          </IconRing>
          <div>
            <FleetValue>5</FleetValue>
            <FleetLabel>Active roles</FleetLabel>
          </div>
        </FleetStat>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 4 }}>
          View fleet <IconArrowRight size={14} />
        </span>
      </FleetBar>

      {(recentLoading || recentTasks.length > 0) && (
        <RecentBlock>
          <RecentTitle>
            <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Recent submissions</span>
            <Button variant="ghost" size="sm" as={Link} to="/tasks" state={{ scrollToTasks: true }}>
              All tasks
            </Button>
          </RecentTitle>
          {recentLoading ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} css={{ height: 48, width: "100%" }} />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <p style={{ margin: 0, fontSize: "$sm", opacity: 0.65 }}>No indexed tasks for this wallet yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "$1" }}>
              {recentTasks.slice(0, 5).map((task: Task) => (
                <TaskRow key={task.id} to="/tasks" state={{ scrollToTasks: true }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8 }}>#{task.id}</span>
                  <span style={{ fontSize: "0.8125rem", opacity: 0.85 }}>
                    {formatEth(task.reward)} · complexity {task.complexity}
                  </span>
                  <Badge status={statusBadgeVariant(task.status)} style={{ textTransform: "capitalize", letterSpacing: 0 }}>
                    {task.status.toLowerCase()}
                  </Badge>
                </TaskRow>
              ))}
            </div>
          )}
        </RecentBlock>
      )}
    </Panel>
  );
}
