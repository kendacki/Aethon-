import { motion } from "framer-motion";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { PageHero } from "../components/PageHero";
import { Badge, Card, Grid, PageWrap, Heading, StatValue } from "../components/ui";
import { IconAlert, IconClock, IconShield, ICON_LG, ICON_SM, ICON_XL } from "../components/icons";
import { ErrorBanner } from "../components/ErrorBanner";
import { SignedInShell, SessionStatusBar } from "../components/session/SessionUI";
import { useSignedIn } from "../auth/useSignedIn";
import { useToast } from "../components/ToastProvider";
import { spring } from "../stitches.config";
import { useEffect } from "react";

export default function GovernancePage() {
  const { signedIn } = useSignedIn();
  const toast = useToast();

  const { data: cb, loading, error, reload } = useFetch(() => {
    if (!signedIn) return Promise.resolve(null);
    return api.circuitBreaker();
  }, [signedIn]);

  const { data: health } = useFetch(() => {
    if (!signedIn) return Promise.resolve(null);
    return api.health();
  }, [signedIn]);

  const { lastEvent } = useWebSocket(["circuit_breaker"]);

  useEffect(() => {
    if (!signedIn) return;
    if (lastEvent?.type === "CIRCUIT_BREAK") {
      toast.error("Circuit breaker on. All work paused.");
      reload();
    }
    if (lastEvent?.type === "CIRCUIT_RESET") {
      toast.success("Circuit reset. System running again.");
      reload();
    }
  }, [lastEvent, reload, signedIn, toast]);

  return (
    <PageWrap css={signedIn ? { paddingTop: 0 } : undefined}>
      {signedIn && <SessionStatusBar />}
      <PageHero>
        <Badge accent>
          <IconShield size={ICON_SM} style={{ display: "inline", marginRight: 4 }} />
          Governance
        </Badge>
        <Heading style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "1rem" }}>Safety</Heading>
        <p style={{ marginTop: "0.5rem", maxWidth: 560, opacity: 0.82, lineHeight: 1.65 }}>
          Circuit breaker, guardian reset, and protocol security. Sign in to view live operator data.
        </p>
      </PageHero>

      <SignedInShell
        title="Governance & safety"
        description="Monitor circuit breaker state and indexed protocol health after you authenticate."
      >
        <ErrorBanner message={error} onRetry={reload} />

        {loading && <p style={{ marginTop: "1rem", opacity: 0.72 }}>Loading safety status…</p>}

        {!loading && !cb && !error && (
          <Card style={{ marginTop: "1.5rem" }}>
            <p style={{ margin: 0, opacity: 0.75 }}>Safety data unavailable. Try again shortly.</p>
          </Card>
        )}

        {cb && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <Card style={{ marginTop: "1.5rem", borderColor: cb.paused ? "rgba(255,255,255,0.4)" : "rgba(13, 188, 130, 0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {cb.paused ? <IconAlert size={ICON_XL} /> : <IconShield size={ICON_XL} />}
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{cb.paused ? "System paused" : "System running"}</div>
                  <div style={{ opacity: 0.72, fontSize: "0.875rem" }}>
                    {cb.paused ? "Waiting for guardian reset." : "All contracts are active"}
                  </div>
                </div>
                <Badge status={cb.paused ? "offline" : "online"} style={{ marginLeft: "auto" }}>
                  {cb.paused ? "Halted" : "Active"}
                </Badge>
              </div>
            </Card>

            <Grid cols={3} style={{ marginTop: "2rem" }}>
              <Card>
                <StatValue style={{ fontSize: "2rem" }}>
                  {cb.consecutiveFailures}/{cb.threshold}
                </StatValue>
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
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                    style={{ fontSize: "0.875rem", opacity: 0.82, display: "flex", gap: 8 }}
                  >
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
      </SignedInShell>
    </PageWrap>
  );
}
