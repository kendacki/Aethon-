import { styled } from "../stitches.config";

export const Footer = styled("footer", {
  borderTop: "1px solid $border",
  padding: "$12 $6",
  marginTop: "auto",
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
  color: "$textDim",
  marginBottom: "$4",
});

const Link = styled("a", {
  display: "block",
  fontSize: "$sm",
  color: "$textMuted",
  marginBottom: "$2",
  "&:hover": { color: "$text" },
});

export function SiteFooter() {
  return (
    <Footer>
      <Inner>
        <div>
          <img src="/logo-white.svg" alt="AETHON" style={{ height: 28, marginBottom: 16 }} />
          <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", maxWidth: 280, lineHeight: 1.7 }}>
            Autonomous Emergent Trading & Hierarchical Operations Network — Somnia Agentic L1 native.
          </p>
        </div>
        <div>
          <ColTitle>Network</ColTitle>
          <Link href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer">Explorer</Link>
          <Link href="https://docs.somnia.network" target="_blank" rel="noreferrer">Somnia Docs</Link>
        </div>
        <div>
          <ColTitle>Protocol</ColTitle>
          <Link href="/agents">Agent Fleet</Link>
          <Link href="/tasks">Task Market</Link>
          <Link href="/governance">Governance</Link>
        </div>
        <div>
          <ColTitle>Status</ColTitle>
          <Link href="/v1/health">API Health</Link>
          <Link href="/docs">OpenAPI</Link>
        </div>
      </Inner>
      <div style={{ maxWidth: 1200, margin: "2rem auto 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
        © 2026 AETHON Protocol — Chain ID 50312
      </div>
    </Footer>
  );
}
