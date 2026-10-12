export const PENDING_REPORT_KEY = "assistant:pending-report";

export type PendingReport = {
  message: string;
  stack?: string;
  url: string;
  autoSend?: boolean;
};

export function stashPendingReport(report: PendingReport): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_REPORT_KEY, JSON.stringify(report));
  } catch {
    /* sessionStorage yo'q/limit — jim o'tamiz */
  }
}

export function takePendingReport(): PendingReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_REPORT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_REPORT_KEY);
    const parsed = JSON.parse(raw) as PendingReport;
    return parsed && typeof parsed.message === "string" ? parsed : null;
  } catch {
    return null;
  }
}
