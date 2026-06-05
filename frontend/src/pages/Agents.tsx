import { Link } from "react-router-dom";
import { useState } from "react";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { OperatorFleetView } from "../components/fleet/OperatorFleetView";
import { motion } from "framer-motion";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { ErrorBanner } from "../components/ErrorBanner";
import { Badge, Card, Grid, PageWrap, Heading } from "../components/ui";
import { IconAgent, ICON_LG } from "../components/icons";
import { GlassFilterPill, GlassPageBand } from "../components/GlassPanel";

const TYPES = ["", "ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"];

function GuestFleetGrid() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const { data, loading, error, reload } = useFetch(() => api.agents(page, 20, type || undefined), [page, type]);
  const { data: fleetHealth } = useFetch(() => api.fleetHealth(), []);

  return (
    <>
      <ErrorBanner message={error} onRetry={reload} />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "2.5rem", flexWrap: "wrap" }}>
        {TYPES.map((t) => (
          <GlassFilterPill key={t || "all"} type="button" active={type === t} onClick={() => { setType(t); setPage(0); }}>
            {t || "All types"}
          </GlassFilterPill>
        ))}
      </div>

      {loading && <p style={{ marginTop: "2rem", opacity: 0.72 }}>Loading fleet…</p>}

      <Grid cols={3} style={{ marginTop: "2rem" }} as={motion.div} variants={statsSequence} initial="hidden" whileInView="show" viewport={viewportOnce}>
          {(data?.data.length ? data.data : (fleetHealth?.agents ?? []).map((a) => ({
            address: a.address ?? "",
            agentType: a.role,
            stake: "0",
            reputation: 100,
            online: a.online,
            lastHeartbeat: new Date().toISOString(),
          }))).filter((a) => a.address).map((agent) => (
            <StaggerItem key={agent.address} style={{ height: "100%" }}>
              <Link to={`/agents/${agent.address}`} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
                <Card style={{ cursor: "pointer", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <IconAgent size={ICON_LG} />
                    <Badge status={agent.online ? "online" : "offline"}>{agent.online ? "Online" : "Offline"}</Badge>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: "1rem" }}>{agent.agentType}</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.72, fontFamily: "monospace" }}>{shortAddr(agent.address)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.875rem" }}>
                    <span>
                      Rep <strong>{agent.reputation}</strong>
                    </span>
                    <span>{formatEth(agent.stake)}</span>
                  </div>
                </Card>
              </Link>
            </StaggerItem>
          ))}
      </Grid>

      {data && data.pagination.total > 20 && (
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center" }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
            Prev
          </button>
          <span style={{ opacity: 0.72 }}>Page {page + 1}</span>
          <button
            disabled={(page + 1) * 20 >= data.pagination.total}
            onClick={() => setPage((p) => p + 1)}
            style={{ opacity: (page + 1) * 20 >= data.pagination.total ? 0.3 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

export default function AgentsPage() {
  const { signedIn } = useSignedIn();

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      <PageMotion>
        <AnimatedPageHero>
          {signedIn && (
            <HeroItem>
              <Badge accent>Agent Fleet</Badge>
            </HeroItem>
          )}
          <HeroItem>
            <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: signedIn ? "1rem" : 0 }}>Agent fleet</Heading>
          </HeroItem>
          {!signedIn && (
            <HeroItem>
              <p style={{ marginTop: "0.75rem", opacity: 0.72, maxWidth: 420, lineHeight: 1.6 }}>
                Five agents on Somnia. Sign in for live status.
              </p>
            </HeroItem>
          )}
        </AnimatedPageHero>

        {signedIn ? (
          <GlassPageBand css={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
            <OperatorFleetView />
          </GlassPageBand>
        ) : (
          <AnimatedSection style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
            <GuestFleetGrid />
          </AnimatedSection>
        )}
      </PageMotion>
    </PageWrap>
  );
}
