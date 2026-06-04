import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export const ICON_SM = 20;
export const ICON_MD = 32;
export const ICON_LG = 40;
export const ICON_XL = 48;

const VB = 48;

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: `0 0 ${VB} ${VB}`,
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

/** Isometric face palette (matches dark UI + Somnia accent). */
const F = {
  top: "#FFFFFF",
  left: "rgba(255,255,255,0.58)",
  right: "rgba(255,255,255,0.88)",
  shade: "rgba(255,255,255,0.32)",
  ink: "#0a0a0a",
  accent: "#0dbc82",
  accentDark: "#099566",
  accentLight: "rgba(13,188,130,0.35)",
} as const;

function GroundShadow() {
  return <ellipse cx="24" cy="40" rx="14" ry="4" fill={F.shade} />;
}

/** Isometric box: top (t), left (l), right (r) point arrays in viewBox coords. */
function IsoBox({
  t,
  l,
  r,
  shade,
}: {
  t: string;
  l: string;
  r: string;
  shade?: string;
}) {
  return (
    <>
      {shade ? <path d={shade} fill={F.shade} /> : null}
      <path d={l} fill={F.left} />
      <path d={r} fill={F.right} />
      <path d={t} fill={F.top} />
    </>
  );
}

/** Isometric 3D icons — white faces, depth shading, no background boxes. */
export function IconAgent({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <IsoBox
        shade="M10 28 L24 36 L38 28 L38 26 L24 34 L10 26 Z"
        t="M24 8 L38 16 L24 24 L10 16 Z"
        l="M10 16 L24 24 L24 34 L10 26 Z"
        r="M24 24 L38 16 L38 26 L24 34 Z"
      />
      <circle cx="24" cy="15" r="3.5" fill={F.ink} />
      <path d="M19.5 19.5 H28.5" stroke={F.ink} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M22 22.5 H26" stroke={F.ink} strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function IconTask({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <IsoBox
        t="M24 10 L36 17 L24 24 L12 17 Z"
        l="M12 17 L24 24 L24 36 L12 29 Z"
        r="M24 24 L36 17 L36 29 L24 36 Z"
      />
      <path d="M20 18 H28 V26 H20 Z" fill={F.ink} opacity="0.85" />
      <path d="M22 20 H26 M22 23 H25" stroke={F.top} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function IconShield({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path
        d="M24 7 L38 14 V26 C38 32.5 31.5 38 24 41 C16.5 38 10 32.5 10 26 V14 Z"
        fill={F.left}
      />
      <path
        d="M24 7 L38 14 V26 C38 32.5 31.5 38 24 41 V22 L10 14 Z"
        fill={F.right}
      />
      <path d="M24 7 L38 14 L24 22 L10 14 Z" fill={F.top} />
      <path d="M24 22 V41 C16.5 38 10 32.5 10 26 V14 L24 22 Z" fill={F.right} opacity="0.95" />
      <path d="M24 18 V28" stroke={F.ink} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function IconActivity({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <IsoBox
        t="M14 14 L34 14 L34 30 L14 30 Z"
        l="M14 30 L14 34 L34 34 L34 30 Z"
        r="M34 14 L38 18 L38 34 L34 30 Z"
      />
      <path
        d="M18 28 L22 22 L26 25 L30 16 L34 20"
        stroke={F.accent}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="28" r="2" fill={F.accent} />
      <circle cx="34" cy="20" r="2" fill={F.top} />
    </svg>
  );
}

export function IconTrophy({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path d="M18 36 H30 V38 H18 Z" fill={F.left} />
      <path d="M20 32 H28 V36 H20 Z" fill={F.right} />
      <path d="M16 14 H32 V24 C32 29 28.5 32 24 32 C19.5 32 16 29 16 24 Z" fill={F.left} />
      <path d="M16 14 H24 V32 H16 V24 Z" fill={F.right} />
      <path d="M16 14 H32 V20 H16 Z" fill={F.top} />
      <path d="M12 16 H16 V21 C16 23 13.5 23 12 21 Z" fill={F.shade} />
      <path d="M36 16 H32 V21 C32 23 34.5 23 36 21 Z" fill={F.shade} />
      <ellipse cx="24" cy="20" rx="5" ry="2" fill={F.ink} opacity="0.25" />
    </svg>
  );
}

export function IconMedal({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path d="M17 8 L24 20 L31 8 Z" fill={F.left} />
      <path d="M19 8 L24 20 L29 8 H31 L24 22 L17 8 Z" fill={F.right} />
      <circle cx="24" cy="31" r="11" fill={F.left} />
      <path d="M24 20 A11 11 0 0 1 35 31 L24 31 Z" fill={F.right} />
      <circle cx="24" cy="31" r="7.5" fill={F.ink} />
      <circle cx="24" cy="31" r="4.5" fill={F.accent} />
      <path d="M22 30 L24 33 L28 28" stroke={F.top} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCoalition({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <g transform="translate(-2 2)">
        <IsoBox t="M12 18 L18 21 L12 24 L6 21 Z" l="M6 21 L12 24 L12 28 L6 25 Z" r="M12 24 L18 21 L18 25 L12 28 Z" />
      </g>
      <g transform="translate(8 0)">
        <IsoBox t="M24 14 L30 17 L24 20 L18 17 Z" l="M18 17 L24 20 L24 24 L18 21 Z" r="M24 20 L30 17 L30 21 L24 24 Z" />
      </g>
      <g transform="translate(2 10)">
        <IsoBox t="M20 24 L26 27 L20 30 L14 27 Z" l="M14 27 L20 30 L20 34 L14 31 Z" r="M20 30 L26 27 L26 31 L20 34 Z" />
      </g>
      <path d="M14 22 L20 26" stroke={F.accent} strokeWidth="1.5" strokeOpacity="0.7" />
      <path d="M26 20 L22 26" stroke={F.accent} strokeWidth="1.5" strokeOpacity="0.7" />
    </svg>
  );
}

export function IconTrend({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <IsoBox t="M10 28 L16 28 L16 22 L10 22 Z" l="M10 28 L10 34 L16 34 L16 28 Z" r="M16 22 L16 34 L10 28 Z" />
      <IsoBox t="M18 28 L24 28 L24 16 L18 16 Z" l="M18 28 L18 34 L24 34 L24 28 Z" r="M24 16 L24 34 L18 28 Z" />
      <IsoBox t="M26 28 L32 28 L32 10 L26 10 Z" l="M26 28 L26 34 L32 34 L32 28 Z" r="M32 10 L32 34 L26 28 Z" />
      <path d="M14 24 L20 18 L26 22 L34 10" stroke={F.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 10 H36 V16" stroke={F.top} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path d="M24 6 L42 38 H6 Z" fill={F.left} />
      <path d="M24 6 L42 38 H24 V22 L6 6 Z" fill={F.right} />
      <path d="M24 6 L33 22 H15 Z" fill={F.top} />
      <path d="M24 20 V28" stroke={F.ink} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="32" r="2" fill={F.ink} />
    </svg>
  );
}

export function IconClock({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <ellipse cx="24" cy="27" rx="15" ry="5" fill={F.shade} />
      <circle cx="24" cy="24" r="14" fill={F.left} />
      <path d="M24 10 A14 14 0 0 1 38 24 L24 24 Z" fill={F.right} />
      <circle cx="24" cy="24" r="10.5" fill={F.ink} />
      <path d="M24 16 V24 L30 28" stroke={F.top} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="1.5" fill={F.top} />
    </svg>
  );
}

export function IconArrowLeft({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <IsoBox t="M12 22 L20 14 L28 22 L20 30 Z" l="M12 22 L20 30 L20 34 L12 26 Z" r="M28 22 L28 26 L20 34 L20 30 Z" />
      <path d="M28 22 H36" stroke={F.right} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <IsoBox t="M36 22 L28 14 L20 22 L28 30 Z" l="M20 22 L28 30 L28 34 L20 26 Z" r="M36 22 L36 26 L28 34 L28 30 Z" />
      <path d="M12 22 H20" stroke={F.right} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconHome({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path d="M24 6 L40 18 V34 H28 V24 H20 V34 H8 V18 Z" fill={F.left} />
      <path d="M24 6 L40 18 V34 H24 V24 V6 Z" fill={F.right} />
      <path d="M24 6 L32 14 H16 Z" fill={F.top} />
      <path d="M20 24 H28 V34 H20 Z" fill={F.right} opacity="0.75" />
      <rect x="22" y="26" width="4" height="6" rx="0.5" fill={F.ink} opacity="0.4" />
    </svg>
  );
}

export function IconCheck({ size = ICON_SM, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="24" cy="24" r="14" fill={F.accentLight} />
      <circle cx="24" cy="24" r="14" fill={F.left} />
      <path d="M24 10 A14 14 0 0 1 38 24 L24 24 Z" fill={F.accent} />
      <circle cx="24" cy="24" r="10" fill={F.accentDark} />
      <path d="M16 24 L21 29 L33 17" stroke={F.top} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLock({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path
        d="M16 22 V15 C16 10.03 19.58 6 24 6 C28.42 6 32 10.03 32 15 V22"
        stroke={F.left}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 6 C28.42 6 32 10.03 32 15 V22 H24"
        stroke={F.right}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <IsoBox
        t="M18 22 H30 V24 H18 Z"
        l="M18 24 L18 36 L24 36 L24 22 Z"
        r="M30 22 L30 36 L24 36 L24 22 Z"
      />
      <circle cx="24" cy="29" r="3" fill={F.ink} opacity="0.45" />
      <rect x="22.5" y="28" width="3" height="4" rx="0.5" fill={F.top} opacity="0.6" />
    </svg>
  );
}

export function IconAudit({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <IsoBox
        t="M14 12 H30 L26 8 H14 Z"
        l="M14 12 L14 36 L24 36 L24 12 Z"
        r="M30 12 L30 36 L24 36 L24 12 Z"
      />
      <path d="M18 18 H28 M18 23 H26 M18 28 H24" stroke={F.ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <g transform="translate(4 4)">
        <circle cx="32" cy="32" r="9" fill={F.accentLight} />
        <circle cx="32" cy="32" r="9" fill={F.accent} />
        <path d="M28 32 L31 35 L37 28" stroke={F.top} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function IconVault({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <GroundShadow />
      <path
        d="M12 20 V14 C12 9.58 17 6 24 6 C31 6 36 9.58 36 14 V20"
        stroke={F.shade}
        strokeWidth="2.5"
        fill="none"
      />
      <IsoBox
        t="M10 20 H38 V22 H10 Z"
        l="M10 22 L10 36 L24 36 L24 20 Z"
        r="M38 20 L38 36 L24 36 L24 20 Z"
      />
      <circle cx="24" cy="28" r="4" fill={F.ink} opacity="0.5" />
      <circle cx="24" cy="28" r="2.5" fill={F.top} />
      <path d="M22 26 H26" stroke={F.ink} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
