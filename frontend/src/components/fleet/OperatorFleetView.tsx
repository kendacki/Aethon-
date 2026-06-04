import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, formatEth, shortAddr, type Agent, type AgentFleetHealth, type FleetHealth } from "../../api/client";
import { useFetch } from "../../api/hooks";
import { FLEET_ROLE_META, sortAgentsByRole, workerStatusLabel } from "../../config/fleetRoles";
import { ALL_AGENT_TYPES, type AgentType } from "../../task/payload";
import { ErrorBanner } from "../ErrorBanner";
import { GlassOverviewBand, GlassContent, GlassElevatedCard, GlassSurface, GlassFilterPill, GLASS } from "../GlassPanel";
import { IconAgent, IconArrowRight, IconTask, ICON_MD } from "../icons";
import { Badge, Button } from "../ui";
import { spring, styled, keyframes } from "../../stitches.config";

const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.45 },
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

const Title = styled("h2", {
  fontFamily: "$primary",
  fontSize: "$xl",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  margin: 0,
});

const Subtitle = styled("p", {
  fontFamily: "$secondary",
  fontWeight: 400,
  marginTop: "$2",
  fontSize: "$sm",
  opacity: 0.72,
  lineHeight: 1.55,
  maxWidth: "32rem",
});

const HeaderActions = styled("div", {
  display: "flex",
  gap: "$2",
  flexWrap: "wrap",
  alignItems: "center",
  flexShrink: 0,
});

const SummaryGrid = styled("div", {
  display: "grid",
  gap: "$3",
  gridTemplateColumns: "repeat(2, 1fr)",
  "@md": { gridTemplateColumns: "repeat(4, 1fr)" },
  marginBottom: "$6",
});

const SummaryCell = styled(GlassSurface, {
  padding: "$4 $5",
});

const SummaryValue = styled("div", {
  fontFamily: "$primary",
  fontSize: "1.5rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
});

const SummaryLabel = styled("div", {
  fontSize: "0.6875rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.6,
  marginTop: "$1",
});

const Toolbar = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$3",
  alignItems: "center",
  marginBottom: "$5",
});

const FilterPill = GlassFilterPill;

const AgentGrid = styled("div", {
  display: "grid",
  gap: "$4",
  gridTemplateColumns: "1fr",
  "@md": { gridTemplateColumns: "repeat(2, 1fr)" },
  "@lg": { gridTemplateColumns: "repeat(3, 1fr)" },
});

const AgentCard = styled(motion(GlassElevatedCard), {
  display: "flex",
  flexDirection: "column",
  gap: "$4",
  padding: "$5",
  minHeight: "100%",
  transition: "border-color 150ms ease, transform 150ms ease",
  "&:hover": {
    borderColor: GLASS.accentBorderHover,
    transform: "translateY(-2px)",
  },
});

const CardTop = styled("div", {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "$3",
});

const RoleTitle = styled("h3", {
  fontSize: "1.0625rem",
  fontWeight: 800,
  margin: 0,
  letterSpacing: "-0.01em",
});

const RoleDesc = styled("p", {
  margin: "$2 0 0",
  fontSize: "$xs",
  opacity: 0.68,
  lineHeight: 1.5,
});

const StatRow = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "$3",
  paddingTop: "$3",
  borderTop: `1px solid ${GLASS.divider}`,
});

const StatBlock = styled("div", {});

const StatLabel = styled("div", {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  opacity: 0.55,
});

const StatVal = styled("div", {
  fontSize: "$sm",
  fontWeight: 700,
  marginTop: "$1",
});

const CardActions = styled("div", {
  display: "flex",
  gap: "$2",
  flexWrap: "wrap",
  marginTop: "auto",
});

const LiveDot = styled("span", {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#0dbc82",
  animation: `${pulse} 2s ease-in-out infinite`,
});

const TYPES: { value: string; label: string }[] = [
  { value: "", label: "All roles" },
  ...ALL_AGENT_TYPES.map((t) => ({ value: t, label: FLEET_ROLE_META[t].label })),
];

function healthByRoleMap(fleet: FleetHealth | null): Map<string, AgentFleetHealth> {
  const map = new Map<string, AgentFleetHealth>();
  fleet?.agents.forEach((a) => map.set(a.role, a));
  return map;
}

function isAgentOperational(agent: Agent, worker: AgentFleetHealth | undefined): boolean {
  if (agent.online) return true;
  if (worker?.online) return true;
  if (worker?.status === "HEALTHY" || worker?.status === "DEGRADED" || worker?.status === "STARTING") {
    return true;
  }
  return false;
}

function workerBadgeStatus(
  agent: Agent,
  worker: AgentFleetHealth | undefined,
): "online" | "offline" | undefined {
  if (!isAgentOperational(agent, worker)) return "offline";
  if (worker?.status === "HEALTHY") return "online";
  if (worker?.status === "HALTED") return "offline";
  return undefined;
}

function sumStakeWei(agents: Agent[]): bigint {
  return agents.reduce((sum, a) => {
    try {
      return sum + BigInt(a.stake || "0");
    } catch {
      return sum;
    }
  }, 0n);
}

