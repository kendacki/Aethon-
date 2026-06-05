import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import { PageContentWide, SubpageHero } from "../components/layout/SubpageLayout";
import { Badge, Card, Grid, PageWrap, StatValue } from "../components/ui";
import { IconArrowLeft, IconTrend, ICON_LG, ICON_SM } from "../components/icons";
import { FLEET_ROLE_META, workerStatusLabel } from "../config/fleetRoles";
import type { AgentType } from "../task/payload";
import { spring } from "../stitches.config";

function LoadingOrNotFound({ message }: { message: string }) {
  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <p style={{ opacity: 0.72 }}>{message}</p>
          </HeroItem>
        </AnimatedPageHero>
      </PageMotion>
    </PageWrap>
  );
}

export default function AgentDetailPage() {
  const { addr } = useParams<{ addr: string }>();
  const { data: agent, loading } = useFetch(() => api.agent(addr!), [addr]);
  const { data: rep } = useFetch(() => api.reputation(addr!), [addr]);
  const { data: health } = useFetch(() => api.agentHealth(addr!), [addr]);

  if (loading) return <LoadingOrNotFound message="Loading..." />;
  if (!agent) return <LoadingOrNotFound message="Agent not found." />;

  const roleLabel = FLEET_ROLE_META[agent.agentType as AgentType]?.label ?? agent.agentType;

  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <Link
              to="/agents"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.72, fontSize: "0.875rem", marginBottom: "1.25rem" }}
            >
              <IconArrowLeft size={ICON_SM} /> Back to fleet
            </Link>
          </HeroItem>
          <HeroItem>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <Badge accent>{roleLabel}</Badge>
              <Badge status={agent.online ? "online" : "offline"}>{agent.online ? "online" : "offline"}</Badge>
              {health && health.status !== "UNKNOWN" && (
                <Badge
                  status={health.status === "HEALTHY" ? "online" : health.status === "DEGRADED" ? undefined : "offline"}
                  accent={health.status === "DEGRADED"}
                >
                  {workerStatusLabel(health.status)}
                </Badge>
              )}
            </div>
          </HeroItem>
          <HeroItem>
            <SubpageHero title={shortAddr(agent.address)} lead={FLEET_ROLE_META[agent.agentType as AgentType]?.description} />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$16" }}>
          <PageContentWide>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <Grid cols={3}>
                <Card>
                  <StatValue>{rep?.score ?? agent.reputation}</StatValue>
                  <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 8 }}>Reputation</div>
                </Card>
                <Card>
                  <StatValue style={{ fontSize: "1.75rem" }}>{formatEth(agent.stake)}</StatValue>
                  <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 8 }}>Staked</div>
                </Card>
                <Card>
                  <div style={{ fontSize: "0.875rem", opacity: 0.72 }}>Last check in</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{new Date(agent.lastHeartbeat).toLocaleString()}</div>
                </Card>
              </Grid>

              {rep && rep.history.length > 0 && (
                <Card style={{ marginTop: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                    <IconTrend size={ICON_LG} />
                    <h2 style={{ fontWeight: 700, margin: 0 }}>Reputation history</h2>
                  </div>
                  {rep.history.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: i * 0.03 }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        padding: "0.75rem 0",
                        borderBottom: "1px solid $glassDivider",
                        fontSize: "0.875rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: "8rem" }}>{h.reason}</span>
                      <span>
                        {h.oldScore} to <strong>{h.newScore}</strong>
                      </span>
                      <span style={{ opacity: 0.6 }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </motion.div>
                  ))}
                </Card>
              )}
            </motion.div>
          </PageContentWide>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
