import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { api, formatEth, shortAddr } from "../api/client";
import { useFetch } from "../api/hooks";
import { PageHero } from "../components/PageHero";
import { Badge, Card, PageWrap, Section } from "../components/ui";
import { IconArrowLeft, IconCoalition, ICON_LG, ICON_SM } from "../components/icons";
import { spring } from "../stitches.config";

export default function CoalitionDetailPage() {
  const { addr } = useParams<{ addr: string }>();
  const { data: coalition, loading } = useFetch(() => api.coalition(addr!), [addr]);

  if (loading) {
    return (
      <PageWrap>
        <PageHero>
          <p style={{ opacity: 0.72 }}>Loading coalition</p>
        </PageHero>
      </PageWrap>
    );
  }
  if (!coalition) {
    return (
      <PageWrap>
        <PageHero>
          <p style={{ opacity: 0.72 }}>Coalition not found</p>
        </PageHero>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <PageHero>
        <Link to="/tasks" style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.72, fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          <IconArrowLeft size={ICON_SM} /> Back to tasks
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <IconCoalition size={ICON_LG} />
          <Badge status={coalition.dissolved ? "offline" : "online"}>{coalition.dissolved ? "Dissolved" : "Active"}</Badge>
        </div>
        <h1 style={{ fontSize: "clamp(1.125rem, 3vw, 1.5rem)", fontWeight: 800, marginTop: "1rem", fontFamily: "monospace", wordBreak: "break-all" }}>
          {coalition.address}
        </h1>
      </PageHero>

      <Section style={{ paddingTop: "2.5rem" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <Card style={{ marginTop: "2rem" }}>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <div style={{ opacity: 0.72, fontSize: "0.75rem" }}>Lead agent</div>
                <Link to={`/agents/${coalition.leadAgent}`} style={{ fontWeight: 600, textDecoration: "underline" }}>{shortAddr(coalition.leadAgent)}</Link>
              </div>
              <div>
                <div style={{ opacity: 0.72, fontSize: "0.75rem" }}>Task</div>
                <div style={{ fontWeight: 600 }}>#{coalition.taskId}</div>
              </div>
              <div>
                <div style={{ opacity: 0.72, fontSize: "0.75rem" }}>Total stake</div>
                <div style={{ fontWeight: 600 }}>{formatEth(coalition.totalStake)}</div>
              </div>
              <div>
                <div style={{ opacity: 0.72, fontSize: "0.75rem" }}>Formed</div>
                <div style={{ fontWeight: 600 }}>{new Date(coalition.formed).toLocaleString()}</div>
              </div>
            </div>
          </Card>

          <h2 style={{ fontWeight: 700, marginTop: "2rem", marginBottom: "1rem" }}>Members ({coalition.members.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {coalition.members.map((m, i) => (
              <motion.div key={m} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }}>
                <Link to={`/agents/${m}`}>
                  <Card style={{ padding: "1rem 1.5rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{m}</span>
                    {m === coalition.leadAgent && <Badge accent style={{ marginLeft: 12 }}>Lead</Badge>}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>
    </PageWrap>
  );
}
