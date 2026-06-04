import { Link as RouterLink } from "react-router-dom";
import { styled } from "../stitches.config";
import { GlassContent, GlassPanel } from "./GlassPanel";
import { AethonLogo } from "./Logo";
import { env } from "../config/env";
import { MAIN_NAV } from "../config/navigation";

const FooterShell = styled("footer", {
  position: "relative",
  zIndex: 30,
  marginTop: "-$10",
  padding: "$10 $6 $8",
  pointerEvents: "none",
});

const FooterGlass = styled(GlassPanel, {
  pointerEvents: "auto",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$12 $8 $6",
  defaultVariants: { radius: "top" },
});

const Inner = styled("div", {
  display: "grid",
  gap: "$8",
  "@md": { gridTemplateColumns: "2fr 1fr 1fr 1fr" },
});

const ColTitle = styled("div", {
  fontSize: "$xs",
  fontWeight: "$semibold",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: 0.72,
  marginBottom: "$4",
});

const Link = styled("a", {
  display: "block",
  fontSize: "$sm",
  color: "$text",
  opacity: 0.72,
  marginBottom: "$2",
  transition: "opacity 150ms ease",
  "&:hover": { opacity: 1 },
});

const FooterLink = styled(RouterLink, {
  display: "block",
  fontSize: "$sm",
  color: "$text",
  opacity: 0.72,
  marginBottom: "$2",
  transition: "opacity 150ms ease",
  textDecoration: "none",
  "&:hover": { opacity: 1 },
});

const Copyright = styled("div", {
  marginTop: "$8",
  paddingTop: "$6",
  borderTop: "1px solid $glassDivider",
  fontSize: "$xs",
  opacity: 0.5,
});

export function SiteFooter() {
  return (
    <FooterShell>
      <FooterGlass>
        <GlassContent>
          <Inner>
            <div>
              <AethonLogo height={36} style={{ marginBottom: 16 }} />
              <p style={{ fontSize: "0.875rem", opacity: 0.72, maxWidth: 300, lineHeight: 1.7 }}>
                Autonomous agent network on Somnia. Five agents, one task market, settlement on-chain.
              </p>
            </div>
            <div>
              <ColTitle>Network</ColTitle>
              <Link href={env.somniaExplorer} target="_blank" rel="noreferrer">Block explorer</Link>
            </div>
            <div>
              <ColTitle>Explore</ColTitle>
              {MAIN_NAV.map((item) => (
                <FooterLink key={item.to} to={item.to}>
                  {item.label}
                </FooterLink>
              ))}
            </div>
            <div>
              <ColTitle>Developers</ColTitle>
              <Link href={env.apiHealthUrl} target="_blank" rel="noreferrer">API health</Link>
              <Link href={env.apiDocsUrl} target="_blank" rel="noreferrer">OpenAPI</Link>
            </div>
          </Inner>
          <Copyright>© 2026 AETHON. Chain {env.somniaChainId}</Copyright>
        </GlassContent>
      </FooterGlass>
    </FooterShell>
  );
}
