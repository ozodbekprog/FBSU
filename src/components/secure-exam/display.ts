import type { ExamStatus, RunStatus } from "@/modules/secure-exam/types";
import type { Dictionary } from "@/i18n/uz";

export const EXAM_TONE: Record<ExamStatus, "blue" | "green" | "slate"> = {
  SCHEDULED: "blue",
  ACTIVE: "green",
  CLOSED: "slate",
};

export const RUN_TONE: Record<RunStatus, "green" | "blue" | "rose"> = {
  ACTIVE: "green",
  SUBMITTED: "blue",
  TERMINATED: "rose",
};

export function examStatusLabel(status: ExamStatus, dictionary: Dictionary): string {
  if (status === "SCHEDULED") return dictionary.secStatusScheduled;
  if (status === "ACTIVE") return dictionary.secStatusActive;
  return dictionary.secStatusClosed;
}

export function runStatusLabel(status: RunStatus, dictionary: Dictionary): string {
  if (status === "ACTIVE") return dictionary.secRunActive;
  if (status === "SUBMITTED") return dictionary.secRunSubmitted;
  return dictionary.secRunTerminated;
}
