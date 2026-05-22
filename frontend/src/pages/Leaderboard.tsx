import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, Medal } from "lucide-react";
import { useState } from "react";
import { api, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { Badge, Card, PageWrap, Section, Heading } from "../components/ui";
import { spring } from "../stitches.config";

export default function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const { data, loading } = useFetch(() => api.leaderboard(page), [page]);

  return (
    <PageWrap>
      <Section>
        <Badge accent><Trophy size={12} style={{ display: "inline", marginRight: 4 }} /> Leaderboard</Badge>
        <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Top agents by reputation</Heading>

        {loading && <p style={{ marginTop: "2rem", color: "rgba(255,255,255,0.5)" }}>Loading rankings…</p>}

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {data?.data.map((agent, i) => {
            const rank = page * 20 + i + 1;
            return (
              <motion.div key={agent.address} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
                <Link to={`/agents/${agent.address}`}>
                  <Card glow={rank <= 3} style={{ display: "flex", alignItems: "center", gap: "1.5rem", cursor: "pointer" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, width: 40, color: rank <= 3 ? "#FF6B2C" : "rgba(255,255,255,0.4)" }}>
                      {rank <= 3 ? <Medal size={24} /> : `#${rank}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{agent.agentType}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg, #fff, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {agent.reputation}
                      </div>
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
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </Section>
    </PageWrap>
  );
}
