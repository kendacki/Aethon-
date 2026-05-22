import { styled } from "../stitches.config";

export const Button = styled("button", {
  fontFamily: "$sans",
  fontWeight: "$semibold",
  fontSize: "$sm",
  borderRadius: "$pill",
  padding: "$3 $6",
  display: "inline-flex",
  alignItems: "center",
  gap: "$2",
  transition: "all $fast",
  variants: {
    variant: {
      primary: {
        background: "$text",
        color: "$bg",
        "&:hover": { transform: "translateY(-1px)", boxShadow: "$glow" },
      },
      accent: {
        background: "linear-gradient(135deg, $purple, $orange)",
        color: "$text",
        "&:hover": { transform: "translateY(-1px)", boxShadow: "$glowOrange" },
      },
      ghost: {
        background: "transparent",
        color: "$text",
        border: "1px solid $borderStrong",
        "&:hover": { borderColor: "$purple", background: "$bgGlass" },
      },
      danger: {
        background: "$danger",
        color: "$text",
      },
    },
    size: {
      sm: { padding: "$2 $4", fontSize: "$xs" },
      md: { padding: "$3 $6" },
      lg: { padding: "$4 $8", fontSize: "$md" },
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export const Card = styled("div", {
  borderRadius: "$lg",
  padding: "$6",
  background: "$bgCard",
  border: "1px solid $border",
  backdropFilter: "blur(12px)",
  variants: {
    glow: {
      true: { boxShadow: "$glow", borderColor: "$purpleGlow" },
      orange: { boxShadow: "$glowOrange", borderColor: "$orangeGlow" },
    },
    light: {
      true: {
        background: "#FFFFFF",
        color: "#0A0A0A",
        border: "1px solid rgba(0,0,0,0.06)",
      },
    },
  },
});

export const Badge = styled("span", {
  display: "inline-flex",
  alignItems: "center",
  gap: "$2",
  fontSize: "$xs",
  fontWeight: "$medium",
  padding: "$1 $3",
  borderRadius: "$pill",
  background: "$bgGlass",
  border: "1px solid $border",
  color: "$textMuted",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  variants: {
    accent: {
      true: { background: "rgba(124,58,237,0.15)", color: "$purple", borderColor: "$purpleGlow" },
      orange: { background: "rgba(255,107,44,0.15)", color: "$orange", borderColor: "$orangeGlow" },
    },
    status: {
      online: { background: "rgba(34,197,94,0.15)", color: "$success", borderColor: "rgba(34,197,94,0.3)" },
      offline: { background: "rgba(239,68,68,0.15)", color: "$danger", borderColor: "rgba(239,68,68,0.3)" },
    },
  },
});

export const Grid = styled("div", {
  display: "grid",
  gap: "$6",
  variants: {
    cols: {
      2: { gridTemplateColumns: "1fr", "@md": { gridTemplateColumns: "repeat(2, 1fr)" } },
      3: { gridTemplateColumns: "1fr", "@md": { gridTemplateColumns: "repeat(3, 1fr)" } },
      4: { gridTemplateColumns: "1fr", "@sm": { gridTemplateColumns: "repeat(2, 1fr)" }, "@lg": { gridTemplateColumns: "repeat(4, 1fr)" } },
    },
  },
  defaultVariants: { cols: 3 },
});

export const Section = styled("section", {
  padding: "$16 $6",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
});

export const Heading = styled("h1", {
  fontFamily: "$sans",
  fontWeight: "$extrabold",
  fontSize: "$hero",
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
});

export const Subheading = styled("p", {
  fontSize: "$lg",
  color: "$textMuted",
  maxWidth: "36rem",
  lineHeight: 1.7,
  marginTop: "$4",
});

export const StatValue = styled("div", {
  fontSize: "$3xl",
  fontWeight: "$extrabold",
  letterSpacing: "-0.02em",
  background: "linear-gradient(135deg, $text, $purple)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

export const PageWrap = styled("div", {
  minHeight: "100vh",
  paddingTop: "5rem",
  paddingBottom: "$16",
});
