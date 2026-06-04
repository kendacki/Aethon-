import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { AnimatedPageHero, AnimatedSection, HeroItem, PageMotion } from "../components/motion/PageMotion";
import { Badge, Card, PageWrap } from "../components/ui";
import { IconArrowLeft, IconCoalition, ICON_LG, ICON_SM } from "../components/icons";
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

  if (loading) return <LoadingOrNotFound message="Loading coalition…" />;
  if (!coalition) return <LoadingOrNotFound message="Coalition not found" />;

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
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <IconCoalition size={ICON_LG} />
              <Badge status={coalition.dissolved ? "offline" : "online"}>{coalition.dissolved ? "Dissolved" : "Active"}</Badge>
            </div>
          </HeroItem>
          <HeroItem>
            <h1
              style={{
                fontSize: "clamp(1.125rem, 3vw, 1.5rem)",
                fontWeight: 800,
                marginTop: "1rem",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {coalition.address}
            </h1>
          </HeroItem>
        </AnimatedPageHero>

        <AnimatedSection style={{ paddingTop: "2.5rem" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Card style={{ marginTop: "2rem" }}>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>Task ID</div>
                  <div style={{ fontWeight: 700 }}>#{coalition.taskId}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>Lead agent</div>
                  <Link to={`/agents/${coalition.leadAgent}`} style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                    {shortAddr(coalition.leadAgent)}
                  </Link>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>Total stake</div>
                  <div style={{ fontWeight: 700 }}>{formatEth(coalition.totalStake)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.72 }}>Formed</div>
                  <div>{new Date(coalition.formed).toLocaleString()}</div>
                </div>
              </div>
            </Card>

            <Card style={{ marginTop: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, marginBottom: "1rem" }}>Members ({coalition.members.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {coalition.members.map((member, i) => (
                  <motion.div
                    key={member}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: i * 0.04 }}
                  >
                    <Link to={`/agents/${member}`} style={{ fontFamily: "monospace", fontSize: "0.875rem", opacity: 0.9 }}>
                      {member}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </AnimatedSection>
      </PageMotion>
    </PageWrap>
  );
}
