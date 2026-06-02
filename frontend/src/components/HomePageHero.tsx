import type { ReactNode } from "react";
import Lottie from "lottie-react";
import { styled } from "../stitches.config";
import { PageHeroShell } from "./PageHero";
import homeHeroAnimation from "../assets/home-hero-bg.json";

const HeroLottieLayer = styled("div", {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
});

const HeroLottieFrame = styled("div", {
  position: "absolute",
  width: "min(160vmin, 1100px)",
  height: "min(160vmin, 1100px)",
  right: "50%",
  top: "50%",
  transform: "translate(15%, -50%)",
  opacity: 1,
  filter: "saturate(1.15) brightness(1.08)",
  "@sm": {
    transform: "translate(25%, -50%)",
    width: "min(150vmin, 1000px)",
    height: "min(150vmin, 1000px)",
  },
  "@lg": {
    transform: "translate(42%, -50%)",
    width: "min(95vw, 920px)",
    height: "min(95vw, 920px)",
  },
});

const HomeHeroScrim = styled("div", {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 38%, rgba(0,0,0,0.42) 62%, rgba(0,0,0,0.18) 100%)",
  "@md": {
    background:
      "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.12) 100%)",
  },
});

const HomeHeroInner = styled("div", {
  position: "relative",
  zIndex: 2,
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "clamp(2rem, 5vw, 3.5rem) clamp(1.25rem, 4vw, 1.5rem)",
  width: "100%",
  boxSizing: "border-box",
});

const HomeHeroVignette = styled("div", {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
  background:
    "radial-gradient(ellipse 80% 70% at 70% 50%, rgba(13, 188, 130, 0.12) 0%, transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.5) 100%)",
});

type HomePageHeroProps = {
  children: ReactNode;
};

/** Overview / home hero with Lottie background (signed-in and signed-out). */
export function HomePageHero({ children }: HomePageHeroProps) {
  return (
    <PageHeroShell size="tall">
      <HeroLottieLayer aria-hidden>
        <HeroLottieFrame>
          <Lottie
            animationData={homeHeroAnimation}
            loop
            autoplay
            rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
            style={{ width: "100%", height: "100%" }}
          />
        </HeroLottieFrame>
      </HeroLottieLayer>
      <HomeHeroVignette aria-hidden />
      <HomeHeroScrim aria-hidden />
      <HomeHeroInner>{children}</HomeHeroInner>
    </PageHeroShell>
  );
}
