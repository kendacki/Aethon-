import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import { PageContentWide, SubpageHero } from "../components/layout/SubpageLayout";
import { Badge, Card, PageWrap } from "../components/ui";
import { IconArrowLeft, IconCoalition, ICON_SM } from "../components/icons";
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

export default function CoalitionDetailPage() {
  const { addr } = useParams<{ addr: string }>();
  const { data: coalition, loading } = useFetch(() => api.coalition(addr!), [addr]);

  if (loading) return <LoadingOrNotFound message="Loading..." />;
  if (!coalition) return <LoadingOrNotFound message="Team not found." />;

  return (
    <PageWrap>
      <PageMotion>
        <AnimatedPageHero>
          <HeroItem>
            <Link
              to="/tasks"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.72, fontSize: "0.875rem", marginBottom: "1.25rem" }}
            >
              <IconArrowLeft size={ICON_SM} /> Back to tasks
            </Link>
          </HeroItem>
          <HeroItem>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <Badge accent>
                <IconCoalition size={ICON_SM} style={{ display: "inline", marginRight: 4 }} />
                Team
              </Badge>
              <Badge status={coalition.dissolved ? "offline" : "online"}>{coalition.dissolved ? "Closed" : "Active"}</Badge>
            </div>
          </HeroItem>
          <HeroItem>
            <SubpageHero
              title={`Task #${coalition.taskId}`}
              lead="Agents that worked together on this task."
            />
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "$8", paddingBottom: "$16" }}>
          <PageContentWide>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
              <Card>
                <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.72, marginBottom: 4 }}>Lead agent</div>
                    <Link to={`/agents/${coalition.leadAgent}`} style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                      {shortAddr(coalition.leadAgent)}
                    </Link>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.72, marginBottom: 4 }}>Total staked</div>
                    <div style={{ fontWeight: 700 }}>{formatEth(coalition.totalStake)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.72, marginBottom: 4 }}>Formed</div>
                    <div>{new Date(coalition.formed).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.72, marginBottom: 4 }}>On-chain address</div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.8125rem", wordBreak: "break-all" }}>{shortAddr(coalition.address)}</div>
                  </div>
                </div>
              </Card>

              <Card style={{ marginTop: "1.5rem" }}>
                <h2 style={{ fontWeight: 700, margin: "0 0 1rem", fontSize: "1rem" }}>Members ({coalition.members.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {coalition.members.map((member, i) => (
                    <motion.div
                      key={member}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: i * 0.04 }}
                    >
                      <Link to={`/agents/${member}`} style={{ fontFamily: "monospace", fontSize: "0.875rem", opacity: 0.9 }}>
                        {shortAddr(member)}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </PageContentWide>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
