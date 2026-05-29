import type { CSSProperties } from "react";

type LogoProps = {
  height?: number;
  className?: string;
  style?: CSSProperties;
};

/** Self-contained SVG wordmark — no external assets required. */
export function AethonLogo({ height = 32, className, style }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 40"
      role="img"
      aria-label="AETHON"
      className={className}
      style={{ height, width: "auto", display: "block", ...style }}
    >
      <defs>
        <linearGradient id="aethon-mark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.72)" />
        </linearGradient>
      </defs>
      <polygon
        points="4,36 20,4 36,36 28,36 24,28 16,28 12,36"
        fill="url(#aethon-mark)"
        opacity="0.95"
      />
      <rect x="18" y="22" width="4" height="6" fill="#000000" opacity="0.85" />
      <text
        x="46"
        y="28"
        fill="#FFFFFF"
        fontFamily="Montserrat, system-ui, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="0.12em"
      >
        AETHON
      </text>
    </svg>
  );
}
