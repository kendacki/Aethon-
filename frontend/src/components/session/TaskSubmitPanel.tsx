import { useMemo, useState } from "react";
import { styled } from "../../stitches.config";
import { GlassField, GlassInput, GlassSelect, GlassTextarea } from "../GlassFormField";
import { FLEET_ROLE_META } from "../../config/fleetRoles";
import { useSignedIn } from "../../auth/useSignedIn";
import { useWallet } from "../../wallet/WalletContext";
import { useToast } from "../ToastProvider";
import { TaskSuccessModal, type TaskSubmitSuccess } from "../TaskSuccessModal";
import { api, formatEth } from "../../api/client";
import { Button, Badge } from "../ui";
import { GlassCard } from "../GlassPanel";
import { GLASS } from "../../theme/glass";
import {
  ALL_AGENT_TYPES,
  hashTaskPayload,
  parseEthToWei,
  signTaskSubmission,
  type AgentType,
} from "../../task/payload";
import {
  INTENT_CATALOG,
  buildTaskPayload,
  inferIntentFromQuery,
  type TaskIntent,
} from "../../task/intents";

const Panel = styled(GlassCard, {
  defaultVariants: { tone: "accent" },
});

const ChatShell = styled("div", {
  width: "100%",
  maxWidth: "48rem",
  margin: "0 auto",
});

const Composer = styled("div", {
  borderRadius: "$xl",
  border: `1px solid ${GLASS.border}`,
  backgroundImage: GLASS.gradient.card,
  backdropFilter: GLASS.blur.sm,
  WebkitBackdropFilter: GLASS.blur.sm,
  boxShadow: GLASS.shadow.card,
  overflow: "hidden",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  "&:focus-within": {
    borderColor: GLASS.accentBorder,
    boxShadow: `0 0 0 2px ${GLASS.accentFillSoft}, ${GLASS.shadow.card}`,
  },
});

const ComposerTextarea = styled("textarea", {
  width: "100%",
  minHeight: "5.5rem",
  maxHeight: "14rem",
  padding: "$4 $4 $2",
  border: "none",
  background: "transparent",
  color: "#FFFFFF",
  fontSize: "0.9375rem",
  fontFamily: "$secondary",
  lineHeight: 1.55,
  resize: "none",
  "&::placeholder": { color: "rgba(255, 255, 255, 0.42)" },
  "&:focus": { outline: "none" },
  "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
});

const ComposerFooter = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$3",
  flexWrap: "wrap",
  padding: "$2 $3 $3",
  borderTop: `1px solid ${GLASS.divider}`,
});

const ComposerMeta = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$2",
  flexWrap: "wrap",
  flex: 1,
  minWidth: 0,
});

const MetaSelect = styled("select", {
  appearance: "none",
  WebkitAppearance: "none",
  border: `1px solid ${GLASS.borderSoft}`,
  borderRadius: "$pill",
  background: "rgba(0,0,0,0.35)",
  color: "rgba(255,255,255,0.88)",
  fontSize: "0.6875rem",
  fontWeight: 600,
  fontFamily: "$secondary",
  padding: "0.35rem 1.75rem 0.35rem 0.65rem",
  cursor: "pointer",
  maxWidth: "11rem",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
});

const MetaPill = styled("span", {
  fontSize: "0.6875rem",
  fontWeight: 600,
  padding: "0.35rem 0.65rem",
  borderRadius: "$pill",
  border: `1px solid ${GLASS.borderSoft}`,
  background: "rgba(0,0,0,0.28)",
  color: "rgba(255,255,255,0.78)",
  whiteSpace: "nowrap",
});

const SendButton = styled("button", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2.25rem",
  height: "2.25rem",
  borderRadius: "$pill",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 150ms ease, opacity 150ms ease, transform 150ms ease",
  background: GLASS.accentFill,
  color: "#FFFFFF",
  "&:hover:not(:disabled)": {
    background: "rgba(13, 188, 130, 0.28)",
    transform: "scale(1.04)",
  },
  "&:disabled": {
    opacity: 0.35,
    cursor: "not-allowed",
    background: "rgba(255,255,255,0.08)",
  },
});

const ExampleRow = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$2",
  marginTop: "$4",
  justifyContent: "center",
});

