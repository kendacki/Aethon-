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
        "&:hover": { opacity: 0.92 },
      },
      outline: {
        background: "transparent",
        color: "$text",
        border: "1px solid $text",
        "&:hover": { background: "rgba(255,255,255,0.08)" },
        "&:active": { background: "$text", color: "$bg" },
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
  backdropFilter: "blur(12px) saturate(160%)",
  WebkitBackdropFilter: "blur(12px) saturate(160%)",
  transition: "border-color $fast",
  "&:hover": { borderColor: "$borderStrong" },
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
  textTransform: "none",
  letterSpacing: "0.01em",
  variants: {
    accent: {
      true: { background: "rgba(255,255,255,0.08)", borderColor: "$borderStrong" },
    },
    status: {
      online: { background: "rgba(255,255,255,0.1)", borderColor: "$borderStrong" },
      offline: { background: "rgba(255,255,255,0.04)", opacity: 0.72, borderColor: "$border" },
    },
  },
});

export const Grid = styled("div", {
  display: "grid",
  gap: "$6",
  alignItems: "stretch",
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
  padding: "$12 $6 $20",
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
});

export const Heading = styled("h1", {
  fontFamily: "$primary",
  fontWeight: 700,
  fontSize: "$hero",
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
  color: "$text",
});

export const Subheading = styled("p", {
  fontFamily: "$secondary",
  fontWeight: 400,
  fontSize: "$lg",
  color: "$text",
  maxWidth: "36rem",
  lineHeight: 1.7,
  marginTop: "$4",
  opacity: 0.82,
});

export const StatValue = styled("div", {
  fontFamily: "$primary",
  fontSize: "$3xl",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "$text",
});

export const PageWrap = styled("div", {
  minHeight: "100vh",
  paddingTop: "5rem",
  paddingBottom: "$20",
});

export const Muted = styled("span", {
  color: "$text",
  opacity: 0.72,
  fontSize: "$sm",
});
