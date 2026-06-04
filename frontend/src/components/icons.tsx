import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export const ICON_SM = 20;
export const ICON_MD = 32;
export const ICON_LG = 40;
export const ICON_XL = 48;

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

/** Isometric 3D icons — no background containers, white faces with depth shading */
export function IconAgent({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M24 6 L38 14 L38 26 L24 34 L10 26 L10 14 Z" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M24 6 L38 14 L38 26 L24 34 L24 22 L10 14 Z" fill="#FFFFFF" fillOpacity="0.65" />
      <path d="M24 6 L38 14 L24 22 L10 14 Z" fill="#FFFFFF" />
      <path d="M24 22 L38 26 L24 34 L10 26 Z" fill="#FFFFFF" fillOpacity="0.85" />
      <circle cx="24" cy="17" r="3" fill="#000000" />
      <path d="M20 21 H28" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTask({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M14 30 L24 36 L34 30 L34 18 L24 12 L14 18 Z" fill="#FFFFFF" fillOpacity="0.4" />
      <path d="M24 12 L34 18 L34 30 L24 36 L24 24 L14 18 Z" fill="#FFFFFF" fillOpacity="0.7" />
      <path d="M24 12 L34 18 L24 24 L14 18 Z" fill="#FFFFFF" />
      <path d="M24 24 L34 30 L24 36 L14 30 Z" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M22 20 L26 20 L26 26 L22 26 Z" fill="#000000" />
    </svg>
  );
}

export function IconShield({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M24 8 L36 14 V26 C36 32 30 38 24 40 C18 38 12 32 12 26 V14 Z" fill="#FFFFFF" fillOpacity="0.45" />
      <path d="M24 8 L36 14 V26 C36 32 30 38 24 40 V24 L12 14 Z" fill="#FFFFFF" fillOpacity="0.75" />
      <path d="M24 8 L36 14 L24 24 L12 14 Z" fill="#FFFFFF" />
      <path d="M24 24 V40 C18 38 12 32 12 26 V14 L24 24 Z" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

export function IconActivity({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M8 34 L16 22 L24 28 L32 14 L40 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 34 L16 22 L24 28 L32 14 L40 18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" transform="translate(0 2)" />
      <circle cx="8" cy="34" r="2.5" fill="#FFFFFF" />
      <circle cx="40" cy="18" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

export function IconTrophy({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M16 14 H32 V22 C32 28 28 32 24 32 C20 32 16 28 16 22 Z" fill="#FFFFFF" fillOpacity="0.55" />
      <path d="M16 14 H32 V22 C32 28 28 32 24 32 V22 H16 Z" fill="#FFFFFF" fillOpacity="0.85" />
      <path d="M16 14 H24 V32 H16 V22 Z" fill="#FFFFFF" />
      <path d="M20 32 H28 V36 H20 Z" fill="#FFFFFF" fillOpacity="0.7" />
      <path d="M18 36 H30 V38 H18 Z" fill="#FFFFFF" />
      <path d="M12 16 H16 V20 C16 22 14 22 12 20 Z" fill="#FFFFFF" fillOpacity="0.5" />
      <path d="M36 16 H32 V20 C32 22 34 22 36 20 Z" fill="#FFFFFF" fillOpacity="0.5" />
    </svg>
  );
}

export function IconMedal({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M18 8 L24 18 L30 8" fill="#FFFFFF" fillOpacity="0.6" />
      <path d="M18 8 L21 8 L24 18 L27 8 L30 8 L24 20 Z" fill="#FFFFFF" />
      <circle cx="24" cy="30" r="10" fill="#FFFFFF" fillOpacity="0.45" />
      <circle cx="24" cy="30" r="10" fill="#FFFFFF" fillOpacity="0.75" clipPath="inset(0 50% 0 0)" />
      <circle cx="24" cy="30" r="7" fill="#000000" />
      <circle cx="24" cy="30" r="4" fill="#FFFFFF" />
    </svg>
  );
}

export function IconCoalition({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <circle cx="16" cy="20" r="7" fill="#FFFFFF" fillOpacity="0.55" />
      <circle cx="32" cy="20" r="7" fill="#FFFFFF" fillOpacity="0.75" />
      <circle cx="24" cy="32" r="7" fill="#FFFFFF" />
      <path d="M16 20 L24 32" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M32 20 L24 32" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M16 20 L32 20" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}

export function IconTrend({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M10 34 L10 14 H14 V30 H34 V34 Z" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M14 30 L22 22 L28 26 L38 12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 12 H38 V18" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M24 8 L40 36 H8 Z" fill="#FFFFFF" fillOpacity="0.5" />
      <path d="M24 8 L40 36 H8 Z" fill="#FFFFFF" fillOpacity="0.85" clipPath="inset(0 50% 0 0)" />
      <path d="M24 18 V26" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="31" r="1.5" fill="#000000" />
    </svg>
  );
}

export function IconClock({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <ellipse cx="24" cy="26" rx="14" ry="6" fill="#FFFFFF" fillOpacity="0.25" />
      <circle cx="24" cy="24" r="14" fill="#FFFFFF" fillOpacity="0.45" />
      <circle cx="24" cy="24" r="14" fill="#FFFFFF" fillOpacity="0.75" clipPath="inset(0 50% 0 0)" />
      <circle cx="24" cy="24" r="11" fill="#000000" />
      <path d="M24 16 V24 L30 28" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowLeft({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M28 12 L16 24 L28 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 24 H36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M20 12 L32 24 L20 36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 24 H12" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Compact check — security checklist status */
export function IconCheck({ size = ICON_SM, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="10" fill="#0dbc82" fillOpacity="0.2" stroke="#0dbc82" strokeWidth="1.5" />
      <path d="M8 12.5 L10.5 15 L16 9.5" stroke="#0dbc82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Lock — access control / authorized contracts */
export function IconLock({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <rect x="14" y="22" width="20" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M16 22 V16 C16 11.58 19.58 8 24 8 C28.42 8 32 11.58 32 16 V22" stroke="#FFFFFF" strokeWidth="2.5" fill="#FFFFFF" fillOpacity="0.45" />
      <path d="M16 22 V16 C16 11.58 19.58 8 24 8 C28.42 8 32 11.58 32 16 V22" stroke="#FFFFFF" strokeWidth="1.5" fill="#FFFFFF" fillOpacity="0.75" clipPath="inset(0 50% 0 0)" />
      <rect x="20" y="24" width="8" height="10" rx="1" fill="#FFFFFF" />
      <circle cx="24" cy="28" r="2" fill="#000000" />
    </svg>
  );
}

/** Document with check — audits resolved */
export function IconAudit({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M14 10 H30 V38 H14 Z" fill="#FFFFFF" fillOpacity="0.4" />
      <path d="M14 10 H22 V38 H14 Z" fill="#FFFFFF" fillOpacity="0.7" />
      <path d="M18 10 H30 L26 6 H18 Z" fill="#FFFFFF" />
      <path d="M18 18 H28 M18 24 H26 M18 30 H24" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35" />
      <circle cx="32" cy="32" r="8" fill="#0dbc82" fillOpacity="0.35" />
      <path d="M29 32 L31 34 L35 29" stroke="#0dbc82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Vault / treasury */
export function IconVault({ size = ICON_MD, ...props }: IconProps) {
  return (
    <svg {...base(size)} {...props}>
      <path d="M10 20 H38 V36 H10 Z" fill="#FFFFFF" fillOpacity="0.45" />
      <path d="M10 20 H24 V36 H10 Z" fill="#FFFFFF" fillOpacity="0.75" />
      <path d="M14 20 V14 C14 10.5 18.5 8 24 8 C29.5 8 34 10.5 34 14 V20" stroke="#FFFFFF" strokeWidth="2" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M14 20 V14 C14 10.5 18.5 8 24 8 C29.5 8 34 10.5 34 14 V20" stroke="#FFFFFF" strokeWidth="1.5" fill="#FFFFFF" fillOpacity="0.6" clipPath="inset(0 50% 0 0)" />
      <circle cx="24" cy="28" r="3" fill="#FFFFFF" />
    </svg>
  );
}