const ExampleChip = styled("button", {
  fontSize: "0.6875rem",
  padding: "0.4rem 0.75rem",
  borderRadius: "$pill",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "rgba(255,255,255,0.88)",
  cursor: "pointer",
  textAlign: "left",
  lineHeight: 1.35,
  "&:hover:not(:disabled)": { borderColor: "rgba(255,255,255,0.28)" },
  "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
});

const Preview = styled("div", {
  marginTop: "$4",
  padding: "$4",
  borderRadius: "$md",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.28)",
  fontSize: "0.8125rem",
  lineHeight: 1.55,
});

const ChatPreview = styled("details", {
  marginTop: "$4",
  fontSize: "0.8125rem",
  borderRadius: "$md",
  border: `1px solid ${GLASS.borderSoft}`,
  background: "rgba(0,0,0,0.22)",
  padding: "$3 $4",
  "& summary": {
    cursor: "pointer",
    opacity: 0.78,
    fontWeight: 600,
    listStyle: "none",
    fontSize: "0.75rem",
    "&::-webkit-details-marker": { display: "none" },
  },
});

const Advanced = styled("details", {
  marginTop: "$3",
  fontSize: "0.8125rem",
  "& summary": {
    cursor: "pointer",
    opacity: 0.75,
    fontWeight: 600,
    listStyle: "none",
    fontSize: "0.75rem",
    "&::-webkit-details-marker": { display: "none" },
  },
});

const FieldGrid = styled("div", {
  display: "grid",
  gap: "$4",
  marginTop: "$3",
  gridTemplateColumns: "1fr",
  "@md": { gridTemplateColumns: "1fr 1fr" },
});

const Actions = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$3",
  alignItems: "center",
  marginTop: "$5",
});

const BlockHint = styled("p", {
  margin: "$3 0 0",
  fontSize: "0.75rem",
  opacity: 0.62,
  textAlign: "center",
  lineHeight: 1.45,
});

const TASK_REWARD_STT = { single: "0.1", swarm: "0.5" } as const;

const EXAMPLE_QUERIES: Array<{ intent: TaskIntent; query: string }> = [
  { intent: "MARKET_PRICE", query: INTENT_CATALOG.MARKET_PRICE.exampleQuery },
  { intent: "ARBITRAGE_SCAN", query: INTENT_CATALOG.ARBITRAGE_SCAN.exampleQuery },
  { intent: "YIELD_STRATEGY", query: INTENT_CATALOG.YIELD_STRATEGY.exampleQuery },
  { intent: "GOVERNANCE_ANALYSIS", query: INTENT_CATALOG.GOVERNANCE_ANALYSIS.exampleQuery },
  { intent: "RISK_CHECK", query: INTENT_CATALOG.RISK_CHECK.exampleQuery },
  { intent: "PORTFOLIO_BRIEFING", query: INTENT_CATALOG.PORTFOLIO_BRIEFING.exampleQuery },
];

type TaskSubmitPanelProps = {
  onSubmitted?: () => void;
  variant?: "panel" | "chat";
};

