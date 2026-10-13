"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Skeleton, Table } from "@/components/ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { MONITOR_POLL_MS } from "@/modules/secure-exam/config";
import { formatExamCode } from "@/modules/secure-exam/code";
import { eventLabelKey, SEVERITY_TONE } from "@/components/secure-exam/labels";
import type {
  ExamStatus,
  EventSeverity,
  LimitAction,
  RunStatus,
} from "@/modules/secure-exam/types";

export type MonitorRun = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: RunStatus;
  warnings: number;
  extraMin: number;
  online: boolean;
  screens: number | null;
  fullscreen: boolean;
  webcam: boolean;
  startedAt: string;
  finishedAt: string | null;
  lastSeenAt: string;
  endsAt: string | null;
  attemptFinishedAt: string | null;
  score: number | null;
};

export type MonitorEvent = {
  id: string;
  runId: string;
  studentName: string;
  type: string;
  severity: string;
  at: string;
  meta: unknown;
};

export type MonitorData = {
  exam: {
    id: string;
    quizId: string;
    title: string;
    code: string;
    status: ExamStatus;
    quizTitle: string;
    courseTitle: string;
    startsAt: string;
    endsAt: string;
    durationMin: number | null;
    requireFullscreen: boolean;
    blockCopy: boolean;
    requireClient: boolean;
    webcamEnabled: boolean;
    maxWarnings: number;
    limitAction: LimitAction;
  };
  runs: MonitorRun[];
  events: MonitorEvent[];
  serverNow: string;
};

const STATUS_TONE: Record<ExamStatus, "blue" | "green" | "slate"> = {
  SCHEDULED: "blue",
  ACTIVE: "green",
  CLOSED: "slate",
};

const RUN_TONE: Record<RunStatus, "green" | "blue" | "rose"> = {
  ACTIVE: "green",
  SUBMITTED: "blue",
  TERMINATED: "rose",
};

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

function dateOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function ExamMonitor({ examId }: { examId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<MonitorData>(`/api/secure-exams/${examId}`, "GET", undefined, t("commonNetworkError"));
    if (result.ok) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    return result;
  }, [examId, t]);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const result = await apiFetch<MonitorData>(`/api/secure-exams/${examId}`, "GET", undefined, t("commonNetworkError"));
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), MONITOR_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [examId, t]);

  async function act(
    key: string,
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) {
    setBusy(key);
    const result = await apiFetch(url, method, body, t("commonError"));
    if (!result.ok) setError(result.error);
    await load();
    setBusy(null);
  }

  async function copyCode() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(formatExamCode(data.exam.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/e/${data.exam.code}`);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    );
  }

  const { exam, runs, events } = data;
  const shareLink = `${window.location.origin}/e/${exam.code}`;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-brand-950">{exam.title}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {exam.quizTitle} · {exam.courseTitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[exam.status]}>
                {exam.status === "SCHEDULED"
                  ? t("secStatusScheduled")
                  : exam.status === "ACTIVE"
                    ? t("secStatusActive")
                    : t("secStatusClosed")}
              </Badge>
              <span className="text-xs text-slate-500">
                {dateOf(exam.startsAt)} — {dateOf(exam.endsAt)}
              </span>
              {exam.durationMin ? (
                <span className="text-xs text-slate-500">· {exam.durationMin} min</span>
              ) : null}
              <span className="text-xs text-slate-500">
                · {t("secWarningLimit", { max: exam.maxWarnings })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {t("secCodeLabel")}
            </p>
            <p className="font-mono text-2xl font-semibold tracking-[0.2em] text-brand-950">
              {formatExamCode(exam.code)}
            </p>
            <Button variant="ghost" size="sm" onClick={() => void copyCode()} className="mt-1">
              {copied ? t("secCopied") : t("secCopyCode")}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {exam.status === "SCHEDULED" ? (
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => void act("start", `/api/secure-exams/${exam.id}`, "PATCH", { status: "ACTIVE" })}
            >
              {t("secStartNow")}
            </Button>
          ) : null}
          {exam.status !== "CLOSED" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy !== null}
              onClick={() => {
                if (window.confirm(t("secCloseConfirm"))) {
                  void act("close", `/api/secure-exams/${exam.id}`, "PATCH", { status: "CLOSED" });
                }
              }}
            >
              {t("secCloseExam")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="danger"
            disabled={busy !== null}
            onClick={() => {
              if (window.confirm(t("secDeleteConfirm"))) {
                void apiFetch<{ id: string }>(`/api/secure-exams/${exam.id}`, "DELETE", undefined, t("commonError")).then((result) => {
                  if (result.ok) {
                    router.push("/secure-exams");
                  } else {
                    setError(result.error);
                  }
                });
              }
            }}
          >
            {t("secDelete")}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <img
            src={`/api/secure-exams/${exam.id}/qr`}
            alt={t("secQrHint")}
            className="size-24 rounded-xl border border-slate-200 bg-white p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {t("secShareTitle")}
            </p>
            <p className="mt-1 break-all font-mono text-xs text-brand-900">{shareLink}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
                {copiedLink ? t("secCopied") : t("secCopyLink")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void copyCode()}>
                {copied ? t("secCopied") : t("secCopyCode")}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{t("secQrHint")}</p>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="font-semibold tracking-tight text-slate-900">
            {t("secParticipants", { count: runs.length })}
          </p>
        </div>
        {runs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">{t("secNoRunsYet")}</p>
        ) : (
          <Table>
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("secStudent")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secStatus")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secWarnings")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secScreens")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secFullscreen")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secCamera")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secLastSeen")}</th>
                <th className="px-4 py-2.5 font-medium">{t("secScore")}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-100 align-middle">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{run.studentName}</p>
                    <p className="text-xs text-slate-500">{run.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={RUN_TONE[run.status]}>
                        {run.status === "ACTIVE"
                          ? t("secRunActive")
                          : run.status === "SUBMITTED"
                            ? t("secRunSubmitted")
                            : t("secRunTerminated")}
                      </Badge>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            run.online ? "bg-emerald-500" : "bg-slate-300",
                          )}
                        />
                        {run.online ? t("secOnline") : t("secOffline")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        run.warnings >= exam.maxWarnings
                          ? "rose"
                          : run.warnings > 0
                            ? "amber"
                            : "slate"
                      }
                    >
                      {run.warnings}/{exam.maxWarnings}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm", run.screens && run.screens > 1 ? "font-semibold text-rose-600" : "text-slate-600")}>
                      {run.screens ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{run.fullscreen ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{run.webcam ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeOf(run.lastSeenAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{run.score ?? "—"}</td>
                  <td className="px-4 py-3">
                    {run.status === "ACTIVE" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy !== null}
                          onClick={() => void act(`extra:${run.id}`, `/api/secure-exams/runs/${run.id}/extra`, "POST", { minutes: 5 })}
                        >
                          {t("secExtra5")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy !== null}
                          onClick={() => {
                            if (window.confirm(t("secTerminateConfirm"))) {
                              void act(`stop:${run.id}`, `/api/secure-exams/runs/${run.id}/terminate`, "POST");
                            }
                          }}
                        >
                          {t("secTerminate")}
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="font-semibold tracking-tight text-slate-900">{t("secEventsTitle")}</p>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">{t("secNoEvents")}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {events.map((event) => {
              const labelKey = eventLabelKey(event.type);
              return (
                <li key={event.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-16 shrink-0 font-mono text-xs text-slate-400">
                    {timeOf(event.at)}
                  </span>
                  <span className="w-36 shrink-0 truncate font-medium text-slate-700">
                    {event.studentName}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {labelKey ? t(labelKey) : event.type}
                  </span>
                  <Badge tone={SEVERITY_TONE[(event.severity as EventSeverity) ?? "INFO"] ?? "slate"}>
                    {event.severity}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
