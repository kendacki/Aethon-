import { Link as RouterLink } from "react-router-dom";
import { styled } from "../stitches.config";
import { GlassContent, GlassPanel } from "./GlassPanel";
import { AethonLogo } from "./Logo";
import { env } from "../config/env";

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
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
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
                Autonomous Emergent Trading & Hierarchical Operations Network — a self-governing agent economy on Somnia
                Shannon Testnet.
              </p>
            </div>
            <div>
              <ColTitle>Network</ColTitle>
              <Link href={env.somniaExplorer} target="_blank" rel="noreferrer">Block explorer</Link>
              <Link href="https://agents.testnet.somnia.network" target="_blank" rel="noreferrer">Agent explorer</Link>
              <Link href="https://docs.somnia.network" target="_blank" rel="noreferrer">Somnia docs</Link>
            </div>
            <div>
              <ColTitle>Protocol</ColTitle>
              <FooterLink to="/agents">Agent fleet</FooterLink>
              <FooterLink to="/tasks">Task market</FooterLink>
              <FooterLink to="/somnia">Somnia integration</FooterLink>
              <FooterLink to="/governance">Governance</FooterLink>
            </div>
            <div>
              <ColTitle>Developers</ColTitle>
              <Link href={env.apiHealthUrl} target="_blank" rel="noreferrer">API health</Link>
              <Link href={env.apiDocsUrl} target="_blank" rel="noreferrer">OpenAPI</Link>
              <Link href={`${env.apiBase}/somnia/agents`} target="_blank" rel="noreferrer">Somnia report JSON</Link>
            </div>
          </Inner>
          <Copyright>© 2026 AETHON Protocol · Chain {env.somniaChainId}</Copyright>
        </GlassContent>
      </FooterGlass>
    </FooterShell>
  );
}
