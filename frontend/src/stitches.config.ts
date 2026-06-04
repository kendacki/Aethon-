import { createStitches } from "@stitches/react";

export const {
  styled,
  css,
  globalCss,
  keyframes,
  theme,
  createTheme,
  getCssText,
} = createStitches({
  theme: {
    colors: {
      bg: "#000000",
      bgElevated: "#000000",
      bgCard: "rgba(255,255,255,0.04)",
      bgGlass: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.12)",
      borderStrong: "rgba(255,255,255,0.28)",
      text: "#FFFFFF",
      textMuted: "#FFFFFF",
      textDim: "rgba(255,255,255,0.72)",
    },
    fonts: {
      primary: "Poppins, system-ui, sans-serif",
      secondary: "Poppins, system-ui, sans-serif",
      sans: "Poppins, system-ui, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    fontSizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.5rem",
      "2xl": "2rem",
      "3xl": "2.75rem",
      "4xl": "3.5rem",
      hero: "clamp(2.5rem, 5vw, 4.5rem)",
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    space: {
      1: "0.25rem",
      2: "0.5rem",
      3: "0.75rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      8: "2rem",
      10: "2.5rem",
      12: "3rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
    },
    radii: {
      sm: "0.5rem",
      md: "0.75rem",
      lg: "1rem",
      xl: "1.25rem",
      pill: "9999px",
    },
    transitions: {
      fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
      base: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  media: {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)",
    lg: "(min-width: 1024px)",
    xl: "(min-width: 1280px)",
  },
});

export const spring = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.8 };
