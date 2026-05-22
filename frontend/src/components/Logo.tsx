import { useId, type CSSProperties } from "react";

type LogoProps = {
  height?: number;
  className?: string;
  style?: CSSProperties;
};

/** Inline SVG so filters + image href work (broken when loaded via <img src="logo-white.svg">). */
export function AethonLogo({ height = 32, className, style }: LogoProps) {
  const filterId = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="80 60 360 320"
      role="img"
      aria-label="AETHON"
      className={className}
      style={{ height, width: "auto", display: "block", ...style }}
    >
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1 -1 -1 0 1" />
        </filter>
      </defs>
      <image
        href="/logo-an-source.png"
        width="512"
        height="400"
        filter={`url(#${filterId})`}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
