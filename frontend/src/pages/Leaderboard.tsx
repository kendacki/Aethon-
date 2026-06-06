import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { api, formatEth, shortAddr, type Agent } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { PageContentWide, SectionHeading, SectionHeadingMeta, SectionHeadingTitle, SubpageHero } from "../components/layout/SubpageLayout";
import { ErrorBanner } from "../components/ErrorBanner";
import { Badge, Card, PageWrap } from "../components/ui";
import { ICON_LG, IconPodiumMedal } from "../components/icons";
import { motion } from "framer-motion";
import { fleetRoleLabel } from "../config/fleetRoles";
import { healthByRoleMap, isAgentOperational } from "../lib/fleetAgentStatus";
import { buildPodiumSlots } from "../lib/leaderboardPodium";
import {
  globalRank,
  isLastRankOnPage,
  LEADERBOARD_PAGE_SIZE,
  pageBottomReputation,
  pageTopReputation,
  rankRangeLabel,
  rankTier,
  roleRankOf,
  sortLeaderboardAgents,
  topThreeRolesForPodium,
  type RankTier,
} from "../lib/leaderboard";
import { styled } from "../stitches.config";

const SummaryGrid = styled("div", {
  display: "grid",
  gap: "$3",
  gridTemplateColumns: "repeat(2, 1fr)",
  "@md": { gridTemplateColumns: "repeat(3, 1fr)" },
  marginBottom: "$6",
});

const SummaryCell = styled("div", {
  padding: "$4 $5",
  borderRadius: "$lg",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
});

const SummaryValue = styled("div", {
  fontSize: "1.375rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
});

const SummaryLabel = styled("div", {
  fontSize: "0.6875rem",
  fontWeight: 600,
  opacity: 0.6,
  marginTop: "$1",
});

const PodiumGrid = styled("div", {
  display: "grid",
  gap: "$4",
  gridTemplateColumns: "1fr",
  "@md": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "stretch",
    gap: "$3",
  },
  marginBottom: "$5",
});

const PodiumColumn = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "$3",
  width: "100%",
  minWidth: 0,
  height: "100%",
});

const PodiumMedalWrap = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  flexShrink: 0,
  lineHeight: 0,
  variants: {
    medal: {
      gold: { filter: "drop-shadow(0 0 14px rgba(255, 196, 0, 0.35))" },
      silver: { filter: "drop-shadow(0 0 10px rgba(192, 192, 192, 0.2))" },
      bronze: { filter: "drop-shadow(0 0 10px rgba(205, 127, 50, 0.25))" },
    },
  },
});

const PodiumCardShell = styled(Card, {
  width: "100%",
  minHeight: 152,
  height: "100%",
  display: "flex",
  alignItems: "center",
  gap: "$4",
  padding: "$4 $5",
  boxSizing: "border-box",
});

const PodiumCardLink = styled(Link, {
  width: "100%",
  flex: 1,
  display: "flex",
  textDecoration: "none",
  color: "inherit",
  minWidth: 0,
});

const tierBorder: Record<RankTier, string> = {
  leader: "rgba(255, 107, 44, 0.45)",
  podium: "rgba(124, 58, 237, 0.35)",
  field: "rgba(255,255,255,0.08)",
};

const tierGlow: Record<RankTier, string | undefined> = {
  leader: "0 0 24px rgba(255, 107, 44, 0.15)",
  podium: "0 0 16px rgba(124, 58, 237, 0.1)",
  field: undefined,
};

function RankBadge({ rank, tier }: { rank: number; tier: RankTier }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    return (
      <div style={{ width: 40, display: "flex", justifyContent: "center" }}>
        <IconPodiumMedal rank={rank as 1 | 2 | 3} size={ICON_LG} />
      </div>
    );
  }
  return (
    <div style={{ fontSize: "1.125rem", fontWeight: 800, width: 40, opacity: tier === "field" ? 0.55 : 0.72, textAlign: "center" }}>
      #{rank}
    </div>
  );
}

