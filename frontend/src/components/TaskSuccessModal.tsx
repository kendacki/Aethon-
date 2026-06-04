import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { styled } from "../stitches.config";
import { spring } from "../stitches.config";
import { GLASS } from "../theme/glass";
import { Button, Badge } from "./ui";
import { IconArrowRight } from "./icons";

export type TaskSubmitSuccess = {
  label: string;
  userQuery?: string;
  intent?: string;
  mode: "single" | "swarm";
  role?: string;
  complexity: number;
  rewardDisplay: string;
  taskId?: number;
};

const Backdrop = styled(motion.div, {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  background: "rgba(0, 0, 0, 0.72)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "$6",
});

const Dialog = styled(motion.div, {
  width: "100%",
  maxWidth: "420px",
  borderRadius: "$xl",
  border: `1px solid ${GLASS.accentBorderHover}`,
  background: GLASS.gradient.modalAccent,
  backdropFilter: GLASS.blur.card,
  WebkitBackdropFilter: GLASS.blur.card,
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65)",
  padding: "$8 $6",
  outline: "none",
});

const Title = styled("h2", {
  fontFamily: "$primary",
  fontSize: "$xl",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  marginTop: "$4",
});

const DetailGrid = styled("dl", {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "$4",
  marginTop: "$6",
  marginBottom: 0,
});

const DetailItem = styled("div", {});

const DetailLabel = styled("dt", {
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.55,
  marginBottom: "$1",
});

const DetailValue = styled("dd", {
  fontSize: "$sm",
  fontWeight: 600,
  margin: 0,
});

const Actions = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  marginTop: "$8",
});

type TaskSuccessModalProps = {
  open: boolean;
  data: TaskSubmitSuccess | null;
  onClose: () => void;
  onSubmitAnother: () => void;
};

export function TaskSuccessModal({ open, data, onClose, onSubmitAnother }: TaskSuccessModalProps) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleViewTasks = () => {
    onClose();
    navigate("/tasks", {
      state: { scrollToTasks: true, openTaskId: data?.taskId },
    });
  };

  return (
    <AnimatePresence>
      {open && data && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <Dialog
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-success-title"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <Badge status="online">Submitted</Badge>
            <Title id="task-success-title">Task dispatched</Title>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.78, lineHeight: 1.55, fontFamily: "$secondary" }}>
              Your signed request was accepted. Agents will fetch live data and report against success criteria before
              on-chain completion.
            </p>
            {data.userQuery && (
              <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", opacity: 0.85, lineHeight: 1.5, fontStyle: "italic" }}>
                “{data.userQuery}”
              </p>
            )}

            <DetailGrid>
              {data.intent && (
                <DetailItem>
                  <DetailLabel>Request type</DetailLabel>
                  <DetailValue>{data.intent}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>Routing</DetailLabel>
                <DetailValue>{data.mode === "swarm" ? "Full swarm" : "Single specialist"}</DetailValue>
              </DetailItem>
              {data.role && (
                <DetailItem>
                  <DetailLabel>Role</DetailLabel>
                  <DetailValue>{data.role}</DetailValue>
                </DetailItem>
              )}
              <DetailItem>
                <DetailLabel>Reward</DetailLabel>
                <DetailValue>{data.rewardDisplay}</DetailValue>
              </DetailItem>
            </DetailGrid>

            <Actions>
              <Button variant="primary" size="sm" onClick={handleViewTasks}>
                View task list <IconArrowRight size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={onSubmitAnother}>
                Submit another task
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </Actions>
          </Dialog>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}
