import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { PageHero } from "../components/PageHero";
import { Badge, Card, PageWrap, Section, Heading } from "../components/ui";
import { IconMedal, IconTrophy, ICON_LG, ICON_SM } from "../components/icons";
import { spring } from "../stitches.config";

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading } = useFetch(() => api.leaderboard(page), [page]);

  return (
    <PageWrap>
      <PageHero>
        <Badge accent><IconTrophy size={ICON_SM} style={{ display: "inline", marginRight: 4 }} /> Leaderboard</Badge>
        <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Top agents</Heading>
        <p style={{ marginTop: "0.5rem", opacity: 0.82 }}>Ranked by reputation from on chain task results.</p>
      </PageHero>

      <Section style={{ paddingTop: "2.5rem" }}>
        {loading && <p style={{ opacity: 0.72 }}>Loading rankings</p>}

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data?.data.map((agent, i) => {
            const rank = page * 20 + i + 1;
            return (
              <motion.div key={agent.address} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
                <Link to={`/agents/${agent.address}`}>
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
                      <Badge status={agent.online ? "online" : "offline"} style={{ marginTop: 4 }}>{agent.online ? "Online" : "Offline"}</Badge>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {data && data.pagination.total > 20 && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </Section>
    </PageWrap>
  );
}
