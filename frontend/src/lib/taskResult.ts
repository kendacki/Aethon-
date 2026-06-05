import type { TaskDetailResponse } from "../api/client";

type SkillReportView = {
  headline?: string;
  summary?: string;
  thinking?: string;
  recommendation?: string;
  sections?: Array<{ title: string; lines: string[] }>;
};

export type TaskResultSection = {
  title: string;
  summary: string;
  bullets: string[];
  action?: string;
};

export type TaskResultOutput = {
  thinking: string;
  headline?: string;
  atGlance?: string;
  body: string;
  sections: TaskResultSection[];
  recommendation: string;
  isPending: boolean;
  isFailed: boolean;
};

function titleCaseAsset(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === "ethereum" || lower === "eth") return "Ethereum";
  if (lower === "bitcoin" || lower === "btc") return "Bitcoin";
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

const TECHNICAL_LINE =
  /\b(fallback_table|somnia_json_api|attestation|wallet attestation|quality tier|basis points|bps\b|wei\b|criteriaMet|signed by the oracle|cex_|circuit_breaker|fleet_liveness)\b/i;

function isTechnicalCopy(text: string): boolean {
  return TECHNICAL_LINE.test(text) || /\(\d{1,3}%\s*confidence/i.test(text);
}

function polishLegacySummary(text: string): string {
  const oracleMatch = text.match(
    /^(\w+)\s+spot\s+\$([\d,.]+)\s+USD\s+via\s+(\w+)\s+\(confidence\s+(\d+)%\)/i,
  );
  if (oracleMatch) {
    const [, asset, price] = oracleMatch;
    return proseClean(
      `${titleCaseAsset(asset)} is about $${price} USD. Live feeds were busy, so this uses reference pricing. Refresh for a live quote before trading.`,
    );
  }

  const staleMatch = text.match(/^(\w+)\s+price\s+\$([\d,.]+)\s+\((\w+)\)\s+.*stale/i);
  if (staleMatch) {
    const [, asset, price] = staleMatch;
    return proseClean(`${titleCaseAsset(asset)} last traded near $${price}, but the quote is no longer fresh. Ask again for an updated price.`);
  }

  return proseClean(
    text
      .replace(/\bETHEREUM\b/g, "Ethereum")
      .replace(/\bfallback_table\b/gi, "reference pricing")
      .replace(/\bcoingecko\b/gi, "CoinGecko")
      .replace(/\bsomnia_json_api\b/gi, "Somnia oracle")
      .replace(/\(confidence\s+\d+%[^)]*\)/gi, "")
      .replace(/\bbasis points?\b/gi, "% spread")
      .replace(/\s+via\s+/gi, " from ")
      .replace(/Spot:\s*\$[\d,.]+ USD\s*/gi, "")
      .replace(/Source:\s*\w+\s*/gi, "")
      .replace(/Age:\s*\d+s\s*\([^)]*\)\s*/gi, "")
      .replace(/Attestation:\s*signed\s*/gi, ""),
  );
}

function cleanCopy(text: string): string {
  const polished = polishLegacySummary(text);
  return isTechnicalCopy(polished) ? polishLegacySummary(text) : polished;
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

function formatReportSections(sections?: SkillReportView["sections"]): string[] {
  if (!sections?.length) return [];
  const blocks: string[] = [];
  for (const section of sections) {
    const lines = section.lines.map((line) => cleanCopy(line)).filter((line) => line && !isTechnicalCopy(line));
    if (!lines.length) continue;
    blocks.push(lines.join("\n"));
  }
  return blocks;
}

function extractSingleAgentReport(data: Record<string, unknown>, error?: string): TaskResultSection | null {
  const report = data.report as SkillReportView | undefined;
  const summary = cleanCopy(String(report?.summary ?? data.summary ?? friendlySkillError(error) ?? ""));
  if (!summary) return null;

  const bullets = formatReportSections(report?.sections);
  const action = cleanCopy(
    String(report?.recommendation ?? (typeof data.recommendation === "string" ? data.recommendation : "")),
  );

  return {
    title: cleanCopy(String(report?.headline ?? "Answer")),
    summary,
    bullets,
    action: action || undefined,
  };
}

function formatPortfolioBriefing(detail: TaskDetailResponse): TaskResultOutput {
  const briefing = detail.portfolioBriefing!;
  const sections: TaskResultSection[] = briefing.sections.map((s) => ({
    title: s.title,
    summary: cleanCopy(s.summary),
    bullets: s.bullets.map((b) => cleanCopy(b)).filter(Boolean),
    action: s.action ? cleanCopy(s.action) : undefined,
  }));

  return {
    thinking: "",
    headline: cleanCopy(briefing.headline),
    atGlance: cleanCopy(briefing.atGlance),
    body: "",
    sections,
    recommendation: briefing.nextSteps.map((s) => cleanCopy(s)).filter(Boolean).join("\n"),
    isPending: false,
    isFailed: false,
  };
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
      sections: [],
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
      sections: [],
      recommendation: isFailed
        ? proseClean("Use one of the example prompts such as a price check, yield allocation, or fleet health question.")
        : "",
      isPending,
      isFailed,
    };
  }

  if (detail.portfolioBriefing && !isPending) {
    return formatPortfolioBriefing(detail);
  }

  const sections = detail.skillResults
    .map((row) => extractSingleAgentReport(row.result.data ?? {}, row.result.error))
    .filter((s): s is TaskResultSection => s != null);

  const thinking =
    isPending && sections.length === 0
      ? "Analyzing your question with live market and fleet data."
      : "";

  const primary = sections[0];
  const body = primary?.summary ?? "";
  const rawRecommendation = sections
    .map((s) => s.action)
    .filter(Boolean)
    .join("\n");
  const recommendation = recommendationDistinct(body, rawRecommendation);

  return {
    thinking,
    body: body || (isPending ? "" : proseClean("No answer was returned.")),
    sections: sections.length > 1 ? sections : primary ? [{ ...primary, action: undefined }] : [],
    recommendation,
    isPending: isPending && !body,
    isFailed,
  };
}

export function isTaskInProgress(status: string): boolean {
  return status === "PENDING" || status === "ASSIGNED";
}
