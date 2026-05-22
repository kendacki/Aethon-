import { styled } from "../stitches.config";
import { AethonLogo } from "./Logo";

const FooterShell = styled("footer", {
  position: "relative",
  zIndex: 30,
  marginTop: "-$10",
  padding: "$10 $6 $8",
  pointerEvents: "none",
});

const FooterGlass = styled("div", {
  pointerEvents: "auto",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "$12 $8 $6",
  borderRadius: "$xl $xl 0 0",
  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.62) 38%, rgba(0, 0, 0, 0.82) 100%)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderBottom: "none",
  boxShadow: "0 -16px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)",
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 42%)",
    pointerEvents: "none",
  },
});

const Inner = styled("div", {
  position: "relative",
  zIndex: 1,
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
  position: "relative",
  zIndex: 1,
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
      </FooterGlass>
    </FooterShell>
  );
}
