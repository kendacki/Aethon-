import { motion } from "framer-motion";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { Badge, Card, Grid, PageWrap, Section, Heading, StatValue } from "../components/ui";
import { Notification } from "../components/Layout";
import { spring } from "../stitches.config";
import { useState, useEffect } from "react";

export default function GovernancePage() {
  const { data: cb, loading, reload } = useFetch(() => api.circuitBreaker(), []);
  const { data: health } = useFetch(() => api.health(), []);
  const { lastEvent } = useWebSocket(["circuit_breaker"]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (lastEvent?.type === "CIRCUIT_BREAK") {
      setToast("Circuit breaker triggered — all operations halted");
      reload();
    }
    if (lastEvent?.type === "CIRCUIT_RESET") {
      setToast("Guardian reset circuit — 1h timelock enforced");
      reload();
    }
  }, [lastEvent, reload]);

  return (
    <PageWrap>
      <Section>
        <Badge accent={cb?.paused ? "orange" : true}>
          <Shield size={12} style={{ display: "inline", marginRight: 4 }} />
          Governance
        </Badge>
        <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Circuit breaker & guardian</Heading>
        <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.5rem", maxWidth: 560 }}>
          The guardian multisig controls circuit reset after a 1-hour timelock. Three consecutive task failures trigger a system-wide halt.
        </p>

        {loading && <p style={{ marginTop: "2rem" }}>Loading…</p>}

        {cb && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Card glow={cb.paused ? "orange" : true} style={{ marginTop: "2rem", borderColor: cb.paused ? "rgba(239,68,68,0.4)" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {cb.paused ? <AlertTriangle size={32} color="#EF4444" /> : <Shield size={32} color="#22C55E" />}
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{cb.paused ? "SYSTEM HALTED" : "System Operational"}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
                    {cb.paused ? "Circuit breaker active — awaiting guardian reset" : "All contracts accepting transactions"}
                  </div>
                </div>
              </div>
            </Card>

            <Grid cols={3} style={{ marginTop: "2rem" }}>
              <Card>
                <StatValue style={{ fontSize: "2rem" }}>{cb.consecutiveFailures}/{cb.threshold}</StatValue>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", marginTop: 8 }}>Consecutive Failures</div>
              </Card>
              <Card>
                <Clock size={20} color="#7C3AED" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{cb.resetTimelockSeconds / 3600}h</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", marginTop: 4 }}>Reset Timelock</div>
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "rgba(255,255,255,0.5)" }}>Guardian Multisig</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", marginTop: 8, wordBreak: "break-all" }}>
                  0x2132c6aEd2EDaC0e6aD59Cb17C5cc7697064d6D6
                </div>
              </Card>
            </Grid>

            <Card style={{ marginTop: "2rem" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Security Audit Status</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {[
                  "17/17 vulnerabilities fixed (4 CRITICAL, 5 HIGH, 5 MEDIUM, 3 LOW)",
                  "12/12 attack vectors blocked in simulation",
                  "AccessControl on reputation mutations (CRIT-003)",
                  "Coalition dissolution auth restricted (CRIT-004)",
                  "Platform fee routed to treasury (HIGH-005)",
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }} style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", display: "flex", gap: 8 }}>
                    <span style={{ color: "#22C55E" }}>✓</span> {item}
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
