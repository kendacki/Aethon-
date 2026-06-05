import { styled } from "../stitches.config";
import { GLASS } from "../theme/glass";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

const CONTROL_GRADIENT = GLASS.gradient.card;
const CONTROL_GRADIENT_HOVER = "linear-gradient(165deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0.65) 100%)";

const controlBase = {
  width: "100%",
  minHeight: "2.75rem",
  padding: "$3",
  borderRadius: "$md",
  backgroundColor: "rgba(0, 0, 0, 0.35)",
  backgroundImage: CONTROL_GRADIENT,
  backdropFilter: GLASS.blur.sm,
  WebkitBackdropFilter: GLASS.blur.sm,
  color: "#FFFFFF",
  border: `1px solid ${GLASS.border}`,
  boxShadow: GLASS.shadow.cardInset,
  fontSize: "$sm",
  fontFamily: "$secondary",
  fontWeight: 500,
  letterSpacing: 0,
  textTransform: "none" as const,
  transition: "border-color 150ms ease, box-shadow 150ms ease, background-image 150ms ease",
  "&::placeholder": {
    color: "rgba(255, 255, 255, 0.45)",
  },
  "&:hover:not(:disabled)": {
    borderColor: GLASS.borderHover,
    backgroundImage: CONTROL_GRADIENT_HOVER,
  },
  "&:focus": {
    outline: "none",
    borderColor: GLASS.accentBorder,
    boxShadow: `0 0 0 2px ${GLASS.accentFillSoft}, ${GLASS.shadow.cardInset}`,
  },
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};

export const GlassField = styled("label", {
  display: "flex",
  flexDirection: "column",
  gap: "$2",
  fontSize: "$xs",
  fontWeight: 600,
  fontFamily: "$secondary",
  letterSpacing: "0.02em",
  textTransform: "none",
  color: "rgba(255, 255, 255, 0.78)",
});

export const GlassInput = styled("input", {
  ...controlBase,
});

export const GlassTextarea = styled("textarea", {
  ...controlBase,
  minHeight: "6.5rem",
  resize: "vertical",
  lineHeight: 1.5,
});

export const GlassSelect = styled("select", {
  ...controlBase,
  paddingRight: "2.25rem",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  colorScheme: "dark",
  backgroundImage: `${CONTROL_GRADIENT}, ${CHEVRON}`,
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundPosition: "center, right 0.75rem center",
  backgroundSize: "100% 100%, 12px 12px",
  "&:hover:not(:disabled)": {
    borderColor: GLASS.borderHover,
    backgroundImage: `${CONTROL_GRADIENT_HOVER}, ${CHEVRON}`,
  },
  "& option": {
    backgroundColor: "#0a0a0a",
    color: "#FFFFFF",
    fontWeight: 500,
    padding: "0.5rem",
  },
  "& optgroup": {
    backgroundColor: "#0a0a0a",
    color: "rgba(255, 255, 255, 0.72)",
  },
});
