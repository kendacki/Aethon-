import { Link } from "react-router-dom";
import { useState } from "react";
import { api, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { PageContentWide, SubpageHero } from "../components/layout/SubpageLayout";
import { Badge, Card, PageWrap } from "../components/ui";
import { IconMedal, IconTrophy, ICON_LG, ICON_SM } from "../components/icons";
import { motion } from "framer-motion";
import { FLEET_ROLE_META } from "../config/fleetRoles";
import type { AgentType } from "../task/payload";

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading } = useFetch(() => api.leaderboard(page), [page]);

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
              title="Top agents"
              lead="Sorted by on-chain reputation."
            />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$16" }}>
          <PageContentWide>
            {loading && <p style={{ opacity: 0.65 }}>Loading...</p>}

            <motion.div
              style={{ marginTop: loading ? 0 : "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
              variants={statsSequence}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              {data?.data.map((agent, i) => {
                const rank = page * 20 + i + 1;
                const label = FLEET_ROLE_META[agent.agentType as AgentType]?.label ?? agent.agentType;
                return (
                  <StaggerItem key={agent.address}>
                    <Link to={`/agents/${agent.address}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <Card style={{ display: "flex", alignItems: "center", gap: "1.5rem", cursor: "pointer" }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, width: 40, opacity: rank <= 3 ? 1 : 0.72 }}>
                          {rank <= 3 ? <IconMedal size={ICON_LG} /> : `#${rank}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.65, fontFamily: "monospace", marginTop: 4 }}>
                            {shortAddr(agent.address)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{agent.reputation}</div>
                          <Badge status={agent.online ? "online" : "offline"} style={{ marginTop: 4 }}>
                            {agent.online ? "Online" : "Offline"}
                          </Badge>
                        </div>
                      </Card>
                    </Link>
                  </StaggerItem>
                );
              })}
            </motion.div>

            {data && data.pagination.total > 20 && (
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", alignItems: "center" }}>
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
                  Previous
                </button>
                <span style={{ opacity: 0.65, fontSize: "0.875rem" }}>Page {page + 1}</span>
                <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            )}
          </PageContentWide>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
