"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  EXAM_MIN_PERCENT,
  SESSION_TYPE_KEY,
  SHEET_STATUS_KEY,
  type AttendanceSummary,
  type SessionType,
  type SheetStatus,
} from "./session-shared";

const TYPE_TONES: Record<string, string> = {
  MIDTERM: "purple",
  FINAL: "blue",
  RETAKE: "amber",
};

const STATUS_TONES: Record<string, string> = {
  PENDING: "slate",
  PASSED: "green",
  FAILED: "rose",
  ABSENT: "amber",
};

function bucketOf(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (day === today) return "today";
  return day > today ? "upcoming" : "past";
}

const BUCKET_BADGES = {
  upcoming: { key: "grdGroupUpcoming", tone: "blue" },
  today: { key: "grdGroupToday", tone: "amber" },
  past: { key: "grdGroupPast", tone: "slate" },
} as const;

export function SessionTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const key = SESSION_TYPE_KEY[type as SessionType];
  return <Badge tone={TYPE_TONES[type] ?? "slate"}>{key ? t(key) : type}</Badge>;
}

export function SheetStatusBadge({ status, score }: { status: string; score?: number | null }) {
  const { t } = useI18n();
  const key = SHEET_STATUS_KEY[status as SheetStatus];
  const label = key ? t(key) : status;
  return <Badge tone={STATUS_TONES[status] ?? "slate"}>{score != null ? `${label} · ${score}` : label}</Badge>;
}

export function SessionStateBadge({ date }: { date: Date }) {
  const { t } = useI18n();
  const bucket = bucketOf(date);
  return <Badge tone={BUCKET_BADGES[bucket].tone}>{t(BUCKET_BADGES[bucket].key)}</Badge>;
}

export function AttendanceBadge({ attendance }: { attendance: AttendanceSummary }) {
  const { t } = useI18n();
  return (
    <Badge tone={attendance.eligible ? "green" : "rose"}>
      {t("grdExAttendanceBadge", {
        status: t(attendance.eligible ? "grdEligibleShort" : "grdNoPermission"),
        percent: attendance.percent,
      })}
    </Badge>
  );
}

export function AttendanceBanner({
  attendance,
  compact,
}: {
  attendance: AttendanceSummary;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const eligible = attendance.eligible;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3",
        compact ? "" : "mt-4",
        eligible ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          eligible ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
        )}
      >
        {attendance.percent}%
      </span>
      <div className="min-w-0">
        <p className={cn("text-sm font-bold", eligible ? "text-emerald-700" : "text-rose-700")}>
          {t(eligible ? "grdEligibleShort" : "grdNoPermission")}
        </p>
        <p className={cn("mt-0.5 text-xs", eligible ? "text-emerald-600/80" : "text-rose-600/80")}>
          {eligible
            ? t("grdExAttendanceMet", { percent: attendance.percent })
            : t("grdExAttendanceRequired", { percent: attendance.percent, min: EXAM_MIN_PERCENT })}
        </p>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.14em] text-slate-700 uppercase">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
