import { Link } from "react-router-dom";
import { useState } from "react";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { useSignedIn } from "../auth/useSignedIn";
import { OperatorFleetView } from "../components/fleet/OperatorFleetView";
import { motion } from "framer-motion";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion, StaggerItem, statsSequence, viewportOnce } from "../components/motion/PageMotion";
import { PageContentWide, SubpageHero } from "../components/layout/SubpageLayout";
import { ErrorBanner } from "../components/ErrorBanner";
import { Badge, Card, Grid, PageWrap } from "../components/ui";
import { IconAgent, ICON_LG } from "../components/icons";
import { GlassFilterPill, GlassPageBand } from "../components/GlassPanel";
import { FLEET_ROLE_META } from "../config/fleetRoles";
import type { AgentType } from "../task/payload";

const TYPES = ["", "ARBITRAGE", "ORACLE", "YIELD_OPT", "GOVERNANCE", "RISK_MGMT"] as const;

function roleLabel(type: string): string {
  if (!type) return "All roles";
  return FLEET_ROLE_META[type as AgentType]?.label ?? type;
}

function GuestFleetGrid() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const { data, loading, error, reload } = useFetch(() => api.agents(page, 20, type || undefined), [page, type]);
  const { data: fleetHealth } = useFetch(() => api.fleetHealth(), []);

  return (
    <PageContentWide>
      <ErrorBanner message={error} onRetry={reload} />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "$6", flexWrap: "wrap" }}>
        {TYPES.map((t) => (
          <GlassFilterPill key={t || "all"} type="button" active={type === t} onClick={() => { setType(t); setPage(0); }}>
            {roleLabel(t)}
          </GlassFilterPill>
        ))}
      </div>

      {loading && <p style={{ marginTop: "2rem", opacity: 0.65 }}>Loading...</p>}

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
                <div style={{ fontWeight: 700, marginTop: "1rem" }}>{roleLabel(agent.agentType)}</div>
                <div style={{ fontSize: "0.875rem", opacity: 0.65, fontFamily: "monospace", marginTop: 4 }}>{shortAddr(agent.address)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem", fontSize: "0.875rem" }}>
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
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 0 ? 0.3 : 1 }}>
            Previous
          </button>
          <span style={{ opacity: 0.65, fontSize: "0.875rem" }}>Page {page + 1}</span>
          <button
            disabled={(page + 1) * 20 >= data.pagination.total}
            onClick={() => setPage((p) => p + 1)}
            style={{ opacity: (page + 1) * 20 >= data.pagination.total ? 0.3 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </PageContentWide>
  );
}

export default function AgentsPage() {
  const { signedIn } = useSignedIn();

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <SubpageHero
              badge={<Badge accent>Fleet</Badge>}
              title="Agents"
              lead={signedIn ? undefined : "Five specialists on Somnia. Sign in for live status."}
            />
          </HeroItem>
        </AnimatedPageHero>

        {signedIn ? (
          <GlassPageBand css={{ paddingTop: "$6", paddingBottom: "$16" }}>
            <PageContentWide>
              <OperatorFleetView />
            </PageContentWide>
          </GlassPageBand>
        ) : (
          <AnimatedSection style={{ paddingTop: "$6", paddingBottom: "$16" }}>
            <GuestFleetGrid />
          </AnimatedSection>
        )}
      </PageMotion>
    </PageWrap>
  );
}
