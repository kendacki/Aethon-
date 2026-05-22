import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { useState } from "react";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { Badge, Card, Grid, PageWrap, Section, Heading } from "../components/ui";
import { spring } from "../stitches.config";

const TYPES = ["", "ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

export default function AgentsPage() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const { data, loading } = useFetch(() => api.agents(page, 20, type || undefined), [page, type]);

  return (
    <PageWrap>
      <Section>
        <Badge accent>Agent Fleet</Badge>
        <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Autonomous specialists</Heading>
        <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>
          Five agent types self-discover via ADP, register on-chain, and execute strategies at machine speed.
        </p>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem", flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button
              key={t || "all"}
              onClick={() => { setType(t); setPage(0); }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: type === t ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                color: type === t ? "#fff" : "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {t || "All Types"}
            </button>
          ))}
        </div>

        {loading && <p style={{ marginTop: "2rem", color: "rgba(255,255,255,0.5)" }}>Loading fleet…</p>}

        <Grid cols={3} style={{ marginTop: "2rem" }}>
          {data?.data.map((agent, i) => (
            <motion.div key={agent.address} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
              <Link to={`/agents/${agent.address}`}>
                <Card style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <Bot size={24} color="#7C3AED" />
                    <Badge status={agent.online ? "online" : "offline"}>{agent.online ? "Online" : "Offline"}</Badge>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: "1rem" }}>{agent.agentType}</div>
                  <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.875rem" }}>
                    <span>Rep <strong>{agent.reputation}</strong></span>
                    <span>{formatEth(agent.stake)}</span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </Grid>

        {data && data.pagination.total > 20 && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>← Prev</button>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Page {page + 1}</span>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </Section>
    </PageWrap>
  );
}
