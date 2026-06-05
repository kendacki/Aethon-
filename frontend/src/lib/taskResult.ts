import type { TaskDetailResponse } from "../api/client";

type SkillReportView = {
  headline?: string;
  summary?: string;
  thinking?: string;
  recommendation?: string;
};

export type TaskResultOutput = {
  thinking: string;
  body: string;
  recommendation: string;
  isPending: boolean;
  isFailed: boolean;
};

function titleCaseAsset(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === "ethereum" || lower === "eth") return "Ethereum";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Normalize older agent summaries stored before copy polish. */
function polishLegacySummary(text: string): string {
  const oracleMatch = text.match(
    /^(\w+)\s+spot\s+\$([\d,.]+)\s+USD\s+via\s+(\w+)\s+\(confidence\s+(\d+)%\)/i,
  );
  if (oracleMatch) {
    const [, asset, price, source, conf] = oracleMatch;
    return `${titleCaseAsset(asset)} is $${price} (${conf}% confidence, ${source}).`;
  }

  const staleMatch = text.match(/^(\w+)\s+price\s+\$([\d,.]+)\s+\((\w+)\)\s+—\s+stale/i);
  if (staleMatch) {
    const [, asset, price] = staleMatch;
    return `${titleCaseAsset(asset)} last traded at $${price}, but the quote is no longer fresh.`;
  }

  return text
    .replace(/\bETHEREUM\b/g, "Ethereum")
    .replace(/\s+via\s+/gi, " from ")
    .replace(/\(confidence\s+(\d+)%\)/gi, "($1% confidence)")
    .replace(/\s+—\s+/g, ". ")
    .trim();
}

function cleanCopy(text: string): string {
  return polishLegacySummary(text.replace(/\s+/g, " ").trim());
}

function extractReport(data: Record<string, unknown>, error?: string): {
  body: string;
  recommendation: string;
} {
  const report = data.report as SkillReportView | undefined;
  const body = cleanCopy(String(report?.summary ?? data.summary ?? error ?? ""));

  const recommendation = cleanCopy(
    String(
      report?.recommendation ??
        (typeof data.recommendation === "string" ? data.recommendation : ""),
    ),
  );

  return { body, recommendation };
}

function uniqueSentences(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const sentence = cleanCopy(part);
    if (!sentence || seen.has(sentence.toLowerCase())) continue;
    seen.add(sentence.toLowerCase());
    out.push(sentence);
  }
  return out.join("\n\n");
}

function recommendationDistinct(body: string, recommendation: string): string {
  if (!recommendation) return "";
  const bodyLower = body.toLowerCase();
  const recLower = recommendation.toLowerCase();
  if (bodyLower.includes(recLower) || recLower.includes(bodyLower)) return "";
  return recommendation;
}

export function formatTaskOutput(detail: TaskDetailResponse | null): TaskResultOutput {
  if (!detail) {
    return {
      thinking: "Working on your question...",
      body: "",
      recommendation: "",
      isPending: true,
      isFailed: false,
    };
  }

  const status = detail.task.status;
  const isPending = status === "PENDING" || status === "ASSIGNED";
  const isFailed = status === "FAILED" || status === "EXPIRED";

  if (detail.skillResults.length === 0) {
    return {
      thinking: isPending ? "Working on your question..." : "",
      body: isPending
        ? ""
        : isFailed
          ? "This request could not be completed. Please try again."
          : "No answer was returned for this request.",
      recommendation: isFailed ? "Try asking again with a shorter, more specific question." : "",
      isPending,
      isFailed,
    };
  }

  const parts = detail.skillResults.map((row) =>
    extractReport(row.result.data ?? {}, row.result.error),
  );

  const body = uniqueSentences(parts.map((p) => p.body).filter(Boolean));
  const rawRecommendation = uniqueSentences(parts.map((p) => p.recommendation).filter(Boolean));
  const recommendation = recommendationDistinct(body, rawRecommendation);

  return {
    thinking: isPending && !body ? "Working on your question..." : "",
    body: body || (isPending ? "" : "No answer was returned."),
    recommendation,
    isPending: isPending && !body,
    isFailed,
  };
}

export function isTaskInProgress(status: string): boolean {
  return status === "PENDING" || status === "ASSIGNED";
}
