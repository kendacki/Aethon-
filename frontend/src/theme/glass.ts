/** Shared glassmorphism palette for panels, cards, and surfaces. */
export const GLASS = {
  border: "rgba(255, 255, 255, 0.12)",
  borderSoft: "rgba(255, 255, 255, 0.1)",
  borderHover: "rgba(255, 255, 255, 0.22)",
  divider: "rgba(255, 255, 255, 0.08)",
  fill: "rgba(255, 255, 255, 0.04)",
  fillMuted: "rgba(255, 255, 255, 0.06)",
  fillHover: "rgba(255, 255, 255, 0.08)",
  highlight: "rgba(255, 255, 255, 0.35)",
  sheen: "rgba(255, 255, 255, 0.06)",
  accentBorder: "rgba(13, 188, 130, 0.22)",
  accentBorderCard: "rgba(13, 188, 130, 0.2)",
  accentBorderHover: "rgba(13, 188, 130, 0.35)",
  accentBorderStrong: "rgba(13, 188, 130, 0.45)",
  accentFill: "rgba(13, 188, 130, 0.14)",
  accentFillSoft: "rgba(13, 188, 130, 0.06)",
  accentFillMedium: "rgba(13, 188, 130, 0.1)",
  gradient: {
    panel:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.62) 38%, rgba(0, 0, 0, 0.82) 100%)",
    panelAccent:
      "linear-gradient(165deg, rgba(13, 188, 130, 0.06) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.88) 100%)",
    card:
      "linear-gradient(165deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.88) 100%)",
    cardAccent:
      "linear-gradient(165deg, rgba(13, 188, 130, 0.1) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.88) 100%)",
    modalAccent:
      "linear-gradient(165deg, rgba(13, 188, 130, 0.1) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.96) 100%)",
    shimmer:
      "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.04) 100%)",
  },
  blur: {
    panel: "blur(24px) saturate(180%)",
    card: "blur(22px) saturate(160%)",
    sm: "blur(12px) saturate(160%)",
  },
  shadow: {
    panel: "0 16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    panelTop: "0 -16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    card: "0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    cardInset: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    metric: "0 8px 32px rgba(0, 0, 0, 0.35)",
  },
} as const;