export function TaskSubmitPanel({ onSubmitted, variant = "panel" }: TaskSubmitPanelProps) {
  const { signedIn, phase } = useSignedIn();
  const { address, signer, isCorrectChain, connect } = useWallet();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<TaskSubmitSuccess | null>(null);
  const [userQuery, setUserQuery] = useState(INTENT_CATALOG.MARKET_PRICE.exampleQuery);
  const [intent, setIntent] = useState<TaskIntent>("MARKET_PRICE");
  const [intentManual, setIntentManual] = useState(false);
  const [dispatchMode, setDispatchMode] = useState<"auto" | "single" | "swarm">("auto");
  const [role, setRole] = useState<AgentType>("ORACLE");

  const catalog = INTENT_CATALOG[intent];

  const effectiveMode = useMemo(() => {
    if (dispatchMode === "single") return "single" as const;
    if (dispatchMode === "swarm") return "swarm" as const;
    return catalog.defaultMode;
  }, [dispatchMode, catalog.defaultMode]);

  const complexity = effectiveMode === "swarm" ? 5 : 1;
  const rewardEth = effectiveMode === "swarm" ? TASK_REWARD_STT.swarm : TASK_REWARD_STT.single;

  const previewPayload = useMemo(
    () =>
      buildTaskPayload({
        userQuery,
        intent,
        mode: effectiveMode,
        role: effectiveMode === "single" ? role : undefined,
      }),
    [userQuery, intent, effectiveMode, role],
  );

  const canSubmit =
    signedIn && Boolean(address) && Boolean(signer) && isCorrectChain && userQuery.trim().length >= 8;

  const blockReason =
    phase === "guest"
      ? "Connect wallet and sign in to submit."
      : phase === "wallet"
        ? "Sign in from the top right to submit tasks."
        : !isCorrectChain
          ? "Switch to Somnia in your wallet."
          : userQuery.trim().length < 8
            ? "Describe your request in at least 8 characters."
            : null;

  const onQueryChange = (value: string) => {
    setUserQuery(value);
    if (!intentManual) setIntent(inferIntentFromQuery(value));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !address || !signer) {
      toast.error(blockReason ?? "Cannot submit right now.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = previewPayload;
      const taskHash = hashTaskPayload(payload);
      const rewardWei = parseEthToWei(rewardEth);
      const signature = await signTaskSubmission(signer, address, taskHash, complexity, rewardWei);

      const res = await api.submitTask({
        payload,
        taskHash,
        complexity,
        rewardWei,
        submitter: address,
        signature,
      });

      const taskId =
        res.data && typeof res.data === "object" && "taskId" in res.data
          ? Number((res.data as { taskId: number }).taskId)
          : undefined;

      setSuccessModal({
        label: payload.label ?? "Task",
        userQuery: payload.userQuery,
        intent: catalog.label,
        mode: effectiveMode,
        role: effectiveMode === "single" ? role : undefined,
        complexity,
        rewardDisplay: formatEth(rewardWei),
        taskId,
      });

      toast.success("Task accepted. Agents are working on your request.");
      onSubmitted?.();
    } catch (err) {
      if (!isCorrectChain) {
        const outcome = await connect();
        if (!outcome.ok) toast.error(outcome.error);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Task submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const previewBody = (
    <>
      <p style={{ margin: 0, opacity: 0.9 }}>{catalog.description}</p>
      <p style={{ margin: "0.75rem 0 0", opacity: 0.8 }}>
        <strong>Agents:</strong> {catalog.agentWork}
      </p>
      <p style={{ margin: "0.5rem 0 0", opacity: 0.8 }}>
        <strong>Sources:</strong> {catalog.sources.join(" · ")}
      </p>
      <p style={{ margin: "0.5rem 0 0", opacity: 0.8 }}>
        <strong>Checks:</strong> {catalog.successCriteria.map((c) => c.label).join(" · ")}
      </p>
      {effectiveMode === "single" && (
        <p style={{ margin: "0.5rem 0 0", opacity: 0.75 }}>
          Dispatch: <strong>{FLEET_ROLE_META[role].label}</strong> specialist
        </p>
      )}
      {effectiveMode === "swarm" && (
        <p style={{ margin: "0.5rem 0 0", opacity: 0.75 }}>Dispatch: all five fleet roles in parallel</p>
      )}
    </>
  );

  const dispatchOptions = (
    <Advanced>
      <summary>Dispatch options (optional)</summary>
      <FieldGrid>
        <GlassField>
          Routing
          <GlassSelect
            value={dispatchMode}
            disabled={!signedIn}
            onChange={(e) => setDispatchMode(e.target.value as "auto" | "single" | "swarm")}
          >
            <option value="auto">Auto ({catalog.defaultMode === "swarm" ? "swarm" : "single"})</option>
            <option value="single">Force single agent</option>
            <option value="swarm">Force full swarm</option>
          </GlassSelect>
        </GlassField>
        {effectiveMode === "single" && (
          <GlassField>
            Specialist
            <GlassSelect value={role} disabled={!signedIn} onChange={(e) => setRole(e.target.value as AgentType)}>
              {ALL_AGENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FLEET_ROLE_META[t].label}
                </option>
              ))}
            </GlassSelect>
          </GlassField>
        )}
      </FieldGrid>
    </Advanced>
  );

  if (variant === "chat") {
    return (
      <>
        <ChatShell>
          <Composer>
            <ComposerTextarea
              value={userQuery}
              disabled={!signedIn}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ask about price, yield, governance, risk, or a full briefing..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <ComposerFooter>
              <ComposerMeta>
                <MetaSelect
                  value={intent}
                  disabled={!signedIn}
                  onChange={(e) => {
                    setIntent(e.target.value as TaskIntent);
                    setIntentManual(true);
                  }}
                  aria-label="Request type"
                >
                  {Object.values(INTENT_CATALOG).map((c) => (
                    <option key={c.intent} value={c.intent}>
                      {c.label}
                    </option>
                  ))}
                </MetaSelect>
                <MetaPill>{rewardEth} STT</MetaPill>
                <MetaPill>{effectiveMode === "swarm" ? "Swarm" : "Single"}</MetaPill>
                {signedIn && <Badge status="online">Operator</Badge>}
              </ComposerMeta>
              <SendButton
                type="button"
                disabled={!canSubmit || submitting}
                onClick={() => void handleSubmit()}
                aria-label={submitting ? "Submitting task" : "Run task on Somnia"}
                title={submitting ? "Submitting..." : "Run task on Somnia"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 19V5M12 5L6 11M12 5L18 11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </SendButton>
            </ComposerFooter>
          </Composer>

          {blockReason && !signedIn && <BlockHint>{blockReason}</BlockHint>}

          <ExampleRow>
            {EXAMPLE_QUERIES.map((ex) => (
              <ExampleChip
                key={ex.intent}
                type="button"
                disabled={!signedIn}
                onClick={() => {
                  setUserQuery(ex.query);
                  setIntent(ex.intent);
                  setIntentManual(true);
                }}
              >
                {INTENT_CATALOG[ex.intent].label}
              </ExampleChip>
            ))}
          </ExampleRow>

          <ChatPreview>
            <summary>What agents will do</summary>
            <div style={{ marginTop: "0.75rem" }}>{previewBody}</div>
          </ChatPreview>

          {dispatchOptions}
        </ChatShell>

        <TaskSuccessModal
          open={Boolean(successModal)}
          data={successModal}
          onClose={() => setSuccessModal(null)}
          onSubmitAnother={() => setSuccessModal(null)}
        />
      </>
    );
  }

  return (
    <>
      <Panel>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1.125rem", fontFamily: "$primary" }}>Ask the swarm</div>
          {signedIn && (
            <div style={{ marginTop: "0.75rem" }}>
              <Badge status="online">Operator</Badge>
            </div>
          )}
        </div>

        <GlassField>
          What do you need?
          <GlassTextarea
            value={userQuery}
            disabled={!signedIn}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g. What is ETH price right now, and is the fleet healthy enough to trade?"
          />
        </GlassField>

        <ExampleRow style={{ justifyContent: "flex-start" }}>
          {EXAMPLE_QUERIES.map((ex) => (
            <ExampleChip
              key={ex.intent}
              type="button"
              disabled={!signedIn}
              onClick={() => {
                setUserQuery(ex.query);
                setIntent(ex.intent);
                setIntentManual(true);
              }}
            >
              {INTENT_CATALOG[ex.intent].label}
            </ExampleChip>
          ))}
        </ExampleRow>

        <FieldGrid>
          <GlassField>
            Request type
            <GlassSelect
              value={intent}
              disabled={!signedIn}
              onChange={(e) => {
                setIntent(e.target.value as TaskIntent);
                setIntentManual(true);
              }}
            >
              {Object.values(INTENT_CATALOG).map((c) => (
                <option key={c.intent} value={c.intent}>
                  {c.label}
                </option>
              ))}
            </GlassSelect>
          </GlassField>
          <GlassField>
            Amount (STT)
            <GlassInput type="text" value={rewardEth} disabled readOnly aria-readonly />
          </GlassField>
        </FieldGrid>

        <Preview>
          <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Preview</div>
          {previewBody}
        </Preview>

        {dispatchOptions}

        <Actions>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
            {submitting ? "Submitting..." : "Run task on Somnia"}
          </Button>
          {blockReason && <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>{blockReason}</span>}
        </Actions>
      </Panel>

      <TaskSuccessModal
        open={Boolean(successModal)}
        data={successModal}
        onClose={() => setSuccessModal(null)}
        onSubmitAnother={() => setSuccessModal(null)}
      />
    </>
  );
}
