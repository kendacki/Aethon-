import { styled } from "../stitches.config";
import { AethonLogo } from "./Logo";

export const Footer = styled("footer", {
  marginTop: "auto",
  padding: "$12 $6 $8",
  background: "rgba(0, 0, 0, 0.55)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.45)",
});

const Inner = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
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
  maxWidth: "1200px",
  margin: "$8 auto 0",
  paddingTop: "$6",
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  fontSize: "$xs",
  opacity: 0.5,
});

export function SiteFooter() {
  return (
    <Footer>
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
    </Footer>
  );
}
