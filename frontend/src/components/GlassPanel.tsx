import { styled } from "../stitches.config";
import { GLASS } from "../theme/glass";

const glassBase = {
  position: "relative" as const,
  overflow: "hidden" as const,
  isolation: "isolate" as const,
  backdropFilter: GLASS.blur.panel,
  WebkitBackdropFilter: GLASS.blur.panel,
  border: `1px solid ${GLASS.border}`,
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: "1px",
    background: `linear-gradient(90deg, transparent, ${GLASS.highlight}, transparent)`,
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: `linear-gradient(180deg, ${GLASS.sheen} 0%, transparent 42%)`,
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
        boxShadow: GLASS.shadow.panelTop,
      },
      full: {
        borderRadius: "$xl",
        boxShadow: GLASS.shadow.panel,
      },
    },
    tone: {
      neutral: {
        background: GLASS.gradient.panel,
      },
      accent: {
        background: GLASS.gradient.panelAccent,
        borderColor: GLASS.accentBorder,
      },
    },
  },
  defaultVariants: { radius: "full", tone: "neutral" },
});

export const GlassCard = styled("div", {
  position: "relative",
  zIndex: 1,
  borderRadius: "$lg",
  padding: "$6",
  backdropFilter: GLASS.blur.sm,
  WebkitBackdropFilter: GLASS.blur.sm,
  border: `1px solid ${GLASS.borderSoft}`,
  boxShadow: GLASS.shadow.cardInset,
  variants: {
    tone: {
      flat: {
        background: GLASS.fill,
        borderColor: GLASS.borderSoft,
      },
      elevated: {
        background: GLASS.gradient.card,
        borderColor: GLASS.border,
        backdropFilter: GLASS.blur.card,
        WebkitBackdropFilter: GLASS.blur.card,
        boxShadow: GLASS.shadow.card,
      },
      accent: {
        background: GLASS.gradient.cardAccent,
        borderColor: GLASS.accentBorderCard,
      },
    },
  },
  defaultVariants: { tone: "flat" },
});

/** Neutral full width band (overview sections, activity). */
export const GlassBandPanel = styled(GlassPanel, {
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
  defaultVariants: { radius: "full", tone: "neutral" },
});

/** Operator pages (fleet) use accent shell. */
export const GlassSectionPanel = styled(GlassPanel, {
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
  padding: "$6",
  "@md": { padding: "$8" },
  defaultVariants: { radius: "full", tone: "accent" },
});

/** Elevated inner card (stats, metrics, quick links). */
export const GlassElevatedCard = styled(GlassCard, {
  defaultVariants: { tone: "elevated" },
});

/** Compact cells (summary stats, icon rings, fleet bar). */
export const GlassSurface = styled("div", {
  background: GLASS.fill,
  border: `1px solid ${GLASS.borderSoft}`,
  borderRadius: "$md",
  variants: {
    interactive: {
      true: {
        transition: "border-color 150ms ease",
        "&:hover": { borderColor: GLASS.borderHover },
      },
    },
    padding: {
      sm: { padding: "$3 $4" },
      md: { padding: "$4 $5" },
      lg: { padding: "$5 $6" },
    },
  },
});

export const GlassFilterPill = styled("button", {
  padding: "$2 $4",
  borderRadius: "$pill",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  border: `1px solid ${GLASS.border}`,
  background: GLASS.fill,
  color: "$text",
  transition: "all 150ms ease",
  variants: {
    active: {
      true: {
        background: GLASS.accentFill,
        borderColor: GLASS.accentBorderStrong,
      },
      false: {
        background: GLASS.fill,
        borderColor: GLASS.border,
      },
    },
  },
});

export const GlassContent = styled("div", {
  position: "relative",
  zIndex: 1,
});

export { GLASS };
