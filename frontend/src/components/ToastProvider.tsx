import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { styled } from "../stitches.config";
import { spring } from "../stitches.config";

export type ToastVariant = "info" | "success" | "error";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const Stack = styled("div", {
  position: "fixed",
  top: "5.25rem",
  right: "$6",
  zIndex: 250,
  display: "flex",
  flexDirection: "column",
  gap: "$3",
  maxWidth: "min(22rem, calc(100vw - 2rem))",
  pointerEvents: "none",
});

const ToastCard = styled(motion.div, {
  pointerEvents: "auto",
  padding: "$4 $5",
  borderRadius: "$lg",
  fontSize: "$sm",
  lineHeight: 1.5,
  color: "$text",
  border: "1px solid $border",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
  cursor: "pointer",
  variants: {
    variant: {
      info: {
        background: "rgba(0, 0, 0, 0.94)",
        borderColor: "rgba(255, 255, 255, 0.14)",
      },
      success: {
        background: "linear-gradient(135deg, rgba(13, 188, 130, 0.22) 0%, rgba(0, 0, 0, 0.92) 100%)",
        borderColor: "rgba(13, 188, 130, 0.45)",
      },
      error: {
        background: "linear-gradient(135deg, rgba(220, 60, 60, 0.18) 0%, rgba(0, 0, 0, 0.92) 100%)",
        borderColor: "rgba(220, 60, 60, 0.4)",
      },
    },
  },
  defaultVariants: { variant: "info" },
});

const ToastLabel = styled("div", {
  fontSize: "0.625rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
  textTransform: "none",
  opacity: 0.65,
  marginBottom: "$1",
});

function variantLabel(v: ToastVariant): string {
  if (v === "success") return "success";
  if (v === "error") return "error";
  return "notice";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ToastItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActive(null);
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info", durationMs = 5200) => {
      if (!message.trim()) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setActive({ id: String(Date.now()), message, variant });
      timerRef.current = setTimeout(() => setActive(null), durationMs);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
      info: (m) => toast(m, "info"),
      dismiss,
    }),
    [toast, dismiss],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Stack aria-live="polite">
        <AnimatePresence mode="wait">
          {active && (
            <ToastCard
              key={active.id}
              variant={active.variant}
              initial={{ opacity: 0, x: 32, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96 }}
              transition={spring}
              onClick={dismiss}
              role="status"
            >
              <ToastLabel>{variantLabel(active.variant)}</ToastLabel>
              {active.message}
            </ToastCard>
          )}
        </AnimatePresence>
      </Stack>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
