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

const ExampleRow = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$2",
  marginTop: "$2",
});

const ExampleChip = styled("button", {
  fontSize: "0.6875rem",
  padding: "0.35rem 0.65rem",
  borderRadius: "$pill",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "rgba(255,255,255,0.88)",
  cursor: "pointer",
  textAlign: "left",
  lineHeight: 1.35,
  "&:hover": { borderColor: "rgba(255,255,255,0.28)" },
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

const Advanced = styled("details", {
  marginTop: "$4",
  fontSize: "0.8125rem",
  "& summary": {
    cursor: "pointer",
    opacity: 0.75,
    fontWeight: 600,
    listStyle: "none",
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
};

export function TaskSubmitPanel({ onSubmitted }: TaskSubmitPanelProps) {
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

      toast.success("Task accepted — agents will work your request.");
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

  return (
    <>
      <Panel>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1.125rem", fontFamily: "$primary" }}>Ask the swarm</div>
          <p style={{ marginTop: 6, fontSize: "0.8125rem", opacity: 0.72, fontFamily: "$secondary", lineHeight: 1.55 }}>
            Describe what you want in plain language. The fleet maps your request to on-chain work, live data sources,
            and measurable success criteria — swarm vs single agent is only how dispatch is routed.
          </p>
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
            Escrow (STT)
            <GlassInput type="text" value={rewardEth} disabled readOnly aria-readonly />
          </GlassField>
        </FieldGrid>

        <Preview>
          <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Preview</div>
          <p style={{ margin: 0, opacity: 0.9 }}>{catalog.description}</p>
          <p style={{ margin: "0.75rem 0 0", opacity: 0.8 }}>
            <strong>Agents:</strong> {catalog.agentWork}
          </p>
          <p style={{ margin: "0.5rem 0 0", opacity: 0.8 }}>
            <strong>Sources:</strong> {catalog.sources.join(" · ")}
          </p>
          <p style={{ margin: "0.5rem 0 0", opacity: 0.8 }}>
            <strong>Success:</strong>{" "}
            {catalog.successCriteria.map((c) => c.label).join(" · ")}
          </p>
          {effectiveMode === "single" && (
            <p style={{ margin: "0.5rem 0 0", opacity: 0.75 }}>
              Dispatch: <strong>{FLEET_ROLE_META[role].label}</strong> specialist
            </p>
          )}
          {effectiveMode === "swarm" && (
            <p style={{ margin: "0.5rem 0 0", opacity: 0.75 }}>Dispatch: all five fleet roles in parallel</p>
          )}
        </Preview>

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

        <Actions>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
            {submitting ? "Signing & submitting…" : "Run task on Somnia"}
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
