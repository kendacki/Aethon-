import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { ErrorBanner } from "../components/ErrorBanner";
import { FleetHealthPanel } from "../components/FleetHealthPanel";
import { Badge, Card, Grid, PageWrap, Section, Heading } from "../components/ui";
import { IconAgent, ICON_LG } from "../components/icons";
import { spring } from "../stitches.config";

const TYPES = ["", "ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];
const HEALTH_POLL_MS = 15_000;

const filterBtn = (active: boolean) => ({
  padding: "0.5rem 1rem",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
  color: "#FFFFFF",
  border: `1px solid ${active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}`,
});

export default function AgentsPage() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const { data, loading, error, reload } = useFetch(() => api.agents(page, 20, type || undefined), [page, type]);
  const {
    data: fleet,
    loading: fleetLoading,
    reload: reloadFleet,
  } = useFetch(() => api.fleetHealth(), []);

  useEffect(() => {
    const timer = setInterval(() => reloadFleet(), HEALTH_POLL_MS);
    return () => clearInterval(timer);
  }, [reloadFleet]);

  return (
    <PageWrap>
      <Section>
        <Badge accent>Agent Fleet</Badge>
        <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Agent fleet</Heading>
        <p style={{ marginTop: "0.5rem", opacity: 0.82, maxWidth: 560 }}>
          Five agents on Somnia testnet. Each one stakes, finds peers, and runs tasks on its own. Health updates every 15
          seconds.
        </p>

        <ErrorBanner message={error} onRetry={reload} />

        <FleetHealthPanel fleet={fleet} loading={fleetLoading} />

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button key={t || "all"} onClick={() => { setType(t); setPage(0); }} style={filterBtn(type === t)}>
              {t || "All Types"}
            </button>
          ))}
        </div>

        {loading && <p style={{ marginTop: "2rem", opacity: 0.72 }}>Loading fleet</p>}

        <Grid cols={3} style={{ marginTop: "2rem" }}>
          {data?.data.map((agent, i) => {
            const worker = fleet?.agents.find(
              (h) => h.address?.toLowerCase() === agent.address.toLowerCase() || h.role === agent.agentType,
            );
            const showWorkerStatus = worker && worker.status !== "UNKNOWN";

            return (
              <motion.div key={agent.address} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
                <Link to={`/agents/${agent.address}`}>
                  <Card style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <IconAgent size={ICON_LG} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <Badge status={agent.online ? "online" : "offline"}>{agent.online ? "Online" : "Offline"}</Badge>
                        {showWorkerStatus && (
                          <Badge
                            status={worker!.status === "HEALTHY" ? "online" : worker!.status === "DEGRADED" ? undefined : "offline"}
                            accent={worker!.status === "DEGRADED"}
                            style={{ fontSize: "0.625rem" }}
                          >
                            {worker!.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, marginTop: "1rem" }}>{agent.agentType}</div>
                    <div style={{ fontSize: "0.875rem", opacity: 0.72, fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.875rem" }}>
                      <span>Rep <strong>{agent.reputation}</strong></span>
                      <span>{formatEth(agent.stake)}</span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </Grid>

        {data && data.pagination.total > 20 && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>Prev</button>
            <span style={{ opacity: 0.72 }}>Page {page + 1}</span>
            <button disabled={(page + 1) * 20 >= data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </Section>
    </PageWrap>
  );
}
