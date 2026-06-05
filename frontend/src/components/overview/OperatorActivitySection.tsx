import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, formatEth, type Task, type WalletTaskStats } from "../../api/client";
import { useFetch } from "../../api/hooks";
import { ErrorBanner } from "../ErrorBanner";
import { GlassOverviewBand, GlassElevatedCard, GlassContent, GlassSurface, GLASS } from "../GlassPanel";
import { IconAgent, IconArrowRight, IconCoalition, IconTask, IconVault, ICON_MD } from "../icons";
import { summarizeWalletStake } from "../../lib/walletStake";
import { Badge, Button } from "../ui";
import { spring, styled, keyframes } from "../../stitches.config";

const pulse = keyframes({
  "0%, 100%": { opacity: 1, transform: "scale(1)" },
  "50%": { opacity: 0.45, transform: "scale(0.92)" },
});

const Panel = GlassOverviewBand;

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
  fontFamily: "$primary",
  fontSize: "$xl",
  fontWeight: 700,
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
  letterSpacing: "0.02em",
  textTransform: "none",
  padding: "$1 $3",
  borderRadius: "$pill",
  border: `1px solid ${GLASS.accentBorderStrong}`,
  background: GLASS.accentFill,
  color: "#0dbc82",
});

const LiveDot = styled("span", {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#0dbc82",
  boxShadow: `0 0 8px ${GLASS.accentBorderStrong}`,
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

const MetricCard = styled(GlassElevatedCard, {
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  minHeight: "9.5rem",
  transition: "border-color 150ms ease, transform 150ms ease",
});

const MetricTop = styled("div", {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "$3",
});

const IconRing = styled(GlassSurface, {
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

const StakeBreakdown = styled("ul", {
  listStyle: "none",
  margin: "$3 0 0",
  padding: "$3 0 0",
  borderTop: `1px solid ${GLASS.divider}`,
  display: "grid",
  gap: "$2",
});

const StakeRow = styled("li", {
  display: "flex",
  justifyContent: "space-between",
  gap: "$3",
  fontSize: "0.6875rem",
  lineHeight: 1.45,
  opacity: 0.75,
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
  background: GLASS.fill,
  border: `1px solid ${GLASS.borderSoft}`,
  transition: "border-color 150ms ease",
  "&:hover": {
    borderColor: GLASS.borderHover,
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
  borderTop: `1px solid ${GLASS.divider}`,
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
    background: GLASS.fill,
    borderColor: GLASS.divider,
  },
});

const shimmer = keyframes({
  "0%": { backgroundPosition: "200% 0" },
  "100%": { backgroundPosition: "-200% 0" },
});

const Skeleton = styled("div", {
  borderRadius: "$md",
  background: GLASS.gradient.shimmer,
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
  const stakeSummary = summarizeWalletStake(walletStats, taskCount);

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
      <GlassContent>
        <Header>
        <TitleBlock>
          <Title>your activity</Title>
        </TitleBlock>
        <HeaderActions>
          <LivePill>
            <LiveDot aria-hidden />
            live
          </LivePill>
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={loading}>
            {loading ? "updating..." : "refresh"}
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
              {emptyTasks ? (
                <MetricHint>Ask your first question to the fleet.</MetricHint>
              ) : null}
              {emptyTasks ? (
                <Button variant="primary" size="sm" as={Link} to="/tasks" style={{ marginTop: "0.25rem", alignSelf: "flex-start" }}>
                  New task
                </Button>
              ) : (
                <MetricFooter as={Link} to="/tasks">
                  All tasks <IconArrowRight size={14} />
                </MetricFooter>
              )}
            </>
          )}
        </MetricCard>

        <MetricCard>
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
                  <MetricValue>{stakeSummary.headline}</MetricValue>
                  <MetricLabel>stt on tasks</MetricLabel>
                </div>
                <IconRing>
                  <IconVault size={ICON_MD} />
                </IconRing>
              </MetricTop>
              <MetricHint>{stakeSummary.detail}</MetricHint>
              <StakeBreakdown>
                {stakeSummary.breakdown.map((row) => (
                  <StakeRow key={row.label}>
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 600, opacity: 1 }}>{row.value}</span>
                  </StakeRow>
                ))}
              </StakeBreakdown>
              <MetricFooter as={Link} to="/tasks" style={{ marginTop: "0.75rem" }}>
                About stake <IconArrowRight size={14} />
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
            <FleetLabel>Agents</FleetLabel>
          </div>
        </FleetStat>
        <FleetStat>
          <IconRing>
            <IconCoalition size={ICON_MD} />
          </IconRing>
          <div>
            <FleetValue>5</FleetValue>
            <FleetLabel>Roles</FleetLabel>
          </div>
        </FleetStat>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 4 }}>
          View fleet <IconArrowRight size={14} />
        </span>
      </FleetBar>

      {(recentLoading || recentTasks.length > 0) && (
        <RecentBlock>
          <RecentTitle>
            <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Recent tasks</span>
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
            <p style={{ margin: 0, fontSize: "$sm", opacity: 0.65 }}>No tasks yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "$1" }}>
              {recentTasks.slice(0, 5).map((task: Task) => (
                <TaskRow key={task.id} to="/tasks" state={{ scrollToTasks: true }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8 }}>#{task.id}</span>
                  <span style={{ fontSize: "0.8125rem", opacity: 0.85 }}>
                    {formatEth(task.reward)}
                    {task.complexity >= 5 ? " · swarm" : " · single role"}
                  </span>
                  <Badge status={statusBadgeVariant(task.status)}>
                    {task.status.toLowerCase()}
                  </Badge>
                </TaskRow>
              ))}
            </div>
          )}
        </RecentBlock>
      )}
      </GlassContent>
    </Panel>
  );
}
