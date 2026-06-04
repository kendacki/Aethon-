import { motion } from "framer-motion";
import { api } from "../api/client";
import { useFetch, useWebSocket } from "../api/hooks";
import { PageHero } from "../components/PageHero";
import { Badge, Card, Grid, PageWrap, Heading, StatValue } from "../components/ui";
import {
  IconAlert,
  IconAudit,
  IconCheck,
  IconClock,
  IconCoalition,
  IconLock,
  IconShield,
  IconVault,
  ICON_LG,
  ICON_MD,
  ICON_SM,
  ICON_XL,
} from "../components/icons";
import { ErrorBanner } from "../components/ErrorBanner";
import { SignedInShell } from "../components/session/SessionUI";
import { useSignedIn } from "../auth/useSignedIn";
import { useToast } from "../components/ToastProvider";
import { spring, styled } from "../stitches.config";
import { useEffect } from "react";

const SECURITY_ITEMS = [
  { label: "All audit findings resolved", icon: IconAudit },
  { label: "All attack simulations blocked", icon: IconShield },
  { label: "Reputation changes require authorized contracts", icon: IconLock },
  { label: "Only approved parties can dissolve coalitions", icon: IconCoalition },
  { label: "Platform fees go to treasury", icon: IconVault },
] as const;

const SecurityGrid = styled("div", {
  display: "grid",
  gap: "$3",
  "@md": {
    gridTemplateColumns: "1fr 1fr",
  },
});

const SecurityItem = styled(motion.div, {
  display: "flex",
  alignItems: "center",
  gap: "$4",
  padding: "$4 $5",
  borderRadius: "$md",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  minHeight: "4.5rem",
});

const ItemIcon = styled("div", {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
});

const ItemLabel = styled("span", {
  flex: 1,
  fontSize: "$sm",
  fontWeight: 600,
  lineHeight: 1.45,
  opacity: 0.9,
});

const SecurityHeader = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$3",
  marginBottom: "$5",
});

export default function GovernancePage() {
  const { signedIn } = useSignedIn();
  const toast = useToast();

  const { data: cb, loading, error, reload } = useFetch(() => {
    if (!signedIn) return Promise.resolve(null);
    return api.circuitBreaker();
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

            <Grid cols={2} style={{ marginTop: "2rem" }}>
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
            </Grid>

            <Card style={{ marginTop: "2rem" }}>
              <SecurityHeader>
                <IconShield size={ICON_MD} />
                <h3 style={{ fontWeight: 800, fontSize: "1.125rem", margin: 0 }}>Security</h3>
              </SecurityHeader>
              <SecurityGrid>
                {SECURITY_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <SecurityItem
                      key={item.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: i * 0.05 }}
                    >
                      <ItemIcon>
                        <Icon size={ICON_MD} />
                      </ItemIcon>
                      <ItemLabel>{item.label}</ItemLabel>
                      <IconCheck size={ICON_SM} aria-hidden />
                    </SecurityItem>
                  );
                })}
              </SecurityGrid>
            </Card>
          </motion.div>
        )}
      </SignedInShell>
    </PageWrap>
  );
}
