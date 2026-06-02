import { motion } from "framer-motion";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { PageHero } from "../components/PageHero";
import { Badge, Card, Grid, PageWrap, Section, Heading, StatValue } from "../components/ui";
import { IconAlert, IconClock, IconShield, ICON_LG, ICON_SM, ICON_XL } from "../components/icons";
import { ErrorBanner } from "../components/ErrorBanner";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { useState, useEffect } from "react";

export default function GovernancePage() {
  const { data: cb, loading, error, reload } = useFetch(() => api.circuitBreaker(), []);
  const { data: health } = useFetch(() => api.health(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") {
      setToast("Circuit breaker on. All work paused.");
      reload();
    }
    if (lastEvent?.type === "CIRCUIT_RESET") {
      setToast("Circuit reset. System running again.");
      reload();
    }
  }, [lastEvent, reload]);

  return (
    <PageWrap>
      <PageHero>
        <Badge accent>
          <IconShield size={ICON_SM} style={{ display: "inline", marginRight: 4 }} />
          Governance
        </Badge>
        <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Safety</Heading>
        <p style={{ marginTop: "0.5rem", maxWidth: 560, opacity: 0.82, lineHeight: 1.65 }}>
          The guardian wallet can reset the circuit after a one hour wait. Three failed tasks in a row pause the system.
        </p>
      </PageHero>

      <Section style={{ paddingTop: "2.5rem" }}>
        <ErrorBanner message={error} onRetry={reload} />

        {loading && <p style={{ marginTop: "2rem" }}>Loading</p>}

        {cb && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Card style={{ marginTop: "2rem", borderColor: cb.paused ? "rgba(255,255,255,0.4)" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {cb.paused ? <IconAlert size={ICON_XL} /> : <IconShield size={ICON_XL} />}
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{cb.paused ? "System paused" : "System running"}</div>
                  <div style={{ opacity: 0.72, fontSize: "0.875rem" }}>
                    {cb.paused ? "Waiting for guardian reset." : "All contracts are active"}
                  </div>
                </div>
              </div>
            </Card>

            <Grid cols={3} style={{ marginTop: "2rem" }}>
              <Card>
                <StatValue style={{ fontSize: "2rem" }}>{cb.consecutiveFailures}/{cb.threshold}</StatValue>
                <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 8 }}>Failed tasks</div>
              </Card>
              <Card>
                <IconClock size={ICON_LG} style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{cb.resetTimelockSeconds / 3600}h</div>
                <div style={{ opacity: 0.72, fontSize: "0.875rem", marginTop: 4 }}>Reset wait time</div>
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", opacity: 0.72 }}>Guardian wallet</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", marginTop: 8, wordBreak: "break-all" }}>
                  0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6
                </div>
              </Card>
            </Grid>

            <Card style={{ marginTop: "2rem" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Security</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {[
                  "All audit findings resolved",
                  "All attack simulations blocked",
                  "Reputation changes require authorized contracts",
                  "Only approved parties can dissolve coalitions",
                  "Platform fees go to treasury",
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }} style={{ fontSize: "0.875rem", opacity: 0.82, display: "flex", gap: 8 }}>
                    <span>✓</span> {item}
                  </motion.div>
                ))}
              </div>
            </Card>

            {health && (
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Badge status={health.database ? "online" : "offline"}>DB {health.database ? "OK" : "Down"}</Badge>
                <Badge>Indexed block {health.lastIndexedBlock?.toLocaleString()}</Badge>
              </div>
            )}
          </motion.div>
        )}
      </Section>
      <Notification message={toast} onClose={() => setToast("")} />
    </PageWrap>
  );
}