function AgentRankCard({
  agent,
  rank,
  tier,
  operational,
  emphasize,
  lowestOnPage,
  hideRankBadge,
}: {
  agent: Agent;
  rank: number;
  tier: RankTier;
  operational: boolean;
  emphasize?: boolean;
  lowestOnPage?: boolean;
  hideRankBadge?: boolean;
}) {
  const label = fleetRoleLabel(agent.agentType);

  return (
    <Link to={`/agents/${agent.address}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Card
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          cursor: "pointer",
          borderColor: tierBorder[tier],
          boxShadow: tierGlow[tier],
          padding: emphasize ? "1.25rem 1.5rem" : undefined,
          opacity: lowestOnPage ? 0.88 : 1,
        }}
      >
        {!hideRankBadge && <RankBadge rank={rank} tier={tier} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.65, fontFamily: "monospace", marginTop: 4 }}>
            {shortAddr(agent.address)}
          </div>
          {lowestOnPage && (
            <div style={{ fontSize: "0.6875rem", opacity: 0.5, marginTop: 6 }}>lowest on this page</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: emphasize ? "1.625rem" : "1.375rem", fontWeight: 800 }}>{agent.reputation}</div>
          <div style={{ fontSize: "0.6875rem", opacity: 0.55, marginTop: 2 }}>role reputation</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: 6 }}>{formatEth(agent.stake)} role stake</div>
          <Badge status={operational ? "online" : "offline"} style={{ marginTop: 8 }}>
            {operational ? "online" : "offline"}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function PodiumCard({
  agent,
  rank,
  operational,
  medal,
}: {
  agent: Agent;
  rank: 1 | 2 | 3;
  operational: boolean;
  medal: "gold" | "silver" | "bronze";
}) {
  const tier = rankTier(rank);
  const label = fleetRoleLabel(agent.agentType);

  return (
    <PodiumColumn>
      <PodiumMedalWrap medal={medal} aria-hidden>
        <IconPodiumMedal rank={rank} size={ICON_LG} />
      </PodiumMedalWrap>
      <PodiumCardLink to={`/agents/${agent.address}`}>
        <PodiumCardShell
          style={{
            borderColor: tierBorder[tier],
            boxShadow: tierGlow[tier],
            cursor: "pointer",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.65, fontFamily: "monospace", marginTop: 4 }}>
              {shortAddr(agent.address)}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "1.375rem", fontWeight: 800 }}>{agent.reputation}</div>
            <div style={{ fontSize: "0.6875rem", opacity: 0.55, marginTop: 2 }}>role reputation</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: 6 }}>{formatEth(agent.stake)} role stake</div>
            <Badge status={operational ? "online" : "offline"} style={{ marginTop: 8 }}>
              {operational ? "online" : "offline"}
            </Badge>
          </div>
        </PodiumCardShell>
      </PodiumCardLink>
    </PodiumColumn>
  );
}

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useFetch(() => api.leaderboard(page), [page]);
  const { data: fleetHealth } = useFetch(() => api.fleetHealth(), []);

  const healthMap = useMemo(() => healthByRoleMap(fleetHealth ?? null), [fleetHealth]);
  const agents = useMemo(() => sortLeaderboardAgents(data?.data ?? []), [data?.data]);
  const total = data?.pagination.total ?? agents.length;

  const onlineOnPage = useMemo(
    () => agents.filter((a) => isAgentOperational(a, healthMap.get(a.agentType))).length,
    [agents, healthMap],
  );

  const topReputation = pageTopReputation(agents);
  const bottomReputation = pageBottomReputation(agents);

  const showPodium = page === 0 && topThreeRolesForPodium(agents).length >= 3;
  const podiumSlots = showPodium ? buildPodiumSlots(topThreeRolesForPodium(agents)) : [];
  const listAgents = agents;

  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <SubpageHero title="Leaderboard" />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$16" }}>
          <PageContentWide>
            <ErrorBanner message={error} onRetry={reload} />

            <SummaryGrid>
              <SummaryCell>
                <SummaryValue>{total || "—"}</SummaryValue>
                <SummaryLabel>wallets ranked</SummaryLabel>
              </SummaryCell>
              <SummaryCell>
                <SummaryValue>{topReputation ?? "—"}</SummaryValue>
                <SummaryLabel>{page === 0 ? "top role reputation" : "highest on page"}</SummaryLabel>
              </SummaryCell>
              <SummaryCell>
                <SummaryValue>
                  {onlineOnPage}/{agents.length || "—"}
                </SummaryValue>
                <SummaryLabel>online on page</SummaryLabel>
              </SummaryCell>
            </SummaryGrid>

            {loading && !data && <p style={{ opacity: 0.65 }}>loading...</p>}

            {!loading && total === 0 && (
              <p style={{ opacity: 0.65 }}>No agents registered yet. Rankings appear after fleet registration.</p>
            )}

            {agents.length > 0 && (
              <>
                <SectionHeading>
                  <SectionHeadingTitle>{page === 0 ? "top performers" : "lower ranks"}</SectionHeadingTitle>
                  <SectionHeadingMeta>{rankRangeLabel(page, LEADERBOARD_PAGE_SIZE, total)}</SectionHeadingMeta>
                </SectionHeading>

                {page > 0 && bottomReputation !== null && topReputation !== null && (
                  <p style={{ fontSize: "0.8125rem", opacity: 0.55, marginBottom: "$4", marginTop: 0 }}>
                    This page spans reputation {topReputation} down to {bottomReputation}.
                  </p>
                )}

                {showPodium && (
                  <PodiumGrid>
                    {podiumSlots.map(({ agent, rank, medal }) => (
                      <PodiumCard
                        key={agent.address}
                        agent={agent}
                        rank={rank}
                        medal={medal}
                        operational={isAgentOperational(agent, healthMap.get(agent.agentType))}
                      />
                    ))}
                  </PodiumGrid>
                )}

                <motion.div
                  style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                  variants={statsSequence}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                >
                  {listAgents.map((agent, i) => {
                    const rank = globalRank(page, i);
                    const roleRank = roleRankOf(agent);
                    const tier = rankTier(roleRank);
                    const operational = isAgentOperational(agent, healthMap.get(agent.agentType));
                    const lowestOnPage = isLastRankOnPage(rank, page, LEADERBOARD_PAGE_SIZE, total);

                    return (
                      <StaggerItem key={agent.address}>
                        <AgentRankCard
                          agent={agent}
                          rank={roleRank}
                          tier={tier}
                          operational={operational}
                          lowestOnPage={lowestOnPage}
                        />
                      </StaggerItem>
                    );
                  })}
                </motion.div>
              </>
            )}

            {data && data.pagination.total > LEADERBOARD_PAGE_SIZE && (
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", alignItems: "center" }}>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ opacity: page === 0 ? 0.3 : 1 }}
                >
                  previous
                </button>
                <span style={{ opacity: 0.65, fontSize: "0.875rem" }}>
                  page {page + 1} · {rankRangeLabel(page, LEADERBOARD_PAGE_SIZE, total)}
                </span>
                <button
                  disabled={(page + 1) * LEADERBOARD_PAGE_SIZE >= data.pagination.total}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ opacity: (page + 1) * LEADERBOARD_PAGE_SIZE >= data.pagination.total ? 0.3 : 1 }}
                >
                  next
                </button>
              </div>
            )}
          </PageContentWide>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
