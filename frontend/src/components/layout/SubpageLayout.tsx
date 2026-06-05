import type { ReactNode } from "react";
import { styled } from "../../stitches.config";
import { Heading } from "../ui";

export const PageContent = styled("div", {
  width: "100%",
  maxWidth: "48rem",
  margin: "0 auto",
});

export const PageContentWide = styled("div", {
  width: "100%",
  maxWidth: "64rem",
  margin: "0 auto",
});

export const SubpageHeroStack = styled("div", {
  maxWidth: "36rem",
});

export const SubpageTitle = styled(Heading, {
  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
  marginTop: "$4",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
});

export const SubpageLead = styled("p", {
  marginTop: "$3",
  maxWidth: "32rem",
  fontSize: "$md",
  lineHeight: 1.6,
  opacity: 0.72,
});

export const SectionHeading = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "$3",
  marginBottom: "$4",
});

export const SectionHeadingTitle = styled("h2", {
  margin: 0,
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  opacity: 0.55,
  fontFamily: "$secondary",
});

export const SectionHeadingMeta = styled("span", {
  fontSize: "0.75rem",
  opacity: 0.6,
});

type SubpageHeroProps = {
  badge?: ReactNode;
  title: string;
  lead?: string;
};

export function SubpageHero({ badge, title, lead }: SubpageHeroProps) {
  return (
    <SubpageHeroStack>
      {badge}
      <SubpageTitle>{title}</SubpageTitle>
      {lead ? <SubpageLead>{lead}</SubpageLead> : null}
    </SubpageHeroStack>
  );
}
