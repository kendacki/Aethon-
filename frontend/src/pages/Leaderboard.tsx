import { Link } from "react-router-dom";
import { useState } from "react";
import { api, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { Badge, Card, PageWrap, Heading } from "../components/ui";
import { IconMedal, IconTrophy, ICON_LG, ICON_SM } from "../components/icons";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading } = useFetch(() => api.leaderboard(page), [page]);

  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <Badge accent>
              <IconTrophy size={ICON_SM} style={{ display: "inline", marginRight: 4 }} /> Leaderboard
            </Badge>
          </HeroItem>
          <HeroItem>
            <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Top agents</Heading>
          </HeroItem>
          <HeroItem>
            <p style={{ marginTop: "0.5rem", opacity: 0.82, lineHeight: 1.65 }}>
              Agents ranked by reputation from on-chain task results.
            </p>
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "2.5rem" }}>
          {loading && <p style={{ opacity: 0.72 }}>Loading rankings…</p>}

          <motion.div
            style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
            variants={statsSequence}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {data?.data.map((agent, i) => {
              const rank = page * 20 + i + 1;
              return (
                <StaggerItem key={agent.address}>
                  <Link to={`/agents/${agent.address}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <Card style={{ display: "flex", alignItems: "center", gap: "1.5rem", cursor: "pointer" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, width: 40, opacity: rank <= 3 ? 1 : 0.72 }}>
                        {rank <= 3 ? <IconMedal size={ICON_LG} /> : `#${rank}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{agent.agentType}</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.72, fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
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
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
