import { styled } from "../stitches.config";
import { GlassContent, GlassPanel } from "./GlassPanel";
import { AethonLogo } from "./Logo";

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
              <p style={{ fontSize: "0.875rem", opacity: 0.72, maxWidth: 280, lineHeight: 1.7 }}>
                Autonomous Emergent Trading & Hierarchical Operations Network. A self governing agent economy.
              </p>
            </div>
            <div>
              <ColTitle>Network</ColTitle>
              <Link href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer">Explorer</Link>
              <Link href="https://docs.somnia.network" target="_blank" rel="noreferrer">Documentation</Link>
            </div>
            <div>
              <ColTitle>Protocol</ColTitle>
              <Link href="/agents">Agent Fleet</Link>
              <Link href="/tasks">Task Market</Link>
              <Link href="/governance">Governance</Link>
            </div>
            <div>
              <ColTitle>Developers</ColTitle>
              <Link href="/v1/health">API Health</Link>
              <Link href="/docs">OpenAPI</Link>
            </div>
          </Inner>
          <Copyright>© 2026 AETHON Protocol</Copyright>
        </GlassContent>
      </FooterGlass>
    </FooterShell>
  );
}
