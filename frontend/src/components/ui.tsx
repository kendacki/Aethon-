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
        "&:hover": { transform: "translateY(-1px)", opacity: 0.92 },
      },
      outline: {
        background: "transparent",
        color: "$text",
        border: "1px solid $text",
        "&:hover": {
          background: "rgba(255,255,255,0.08)",
          transform: "translateY(-1px)",
        },
        "&:active": {
          background: "$text",
          color: "$bg",
          transform: "translateY(0)",
        },
      },
      accent: {
        background: "transparent",
        color: "$text",
        border: "1px solid $borderStrong",
        "&:hover": { borderColor: "$text", background: "rgba(255,255,255,0.06)" },
      },
      ghost: {
        background: "transparent",
        color: "$text",
        border: "1px solid $borderStrong",
        "&:hover": { borderColor: "$text", background: "rgba(255,255,255,0.06)" },
      },
      danger: {
        background: "transparent",
        color: "$text",
        border: "1px solid $borderStrong",
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
  transition: "border-color $fast",
  "&:hover": { borderColor: "$borderStrong" },
  variants: {
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
  background: "rgba(255,255,255,0.06)",
  border: "1px solid $border",
  color: "$text",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  variants: {
    accent: {
      true: { background: "rgba(255,255,255,0.08)", color: "$text", borderColor: "$borderStrong" },
      orange: { background: "rgba(255,255,255,0.08)", color: "$text", borderColor: "$borderStrong" },
    },
    status: {
      online: { background: "rgba(255,255,255,0.1)", color: "$text", borderColor: "$borderStrong" },
      offline: { background: "rgba(255,255,255,0.04)", color: "$textDim", borderColor: "$border" },
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
  color: "$text",
});

export const Subheading = styled("p", {
  fontSize: "$lg",
  color: "$text",
  maxWidth: "36rem",
  lineHeight: 1.7,
  marginTop: "$4",
  opacity: 0.82,
});

export const StatValue = styled("div", {
  fontSize: "$3xl",
  fontWeight: "$extrabold",
  letterSpacing: "-0.02em",
  color: "$text",
});

export const PageWrap = styled("div", {
  minHeight: "100vh",
  paddingTop: "5rem",
  paddingBottom: "$16",
});

export const Muted = styled("span", {
  color: "$text",
  opacity: 0.72,
  fontSize: "$sm",
});