export function OperatorFleetView() {
  const [typeFilter, setTypeFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, reload } = useFetch(
    () => api.agents(0, 50, typeFilter || undefined),
    [typeFilter],
  );

  const { data: fleetHealth, reload: reloadHealth } = useFetch(() => api.fleetHealth(), []);

  const { data: stats, reload: reloadStats } = useFetch(() => api.stats(), []);

  const healthMap = useMemo(() => healthByRoleMap(fleetHealth), [fleetHealth]);

  const agents = useMemo(() => {
    let list = sortAgentsByRole(data?.data ?? []);
    if (onlineOnly) {
      list = list.filter((a) => isAgentOperational(a, healthMap.get(a.agentType)));
    }
    return list;
  }, [data?.data, onlineOnly, healthMap]);

  const onlineCount = useMemo(() => {
    const agents = data?.data ?? [];
    return agents.filter((a) => isAgentOperational(a, healthMap.get(a.agentType))).length;
  }, [data?.data, healthMap]);
  const totalAgents = data?.pagination.total ?? data?.data.length ?? 0;
  const totalStake = useMemo(() => formatEth(String(sumStakeWei(data?.data ?? []))), [data?.data]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reload();
    reloadHealth();
    reloadStats();
    setTimeout(() => setRefreshing(false), 400);
  }, [reload, reloadHealth, reloadStats]);

  const busy = loading || refreshing;

  return (
    <Panel as={motion.section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <GlassContent>
      <Header>
        <div>
          <Title>Swarm fleet</Title>
          <Subtitle>Filter by role, refresh live data, and open agent details from each card.</Subtitle>
        </div>
        <HeaderActions>
          <Button variant="outline" size="sm" as={Link} to="/tasks" style={{ width: "auto" }}>
            Dispatch <IconArrowRight size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={busy} style={{ width: "auto" }}>
            {busy ? "Updating…" : "Refresh"}
          </Button>
        </HeaderActions>
      </Header>

      <ErrorBanner message={error} onRetry={reload} />

      <SummaryGrid>
        <SummaryCell>
          <SummaryValue>
            {onlineCount}/{totalAgents || 5}
          </SummaryValue>
          <SummaryLabel>Agents online</SummaryLabel>
        </SummaryCell>
        <SummaryCell>
          <SummaryValue>{totalStake}</SummaryValue>
          <SummaryLabel>Total stake</SummaryLabel>
        </SummaryCell>
        <SummaryCell>
          <SummaryValue>{stats?.completedTasks?.toLocaleString() ?? "N/A"}</SummaryValue>
          <SummaryLabel>Tasks completed</SummaryLabel>
        </SummaryCell>
        <SummaryCell>
          <SummaryValue style={{ fontSize: "1.125rem", display: "flex", alignItems: "center", gap: 8 }}>
            {fleetHealth?.status ?? "N/A"}
            {fleetHealth?.status === "HEALTHY" && <LiveDot aria-hidden />}
          </SummaryValue>
          <SummaryLabel>Fleet readiness</SummaryLabel>
        </SummaryCell>
      </SummaryGrid>

      <Toolbar>
        <div style={{ display: "flex", gap: "$2", flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <FilterPill
              key={t.value || "all"}
              active={typeFilter === t.value}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </FilterPill>
          ))}
        </div>
        <FilterPill active={onlineOnly} onClick={() => setOnlineOnly((v) => !v)}>
          Online only
        </FilterPill>
      </Toolbar>

      {busy && agents.length === 0 && (
        <p style={{ opacity: 0.72, margin: 0 }}>Loading fleet…</p>
      )}

      {!busy && agents.length === 0 && (
        <p style={{ opacity: 0.72, margin: 0 }}>No agents match this filter.</p>
      )}

      <AgentGrid>
        {agents.map((agent, i) => {
          const meta = FLEET_ROLE_META[agent.agentType as AgentType];
          const worker = healthMap.get(agent.agentType);
          const roleLabel = meta?.label ?? agent.agentType;
          const roleDesc = meta?.description ?? "Registered swarm specialist.";

          return (
            <AgentCard
              key={agent.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.04 }}
            >
              <CardTop>
                <div>
                  <Badge accent>{meta?.shortLabel ?? agent.agentType}</Badge>
                  <RoleTitle style={{ marginTop: "0.5rem" }}>{roleLabel}</RoleTitle>
                  <RoleDesc>{roleDesc}</RoleDesc>
                </div>
                <IconAgent size={ICON_MD} style={{ opacity: 0.9, flexShrink: 0 }} />
              </CardTop>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "$2" }}>
                <Badge status={isAgentOperational(agent, worker) ? "online" : "offline"}>
                  {isAgentOperational(agent, worker) ? "On-chain" : "Offline"}
                </Badge>
                {worker && worker.status !== "UNKNOWN" && (
                  <Badge
                    status={workerBadgeStatus(agent, worker)}
                    accent={worker.status === "DEGRADED"}
                  >
                    Worker {workerStatusLabel(worker.status).toLowerCase()}
                  </Badge>
                )}
              </div>

              <div style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.8 }}>{shortAddr(agent.address)}</div>

              <StatRow>
                <StatBlock>
                  <StatLabel>Reputation</StatLabel>
                  <StatVal>{agent.reputation}</StatVal>
                </StatBlock>
                <StatBlock>
                  <StatLabel>Stake</StatLabel>
                  <StatVal>{formatEth(agent.stake)}</StatVal>
                </StatBlock>
              </StatRow>

              <div style={{ fontSize: "0.6875rem", opacity: 0.55 }}>
                Heartbeat {new Date(agent.lastHeartbeat).toLocaleString()}
              </div>

              <CardActions>
                <Button variant="outline" size="sm" as={Link} to={`/agents/${agent.address}`}>
                  Details
                </Button>
                <Button variant="ghost" size="sm" as={Link} to="/tasks">
                  <IconTask size={16} /> Task market
                </Button>
              </CardActions>
            </AgentCard>
          );
        })}
      </AgentGrid>
      </GlassContent>
    </Panel>
  );
}
