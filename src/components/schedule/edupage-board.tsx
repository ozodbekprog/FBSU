"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureCsrfToken } from "@/lib/api";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ButtonLink } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { useMediaQuery } from "@/components/nav/nav-3d-env";
import { cn } from "@/lib/utils";
import type { EduPageClass, EduPageLesson, EduPagePeriod } from "@/lib/edupage";
import { DAY_KEYS } from "./week-utils";

type SyncOutcome = { created: number; updated: number; removed: number; lang?: string };

function timeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function periodRange(period: EduPagePeriod) {
  if (!period.start || !period.end) return null;
  return `${period.start}–${period.end}`;
}

export function EduPageBoard({
  className,
  classes,
  groupName,
  periods,
  days,
  lessons,
  label,
  validity,
  fetchedAt,
  sourceUrl,
  canSync,
  today,
  refreshMinutes,
  linkOptions,
  dbSyncedAt,
}: {
  className: string;
  classes: EduPageClass[];
  groupName: string | null;
  periods: EduPagePeriod[];
  days: string[];
  lessons: EduPageLesson[];
  label: string;
  validity: string | null;
  fetchedAt: string;
  sourceUrl: string;
  canSync: boolean;
  today: number;
  refreshMinutes: number;
  linkOptions: { id: string; name: string }[];
  dbSyncedAt: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [manualView, setManualView] = useState<"grid" | "list" | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [syncState, setSyncState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [syncText, setSyncText] = useState<string>("");
  const [linkGroupId, setLinkGroupId] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [linkText, setLinkText] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, refreshMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [router, refreshMinutes]);

  const isNarrow = useMediaQuery("(max-width: 900px)");
  const view = manualView ?? (isNarrow ? "list" : "grid");

  const byDay = useMemo(() => {
    const map = new Map<number, EduPageLesson[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.dayOfWeek) ?? [];
      list.push(lesson);
      map.set(lesson.dayOfWeek, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.slot - b.slot || a.subject.localeCompare(b.subject));
    }
    return map;
  }, [lessons]);

  const columns = useMemo(() => days.map((_, index) => index + 1), [days]);

  const dayLabel = useCallback(
    (day: number) => t(DAY_KEYS[day % 7] ?? "schDayMonday"),
    [t],
  );

  const onRefresh = useCallback(() => {
    startRefresh(() => {
      router.refresh();
    });
  }, [router]);

  const onSync = useCallback(async () => {
    setSyncState("running");
    setSyncText("");
    try {
      const token = await ensureCsrfToken();
      const response = await fetch("/api/edupage/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { ok: boolean; data?: SyncOutcome; error?: string };
      if (!payload.ok || !payload.data) {
        setSyncState("error");
        setSyncText(payload.error ?? t("schEduPageSyncError"));
        return;
      }
      setSyncState("done");
      setSyncText(
        t("schEduPageSyncDone", {
          created: payload.data.created,
          updated: payload.data.updated,
          removed: payload.data.removed,
        }),
      );
      router.refresh();
    } catch {
      setSyncState("error");
      setSyncText(t("schEduPageSyncError"));
    }
  }, [router, t]);

  const onLink = useCallback(async () => {
    if (!linkGroupId) return;
    setLinkState("running");
    setLinkText("");
    try {
      const token = await ensureCsrfToken();
      const response = await fetch(`/api/admin/groups/${linkGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({ edupageName: className }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setLinkState("error");
        setLinkText(payload.error ?? t("schEduPageLinkError"));
        return;
      }
      setLinkState("done");
      setLinkText(t("schEduPageLinkDone"));
      router.refresh();
    } catch {
      setLinkState("error");
      setLinkText(t("schEduPageLinkError"));
    }
  }, [className, linkGroupId, router, t]);

  const syncTone =
    syncState === "error"
      ? "text-rose-600"
      : syncState === "done"
        ? "text-emerald-600"
        : "text-slate-500";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={className}
          subtitle={
            groupName
              ? t("schEduPageLinked", { group: groupName })
              : t("schEduPageNotLinked")
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? t("schEduPageRefreshing") : t("schEduPageRefresh")}
              </Button>
              {canSync ? (
                <Button size="sm" onClick={onSync} disabled={syncState === "running"}>
                  {syncState === "running" ? t("schEduPageSyncing") : t("schEduPageSync")}
                </Button>
              ) : null}
              <ButtonLink href={sourceUrl} variant="secondary" size="sm">
                {t("schEduPageSource")}
              </ButtonLink>
            </div>
          }
        />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("schEduPageClass")}
            </span>
            <select
              value={className}
              onChange={(event) => {
                router.push(`/schedule/edupage?class=${encodeURIComponent(event.target.value)}`);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-400"
            >
              {classes.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name} · {t("schEduPageLessonCount", { count: item.lessonCount })}
                </option>
              ))}
            </select>
            <Badge tone="green">{t("schEduPageLessonCount", { count: lessons.length })}</Badge>
            {label ? <Badge tone="slate">{label}</Badge> : null}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={view === "grid" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setManualView("grid")}
              >
                {t("schViewSchedule")}
              </Button>
              <Button
                variant={view === "list" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setManualView("list")}
              >
                {t("schViewList")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{t("schEduPageUpdated", { time: timeLabel(fetchedAt) })}</span>
            <span>{t("schEduPageAuto", { minutes: refreshMinutes })}</span>
            {validity ? <span>{t("schEduPageValidity", { range: validity })}</span> : null}
            {dbSyncedAt ? (
              <span className="font-medium text-slate-600">
                {t("schEduPageDbSynced", { time: timeLabel(dbSyncedAt) })}
              </span>
            ) : null}
            {syncText ? <span className={cn("font-medium", syncTone)}>{syncText}</span> : null}
          </div>
        </CardBody>
      </Card>

      {canSync && !groupName && linkOptions.length > 0 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">{t("schEduPageLinkTitle")}</span>
            <select
              value={linkGroupId}
              onChange={(event) => setLinkGroupId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm outline-none focus:border-brand-400"
            >
              <option value="">{t("schEduPageLinkSelect")}</option>
              {linkOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={onLink} disabled={!linkGroupId || linkState === "running"}>
              {t("schEduPageLinkButton")}
            </Button>
            <span className="text-xs text-slate-500">{t("schEduPageLinkHint")}</span>
            {linkText ? (
              <span
                className={cn(
                  "text-xs font-medium",
                  linkState === "error" ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {linkText}
              </span>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {lessons.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title={t("schEduPageNoLessons")} description={t("schEduPageUnavailableDesc")} />
          </CardBody>
        </Card>
      ) : view === "grid" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-2">
            <div />
            {columns.map((day) => (
              <div
                key={day}
                className={cn(
                  "rounded-xl border px-3 py-2 text-center text-sm font-semibold",
                  day === today
                    ? "border-brand-300 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-slate-50 text-slate-600",
                )}
              >
                {dayLabel(day)}
                {day === today ? (
                  <span className="ml-1 text-xs font-normal text-brand-500">
                    · {t("schToday")}
                  </span>
                ) : null}
              </div>
            ))}
            {periods.map((period) => (
              <div key={period.period} className="contents">
                <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-xs text-slate-500">
                  <div className="text-sm font-semibold text-slate-700">{period.period}</div>
                  <div className="leading-tight">{periodRange(period)}</div>
                </div>
                {columns.map((day) => {
                  const cell = (byDay.get(day) ?? []).filter((lesson) => lesson.slot === period.period);
                  return (
                    <div
                      key={`${day}-${period.period}`}
                      className={cn(
                        "min-h-[74px] rounded-xl border p-2",
                        day === today ? "border-brand-200 bg-brand-50/40" : "border-slate-200 bg-white",
                      )}
                    >
                      {cell.length === 0 ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {cell.map((lesson) => (
                            <li key={lesson.id}>
                              <div
                                className="rounded-lg border-l-4 bg-slate-50 px-2 py-1.5"
                                style={{ borderLeftColor: lesson.color ?? "#3f5a9d" }}
                              >
                                <div className="text-[13px] font-semibold leading-snug text-slate-800">
                                  {lesson.subject}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                                  {lesson.lessonType ? (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                                      {lesson.lessonType}
                                    </span>
                                  ) : null}
                                  {lesson.room ? <span>{lesson.room}</span> : null}
                                  {lesson.subGroup ? (
                                    <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                                      {lesson.subGroup}
                                    </span>
                                  ) : null}
                                </div>
                                {lesson.teacher ? (
                                  <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                    {lesson.teacher}
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {columns.map((day) => {
            const cell = byDay.get(day) ?? [];
            return (
              <Card key={day}>
                <CardHeader
                  title={dayLabel(day)}
                  subtitle={t("schEduPageLessonCount", { count: cell.length })}
                />
                <CardBody className="space-y-2">
                  {cell.length === 0 ? (
                    <p className="text-sm text-slate-400">{t("schNoLessonsOnDay")}</p>
                  ) : (
                    cell.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="rounded-xl border border-slate-200 border-l-4 px-3 py-2"
                        style={{ borderLeftColor: lesson.color ?? "#3f5a9d" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800">{lesson.subject}</span>
                          <span className="text-xs text-slate-400">{lesson.slot}-par</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {[lesson.lessonType, lesson.teacher, lesson.room, lesson.subGroup]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
