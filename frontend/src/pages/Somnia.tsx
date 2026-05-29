import { api } from "../api/client";
import { useFetch } from "../api/hooks";
import { SomniaPanel } from "../components/SomniaPanel";
import { ErrorBanner } from "../components/ErrorBanner";
import { Badge, PageWrap, Section, Heading } from "../components/ui";
import { env } from "../config/env";

export default function SomniaPage() {
  const { data: report, loading, error, reload } = useFetch(() => api.somniaReport(), []);

  return (
    <PageWrap>
      <Section>
        <Badge accent>Somnia Agentic L1</Badge>
        <Heading style={{ fontSize: "2.5rem", marginTop: "1rem" }}>Network integration</Heading>
        <p style={{ marginTop: "0.5rem", maxWidth: 640, opacity: 0.82, lineHeight: 1.65 }}>
          Live compatibility report from the AETHON API. Shows how our fleet connects to Somnia platform agents,
          the Agent Kit registry, and per-agent vault reserves — synchronized with on-chain deployments.
        </p>

        <ErrorBanner message={error} onRetry={reload} />

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Badge>Chain {env.somniaChainId}</Badge>
          {report?.network.explorer && (
            <a href={report.network.explorer} target="_blank" rel="noreferrer">
              <Badge accent>Agent Explorer</Badge>
            </a>
          )}
          <a href="https://docs.somnia.network/agents" target="_blank" rel="noreferrer">
            <Badge accent>Somnia docs</Badge>
          </a>
        </div>

        <SomniaPanel report={report} loading={loading} showAllModules />
      </Section>
    </PageWrap>
  );
}
