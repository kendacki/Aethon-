import { styled } from "../stitches.config";

const Banner = styled("div", {
  marginTop: "$4",
  padding: "$4 $5",
  borderRadius: "$lg",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.06)",
  fontSize: "$sm",
  color: "$text",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$4",
  flexWrap: "wrap",
});

const RetryBtn = styled("button", {
  fontSize: "$xs",
  fontWeight: "$semibold",
  padding: "$2 $4",
  borderRadius: "$pill",
  border: "1px solid $borderStrong",
  background: "transparent",
  color: "$text",
  cursor: "pointer",
  "&:hover": { background: "rgba(255,255,255,0.08)" },
});

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string | null | undefined;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <Banner role="alert">
      <span>{message}</span>
      {onRetry && (
        <RetryBtn type="button" onClick={onRetry}>
          Retry
        </RetryBtn>
      )}
    </Banner>
  );
}
