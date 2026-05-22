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
      bg: "#0A0A0A",
      bgElevated: "#111111",
      bgCard: "rgba(255,255,255,0.04)",
      bgGlass: "rgba(255,255,255,0.06)",
      surface: "#161616",
      surfaceLight: "#F5F5F5",
      border: "rgba(255,255,255,0.08)",
      borderStrong: "rgba(255,255,255,0.16)",
      text: "#FFFFFF",
      textMuted: "rgba(255,255,255,0.62)",
      textDim: "rgba(255,255,255,0.38)",
      purple: "#7C3AED",
      purpleGlow: "rgba(124,58,237,0.35)",
      orange: "#FF6B2C",
      orangeGlow: "rgba(255,107,44,0.35)",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
    },
    fonts: {
      sans: "Montserrat, system-ui, sans-serif",
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
    shadows: {
      glow: "0 0 60px rgba(124,58,237,0.25)",
      glowOrange: "0 0 60px rgba(255,107,44,0.25)",
      card: "0 8px 32px rgba(0,0,0,0.4)",
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
  utils: {
    glass: () => ({
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
    }),
  },
});

export const lightSection = css({
  background: "$surfaceLight",
  color: "#0A0A0A",
});

export const spring = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.8 };
