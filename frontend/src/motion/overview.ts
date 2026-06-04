import type { Transition, Variants } from "framer-motion";
import { spring } from "../stitches.config";

export const easeOut = [0.22, 1, 0.36, 1] as const;

/** Full-page enter/exit (route and signed-in mode switches). */
export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: spring,
};

export const heroBgTransition: Transition = {
  duration: 1.45,
  ease: easeOut,
};

export const heroScrimTransition: Transition = {
  duration: 0.9,
  ease: easeOut,
  delay: 0.08,
};

export const heroSequence: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.38,
    },
  },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.72, ease: easeOut },
  },
};

export const heroButton: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 440, damping: 26, mass: 0.75 },
  },
};

export const statsSequence: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.12,
    },
  },
};

export const statCard: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 360, damping: 26, mass: 0.85 },
  },
};

export const statValue: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: easeOut, delay: 0.06 },
  },
};

export const protocolPanel: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.82, ease: easeOut },
  },
};

export const protocolContent: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.22,
    },
  },
};

export const protocolItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: easeOut },
  },
};

export const protocolCards: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.08,
    },
  },
};

export const protocolCard: Variants = {
  hidden: { opacity: 0, y: 22, rotateX: -4 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { type: "spring", stiffness: 320, damping: 28, mass: 0.9 },
  },
};

export const healthSequence: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.18,
    },
  },
};

export const healthBadge: Variants = {
  hidden: { opacity: 0, scale: 0.88, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 24, mass: 0.7 },
  },
};

export const viewportOnce = { once: true, margin: "-8% 0px -6% 0px" as const };
