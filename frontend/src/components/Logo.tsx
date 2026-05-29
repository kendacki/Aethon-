import type { CSSProperties } from "react";

type LogoProps = {
  height?: number;
  className?: string;
  style?: CSSProperties;
};

/** White AN monogram on transparent background. */
const LOGO_SRC = "/logo-white.png";

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
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
