import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { api, formatEth, shortAddr, type Agent } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { PageContentWide, SectionHeading, SectionHeadingMeta, SectionHeadingTitle, SubpageHero } from "../components/layout/SubpageLayout";
import { ErrorBanner } from "../components/ErrorBanner";
import { Badge, Card, PageWrap } from "../components/ui";
import { IconMedal, IconTrophy, ICON_LG, ICON_SM } from "../components/icons";
import { motion } from "framer-motion";
import { fleetRoleLabel } from "../config/fleetRoles";
import { healthByRoleMap, isAgentOperational } from "../lib/fleetAgentStatus";
import {
  globalRank,
  isLastRankOnPage,
  LEADERBOARD_PAGE_SIZE,
  pageBottomReputation,
  pageTopReputation,
  rankRangeLabel,
  rankTier,
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
  gap: "$3",
  gridTemplateColumns: "1fr",
  "@md": { gridTemplateColumns: "1fr 1.15fr 1fr", alignItems: "end" },
  marginBottom: "$5",
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
  if (rank <= 3) {
    return (
      <div style={{ fontSize: "1.5rem", fontWeight: 800, width: 40, display: "flex", justifyContent: "center" }}>
        <IconMedal size={ICON_LG} />
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
}: {
  agent: Agent;
  rank: number;
  tier: RankTier;
  operational: boolean;
  emphasize?: boolean;
  lowestOnPage?: boolean;
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
        <RankBadge rank={rank} tier={tier} />
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
          <div style={{ fontSize: "0.6875rem", opacity: 0.55, marginTop: 2 }}>reputation</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: 6 }}>{formatEth(agent.stake)}</div>
          <Badge status={operational ? "online" : "offline"} style={{ marginTop: 8 }}>
            {operational ? "online" : "offline"}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function PodiumCard({ agent, rank, operational }: { agent: Agent; rank: number; operational: boolean }) {
  const tier = rankTier(rank);
  const emphasize = rank === 1;
  return (
    <AgentRankCard
      agent={agent}
      rank={rank}
      tier={tier}
      operational={operational}
      emphasize={emphasize}
    />
  );
}

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useFetch(() => api.leaderboard(page), [page]);
  const { data: fleetHealth } = useFetch(() => api.fleetHealth(), []);

  const healthMap = useMemo(() => healthByRoleMap(fleetHealth ?? null), [fleetHealth]);
  const agents = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  const onlineOnPage = useMemo(
    () => agents.filter((a) => isAgentOperational(a, healthMap.get(a.agentType))).length,
    [agents, healthMap],
  );

  const topReputation = pageTopReputation(agents);
  const bottomReputation = pageBottomReputation(agents);

  const showPodium = page === 0 && agents.length >= 3;
  const podiumAgents = showPodium ? agents.slice(0, 3) : [];
  const listAgents = showPodium ? agents.slice(3) : agents;
  const listOffset = showPodium ? 3 : 0;

  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <SubpageHero
              badge={
                <Badge accent>
                  <IconTrophy size={ICON_SM} style={{ display: "inline", marginRight: 4 }} />
                  Rankings
                </Badge>
              }
              title="Leaderboard"
              lead="Rank 1 is the highest on-chain reputation. Lower ranks appear further down the list."
            />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$16" }}>
          <PageContentWide>
            <ErrorBanner message={error} onRetry={reload} />

            <SummaryGrid>
              <SummaryCell>
                <SummaryValue>{total || "—"}</SummaryValue>
                <SummaryLabel>agents ranked</SummaryLabel>
              </SummaryCell>
              <SummaryCell>
                <SummaryValue>{topReputation ?? "—"}</SummaryValue>
                <SummaryLabel>{page === 0 ? "top reputation" : "highest on page"}</SummaryLabel>
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
                    {[podiumAgents[1], podiumAgents[0], podiumAgents[2]].filter(Boolean).map((agent) => {
                      const index = agents.indexOf(agent);
                      const rank = globalRank(page, index);
                      return (
                        <PodiumCard
                          key={agent.address}
                          agent={agent}
                          rank={rank}
                          operational={isAgentOperational(agent, healthMap.get(agent.agentType))}
                        />
                      );
                    })}
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
                    const index = listOffset + i;
                    const rank = globalRank(page, index);
                    const tier = rankTier(rank);
                    const operational = isAgentOperational(agent, healthMap.get(agent.agentType));
                    const lowestOnPage = isLastRankOnPage(rank, page, LEADERBOARD_PAGE_SIZE, total);

                    return (
                      <StaggerItem key={agent.address}>
                        <AgentRankCard
                          agent={agent}
                          rank={rank}
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
