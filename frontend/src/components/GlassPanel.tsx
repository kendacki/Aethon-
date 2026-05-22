import { styled } from "../stitches.config";

const glassBase = {
  position: "relative" as const,
  overflow: "hidden" as const,
  isolation: "isolate" as const,
  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.62) 38%, rgba(0, 0, 0, 0.82) 100%)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)",
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 42%)",
    pointerEvents: "none",
  },
};

export const GlassPanel = styled("div", {
  ...glassBase,
  variants: {
    radius: {
      top: {
        borderRadius: "$xl $xl 0 0",
        borderBottom: "none",
        boxShadow: "0 -16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      },
      full: {
        borderRadius: "$xl",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      },
    },
  },
  defaultVariants: { radius: "full" },
});

export const GlassCard = styled("div", {
  position: "relative",
  zIndex: 1,
  borderRadius: "$lg",
  padding: "$6",
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(12px) saturate(160%)",
  WebkitBackdropFilter: "blur(12px) saturate(160%)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
});

export const GlassContent = styled("div", {
  position: "relative",
  zIndex: 1,
});
