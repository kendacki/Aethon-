import { useState } from "react";
import { styled } from "../../stitches.config";
import { GlassField, GlassInput, GlassSelect } from "../GlassFormField";
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
  defaultPayloadForRole,
  hashTaskPayload,
  parseEthToWei,
  signTaskSubmission,
  swarmPayload,
  type AgentType,
} from "../../task/payload";

const Panel = styled(GlassCard, {
  defaultVariants: { tone: "accent" },
});

const FieldGrid = styled("div", {
  display: "grid",
  gap: "$4",
  gridTemplateColumns: "1fr",
  "@md": {
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    alignItems: "end",
  },
});

const Hint = styled("p", {
  marginTop: "$4",
  fontSize: "$xs",
  opacity: 0.68,
  lineHeight: 1.55,
});

const Actions = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$3",
  alignItems: "center",
  marginTop: "$2",
});

type TaskSubmitPanelProps = {
  onSubmitted?: () => void;
};

export function TaskSubmitPanel({ onSubmitted }: TaskSubmitPanelProps) {
  const { signedIn, phase } = useSignedIn();
  const { address, signer, isCorrectChain, connect } = useWallet();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<TaskSubmitSuccess | null>(null);
  const [role, setRole] = useState<AgentType>("ORACLE");
  const [complexity, setComplexity] = useState(1);
  const [rewardEth, setRewardEth] = useState("0.01");
  const [swarmMode, setSwarmMode] = useState(false);

  const canSubmit = signedIn && Boolean(address) && Boolean(signer) && isCorrectChain;

  const blockReason =
    phase === "guest"
      ? "Connect wallet and sign in to submit."
      : phase === "wallet"
        ? "Sign in from the top right to submit tasks."
        : !isCorrectChain
          ? "Switch to Somnia in your wallet."
          : null;

  const handleSubmit = async () => {
    if (!canSubmit || !address || !signer) {
      toast.error(blockReason ?? "Cannot submit right now.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = swarmMode ? swarmPayload(complexity) : defaultPayloadForRole(role);
      const taskHash = hashTaskPayload(payload);
      const rewardWei = parseEthToWei(rewardEth);
      const signature = await signTaskSubmission(signer, address, taskHash, complexity, rewardWei);

      await api.submitTask({
        payload,
        taskHash,
        complexity,
        rewardWei,
        submitter: address,
        signature,
      });

      setSuccessModal({
        label: payload.label ?? payload.action ?? "Task",
        mode: swarmMode ? "swarm" : "single",
        role: swarmMode ? undefined : role,
        complexity,
        rewardDisplay: formatEth(rewardWei),
      });

      toast.success("Task accepted by the swarm.");
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

  const closeSuccessModal = () => setSuccessModal(null);

  return (
    <>
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.125rem", fontFamily: "$primary" }}>Submit to swarm</div>
            <p style={{ marginTop: 6, fontSize: "0.8125rem", opacity: 0.72, fontFamily: "$secondary" }}>
              Dispatch work to autonomous agents on the Somnia task market.
            </p>
          </div>
          {signedIn && <Badge status="online">Operator</Badge>}
        </div>

        <FieldGrid>
          <GlassField>
            Mode
            <GlassSelect
              value={swarmMode ? "swarm" : "single"}
              disabled={!signedIn}
              onChange={(e) => {
                const swarm = e.target.value === "swarm";
                setSwarmMode(swarm);
                if (swarm) setComplexity(5);
              }}
            >
              <option value="single">Single role</option>
              <option value="swarm">Full swarm</option>
            </GlassSelect>
          </GlassField>
          {!swarmMode && (
            <GlassField>
              Agent role
              <GlassSelect value={role} disabled={!signedIn} onChange={(e) => setRole(e.target.value as AgentType)}>
                {ALL_AGENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FLEET_ROLE_META[t].label}
                  </option>
                ))}
              </GlassSelect>
            </GlassField>
          )}
          <GlassField>
            Complexity
            <GlassInput
              type="number"
              min={1}
              max={5}
              value={complexity}
              disabled={!signedIn || swarmMode}
              onChange={(e) => setComplexity(Number(e.target.value))}
            />
          </GlassField>
          <GlassField>
            Reward (STT)
            <GlassInput type="text" value={rewardEth} disabled={!signedIn} onChange={(e) => setRewardEth(e.target.value)} />
          </GlassField>
        </FieldGrid>

        <Actions>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
            {submitting ? "Submitting…" : swarmMode ? "Submit swarm task" : "Submit task"}
          </Button>
          {blockReason && <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>{blockReason}</span>}
        </Actions>

        <Hint>
          {swarmMode
            ? "Swarm mode uses all five agent types. Confirm the fleet is online before you submit complex jobs."
            : "Single role tasks target one specialist. Raise complexity when a coalition may form."}
        </Hint>
      </Panel>

      <TaskSuccessModal
        open={Boolean(successModal)}
        data={successModal}
        onClose={closeSuccessModal}
        onSubmitAnother={closeSuccessModal}
      />
    </>
  );
}
