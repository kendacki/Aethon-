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

function extractReport(data: Record<string, unknown>, error?: string): {
  thinking: string;
  body: string;
  recommendation: string;
} {
  const report = data.report as SkillReportView | undefined;
  const summary = report?.summary ?? data.summary ?? error ?? "";
  const headline = report?.headline ?? "";
  const sectionDetail =
    report?.sections
      ?.flatMap((s) => s.lines)
      .filter(Boolean)
      .join(" ") ?? "";

  const body = [headline, summary, sectionDetail].filter(Boolean).join("\n\n");

  return {
    thinking: report?.thinking ?? "Reviewed live fleet data for your request.",
    body: body || "No result returned yet.",
    recommendation:
      report?.recommendation ??
      (typeof data.recommendation === "string" ? data.recommendation : "") ??
      "",
  };
}

export function formatTaskOutput(detail: TaskDetailResponse | null): TaskResultOutput {
  if (!detail) {
    return {
      thinking: "",
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
      thinking: isPending ? "Agents are processing your request..." : "",
      body: isPending
        ? "Working on your request. Results will appear here automatically."
        : isFailed
          ? "This task did not complete successfully."
          : "No agent results were recorded for this task.",
      recommendation: "",
      isPending,
      isFailed,
    };
  }

  const parts = detail.skillResults.map((row) =>
    extractReport(row.result.data ?? {}, row.result.error),
  );

  const thinking = parts.map((p) => p.thinking).filter(Boolean).join(" ");
  const body = parts.map((p) => p.body).filter(Boolean).join("\n\n");
  const recommendation = parts.map((p) => p.recommendation).filter(Boolean).join(" ");

  return {
    thinking: isPending && !body ? "Agents are processing your request..." : thinking,
    body: body || (isPending ? "Working on your request. Results will appear here automatically." : "No result returned."),
    recommendation,
    isPending,
    isFailed,
  };
}

export function isTaskInProgress(status: string): boolean {
  return status === "PENDING" || status === "ASSIGNED";
}
