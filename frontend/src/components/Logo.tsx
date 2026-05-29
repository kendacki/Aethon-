import type { CSSProperties } from "react";

type LogoProps = {
  height?: number;
  className?: string;
  style?: CSSProperties;
};

/** AN monogram — rendered white via CSS filter on dark UI. */
const LOGO_SRC = "/logo-an-source.png";
const LOGO_WHITE = "brightness(0) invert(1)";

export function AethonLogo({ height = 32, className, style }: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="AETHON"
      role="img"
      aria-label="AETHON"
      className={className}
      draggable={false}
      style={{
        height,
        width: "auto",
        display: "block",
        filter: LOGO_WHITE,
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
