import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { heroBgTransition, heroScrimTransition } from "../motion/overview";
import { styled } from "../stitches.config";

/** 3840px wide hero background (public/bg-hero-4k.png). */
export const HERO_BG_URL = "/bg-hero-4k.png";

export const PageHeroShell = styled("section", {
  width: "100%",
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#000000",
  variants: {
    size: {
      default: {
        minHeight: "clamp(140px, 20vh, 260px)",
      },
      tall: {
        minHeight: "clamp(320px, 62vh, 720px)",
        display: "flex",
        alignItems: "center",
      },
    },
  },
  defaultVariants: { size: "default" },
});

export const PageHeroBg = styled("div", {
  position: "absolute",
  inset: 0,
  backgroundImage: `url(${HERO_BG_URL})`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center center",
  backgroundSize: "cover",
  transform: "translateZ(0)",
  "@sm": {
    backgroundPosition: "65% center",
  },
  "@lg": {
    backgroundPosition: "center center",
  },
  "@media (min-width: 1920px)": {
    backgroundSize: "cover",
  },
  "@media (min-width: 2560px)": {
    backgroundSize: "cover",
  },
});

export const PageHeroScrim = styled("div", {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 42%, rgba(0,0,0,0.52) 68%, rgba(0,0,0,0.38) 100%)",
  "@md": {
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.4) 100%)",
  },
});

export const PageHeroInner = styled("div", {
  position: "relative",
  zIndex: 1,
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "clamp(2rem, 5vw, 3.5rem) clamp(1.25rem, 4vw, 1.5rem)",
  width: "100%",
  boxSizing: "border-box",
});

type PageHeroProps = {
  children: ReactNode;
  tall?: boolean;
};

const MotionHeroBg = motion.create(PageHeroBg);
const MotionHeroScrim = motion.create(PageHeroScrim);

export function PageHero({ children, tall }: PageHeroProps) {
  return (
    <PageHeroShell size={tall ? "tall" : "default"}>
      <MotionHeroBg
        aria-hidden
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={heroBgTransition}
      />
      <MotionHeroScrim
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={heroScrimTransition}
      />
      <PageHeroInner>{children}</PageHeroInner>
    </PageHeroShell>
  );
}
