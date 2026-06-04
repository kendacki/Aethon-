import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSignedIn, type SessionPhase } from "../../auth/useSignedIn";
import { styled } from "../../stitches.config";
import { Button } from "../ui";
import { GlassContent, GlassPanel } from "../GlassPanel";

/* ── Signed-in page shell ── */

const Shell = styled("div", {
  width: "100%",
});

const ContentMax = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  width: "100%",
  padding: "$8 $6 $10",
  boxSizing: "border-box",
});

const FallbackCard = styled(GlassPanel, {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "$10 $8",
  textAlign: "center",
});

type SignedInShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function SignedInShell({ title, description, children, fallback }: SignedInShellProps) {
  const { signedIn, phase } = useSignedIn();

  if (!signedIn) {
    return (
      <Shell>
        <ContentMax>
          {fallback ?? <AuthFallbackCard title={title} description={description} phase={phase} />}
        </ContentMax>
      </Shell>
    );
  }

  return (
    <Shell>
      <ContentMax>{children}</ContentMax>
    </Shell>
  );
}

function AuthFallbackCard({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase: SessionPhase;
}) {
  const hint =
    phase === "wallet"
      ? "Your wallet is connected. Click Sign in in the top right to unlock operator features."
      : "Connect your wallet, then sign in to access swarm controls and personalized data.";

  return (
    <FallbackCard>
      <GlassContent>
        <h2 style={{ fontWeight: 800, fontSize: "1.35rem", marginBottom: "0.75rem" }}>{title}</h2>
        {description && <p style={{ opacity: 0.78, lineHeight: 1.65, marginBottom: "1.25rem" }}>{description}</p>}
        <p style={{ opacity: 0.72, fontSize: "0.875rem", lineHeight: 1.6 }}>{hint}</p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" size="sm" as={Link} to="/">
            Back to overview
          </Button>
        </div>
      </GlassContent>
    </FallbackCard>
  );
}

const BlockTitle = styled("h2", {
  fontSize: "$xl",
  fontWeight: "$extrabold",
  letterSpacing: "-0.02em",
  marginBottom: "$2",
});

const BlockSub = styled("p", {
  fontSize: "$sm",
  opacity: 0.72,
  lineHeight: 1.6,
  marginBottom: "$6",
  maxWidth: "36rem",
});

export function SectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <BlockTitle style={{ marginBottom: 0 }}>{title}</BlockTitle>
          {badge}
        </div>
        {subtitle && <BlockSub style={{ marginBottom: 0, marginTop: "0.5rem" }}>{subtitle}</BlockSub>}
      </div>
    </div>
  );
}
