import type { TaskDetailResponse } from "../api/client";

type SkillReportView = {
  headline?: string;
  summary?: string;
  thinking?: string;
  recommendation?: string;
  sections?: Array<{ title: string; lines: string[] }>;
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

/** User facing copy: no em dashes, arrows, or decorative separators. */
export function proseClean(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ". ")
    .replace(/→/g, " to ")
    .replace(/·/g, ", ")
    .replace(/\bHALT\s*[—–-]\s*/gi, "Stop. ")
    .replace(/\bCAUTION\s*[—–-]\s*/gi, "Caution. ")
    .replace(/\s+/g, " ")
    .replace(/\.(\s*\.)+/g, ".")
    .trim();
}

function polishLegacySummary(text: string): string {
  const oracleMatch = text.match(
    /^(\w+)\s+spot\s+\$([\d,.]+)\s+USD\s+via\s+(\w+)\s+\(confidence\s+(\d+)%\)/i,
  );
  if (oracleMatch) {
    const [, asset, price, source, conf] = oracleMatch;
    return proseClean(`${titleCaseAsset(asset)} is $${price} (${conf}% confidence, ${source}).`);
  }

  const staleMatch = text.match(/^(\w+)\s+price\s+\$([\d,.]+)\s+\((\w+)\)\s+.*stale/i);
  if (staleMatch) {
    const [, asset, price] = staleMatch;
    return proseClean(`${titleCaseAsset(asset)} last traded at $${price}, but the quote is no longer fresh.`);
  }

  return proseClean(
    text
      .replace(/\bETHEREUM\b/g, "Ethereum")
      .replace(/\s+via\s+/gi, " from ")
      .replace(/\(confidence\s+(\d+)%\)/gi, "($1% confidence)"),
  );
}

function cleanCopy(text: string): string {
  return polishLegacySummary(text);
}

function friendlySkillError(error?: string): string {
  if (!error) return "";
  if (/not in manifest/i.test(error)) {
    return proseClean(
      "This request was routed incorrectly. Submit again and the system will match your question to the correct specialist.",
    );
  }
  return proseClean(error);
}

function knowledgeLines(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const brain = typeof data.brainSummary === "string" ? data.brainSummary.trim() : "";
  if (brain) lines.push(cleanCopy(brain));

  const citations = data.ragCitations;
  if (Array.isArray(citations)) {
    for (const c of citations.slice(0, 2)) {
      if (c && typeof c === "object" && "title" in c && typeof (c as { title: string }).title === "string") {
        lines.push(cleanCopy(`Reference: ${(c as { title: string }).title}.`));
      }
    }
  }

  const recovery = typeof data.recovery === "string" ? data.recovery.trim() : "";
  const guidance = typeof data.userGuidance === "string" ? data.userGuidance.trim() : "";
  if (recovery) lines.push(cleanCopy(recovery));
  if (guidance) lines.push(cleanCopy(`You can ask: ${guidance}`));

  return lines;
}

function extractReport(data: Record<string, unknown>, error?: string): {
  body: string;
  recommendation: string;
  thinking: string;
} {
  const report = data.report as SkillReportView | undefined;

  const summary = cleanCopy(String(report?.summary ?? data.summary ?? friendlySkillError(error) ?? ""));

  const thinking = cleanCopy(String(report?.thinking ?? ""));

  const sectionText =
    report?.sections
      ?.flatMap((s) => s.lines.map((line) => cleanCopy(line)))
      .filter(Boolean)
      .join(" ") ?? "";

  const knowledge = knowledgeLines(data).join(" ");

  const body = [summary, sectionText, knowledge].filter(Boolean).join("\n\n");

  const recommendation = cleanCopy(
    String(
      report?.recommendation ??
        (typeof data.recommendation === "string" ? data.recommendation : ""),
    ),
  );

  return { body, recommendation, thinking };
}

function uniqueParagraphs(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const paragraph = cleanCopy(part);
    if (!paragraph || seen.has(paragraph.toLowerCase())) continue;
    seen.add(paragraph.toLowerCase());
    out.push(paragraph);
  }
  return out.join("\n\n");
}

function recommendationDistinct(body: string, recommendation: string): string {
  if (!recommendation) return "";
  const bodyLower = body.toLowerCase();
  const recLower = recommendation.toLowerCase();
  if (bodyLower.includes(recLower) || recLower.includes(bodyLower.slice(0, 80))) return "";
  return recommendation;
}

export function formatTaskOutput(detail: TaskDetailResponse | null): TaskResultOutput {
  if (!detail) {
    return {
      thinking: "Analyzing your question with live market and fleet data.",
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
      thinking: isPending ? "Analyzing your question with live market and fleet data." : "",
      body: isPending
        ? ""
        : isFailed
          ? proseClean("This request could not be completed. Please submit again with a specific question.")
          : proseClean("No answer was returned for this request."),
      recommendation: isFailed
        ? proseClean("Use one of the example prompts such as a price check, yield allocation, or fleet health question.")
        : "",
      isPending,
      isFailed,
    };
  }

  const parts = detail.skillResults.map((row) =>
    extractReport(row.result.data ?? {}, row.result.error),
  );

  const thinkingParts = parts.map((p) => p.thinking).filter(Boolean);
  const thinking =
    isPending && !parts.some((p) => p.body)
      ? thinkingParts[0] || "Analyzing your question with live market and fleet data."
      : "";

  const body = uniqueParagraphs(parts.map((p) => p.body).filter(Boolean));
  const rawRecommendation = uniqueParagraphs(parts.map((p) => p.recommendation).filter(Boolean));
  const recommendation = recommendationDistinct(body, rawRecommendation);

  return {
    thinking,
    body: body || (isPending ? "" : proseClean("No answer was returned.")),
    recommendation,
    isPending: isPending && !body,
    isFailed,
  };
}

export function isTaskInProgress(status: string): boolean {
  return status === "PENDING" || status === "ASSIGNED";
}
