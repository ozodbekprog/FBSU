"use client";

import { Badge } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type SubmissionStatusValue = "SUBMITTED" | "GRADED" | "LATE";

const STATUS_KEYS: Record<SubmissionStatusValue, "crsSubmitted" | "crsGraded" | "crsLate"> = {
  SUBMITTED: "crsSubmitted",
  GRADED: "crsGraded",
  LATE: "crsLate",
};

const TONES: Record<SubmissionStatusValue, "blue" | "green" | "rose"> = {
  SUBMITTED: "blue",
  GRADED: "green",
  LATE: "rose",
};

const DOTS: Record<SubmissionStatusValue, string> = {
  SUBMITTED: "bg-brand-500",
  GRADED: "bg-emerald-500",
  LATE: "bg-rose-500",
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export function SubmissionBadge({
  status,
}: {
  status: SubmissionStatusValue | null | undefined;
}) {
  const { t } = useI18n();
  return (
    <Badge tone={status ? TONES[status] : "slate"}>
      <span
        className={cn("mr-1.5 size-1.5 rounded-full", status ? DOTS[status] : "bg-slate-400")}
      />
      {status ? t(STATUS_KEYS[status]) : t("crsNotSubmitted")}
    </Badge>
  );
}

export type DueState = "none" | "soon" | "overdue" | "done";

export function dueState(
  dueAt: Date | string | null | undefined,
  completed: boolean,
  now = new Date(),
): DueState {
  if (!dueAt) return "none";
  const due = new Date(dueAt);
  if (completed) return "done";
  if (due.getTime() < now.getTime()) return "overdue";
  if (due.getTime() - now.getTime() <= 3 * DAY_MS) return "soon";
  return "done";
}

const DUE_STYLES: Record<DueState, string> = {
  none: "bg-slate-100 text-slate-500",
  done: "bg-slate-100 text-slate-600",
  soon: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
};

function CalendarIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

export function DueChip({
  dueAt,
  completed = false,
  now = new Date(),
  className,
}: {
  dueAt: Date | string | null | undefined;
  completed?: boolean;
  now?: Date;
  className?: string;
}) {
  const state = dueState(dueAt, completed, now);
  const { t } = useI18n();
  const label =
    state === "overdue" ? t("crsDueOverdue") : state === "soon" ? t("crsDueSoon") : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        DUE_STYLES[state],
        className,
      )}
    >
      <CalendarIcon />
      {dueAt ? fmtDate(dueAt) : t("crsNoDueDate")}
      {label ? <span className="opacity-80">· {label}</span> : null}
    </span>
  );
}
