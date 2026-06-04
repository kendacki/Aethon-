import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { PageHero } from "../PageHero";
import { Section } from "../ui";
import {
  heroButton,
  heroItem,
  heroSequence,
  pageTransition,
  protocolContent,
  protocolItem,
  protocolPanel,
  statCard,
  statsSequence,
  viewportOnce,
} from "../../motion/overview";

type PageMotionProps = {
  children: ReactNode;
  motionKey?: string;
};

export function PageMotion({ children, motionKey }: PageMotionProps) {
  return (
    <motion.div key={motionKey} style={{ width: "100%" }} {...pageTransition}>
      {children}
    </motion.div>
  );
}

type AnimatedPageHeroProps = {
  children: ReactNode;
  tall?: boolean;
};

export function AnimatedPageHero({ children, tall }: AnimatedPageHeroProps) {
  return (
    <PageHero tall={tall}>
      <motion.div variants={heroSequence} initial="hidden" animate="show">
        {children}
      </motion.div>
    </PageHero>
  );
}

export function HeroItem({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <motion.div variants={heroItem} style={style}>
      {children}
    </motion.div>
  );
}

export function HeroActions({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <motion.div variants={heroButton} style={style}>
      {children}
    </motion.div>
  );
}

type AnimatedSectionProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export function AnimatedSection({ children, style }: AnimatedSectionProps) {
  return (
    <Section style={style}>
      <motion.div variants={protocolPanel} initial="hidden" whileInView="show" viewport={viewportOnce}>
        <motion.div variants={protocolContent} initial="hidden" whileInView="show" viewport={viewportOnce}>
          <motion.div variants={protocolItem}>{children}</motion.div>
        </motion.div>
      </motion.div>
    </Section>
  );
}

type StaggerGridProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function StaggerGrid({ children, style }: StaggerGridProps) {
  return (
    <motion.div variants={statsSequence} initial="hidden" whileInView="show" viewport={viewportOnce} style={style}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <motion.div variants={statCard} style={style}>
      {children}
    </motion.div>
  );
}

export { heroSequence, heroItem, heroButton, statsSequence, statCard, protocolPanel, protocolContent, protocolItem, viewportOnce, pageTransition };
