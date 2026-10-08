"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { cn, dayName, fmtDate, monthName } from "@/lib/utils";
import { ensureCsrfToken } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/i18n";

type AcademicEventType = "SEMESTER" | "HOLIDAY" | "EXAM" | "EVENT";
type MarkKind = "assignment" | "quiz" | "semester" | "holiday" | "exam" | "event";

type DeadlineItem = {
  id: string;
  title: string;
  type: "assignment" | "quiz";
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  dueAt: string;
};

type AcademicEventItem = {
  id: string;
  title: string;
  type: AcademicEventType;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

type MonthGroup = { key: string; label: string; events: AcademicEventItem[] };

type ListResponse =
  | { ok: true; data: { events: AcademicEventItem[] } }
  | { ok: false; error: string };

type DeadlinesResponse =
  | { ok: true; data: { items: DeadlineItem[] } }
  | { ok: false; error: string };

type RequestResult = { ok: true } | { ok: false; error: string };

const ACADEMIC_TYPES: AcademicEventType[] = ["SEMESTER", "HOLIDAY", "EXAM", "EVENT"];

const EVENT_META: Record<
  AcademicEventType,
  { tone: "gold" | "green" | "rose" | "purple"; iconWrap: string; chipActive: string }
> = {
  SEMESTER: {
    tone: "gold",
    iconWrap: "border-gold-300/50 bg-gold-300/20 text-gold-800",
    chipActive: "border-gold-400 bg-gold-300/20 text-gold-800 ring-2 ring-gold-400/20",
  },
  HOLIDAY: {
    tone: "green",
    iconWrap: "border-emerald-200 bg-emerald-50 text-emerald-700",
    chipActive: "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/15",
  },
  EXAM: {
    tone: "rose",
    iconWrap: "border-rose-200 bg-rose-50 text-rose-700",
    chipActive: "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/15",
  },
  EVENT: {
    tone: "purple",
    iconWrap: "border-purple-200 bg-purple-50 text-purple-700",
    chipActive: "border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500/15",
  },
};

const DAY_DOT: Record<MarkKind, string> = {
  assignment: "bg-amber-500",
  quiz: "bg-brand-500",
  semester: "bg-gold-400",
  holiday: "bg-emerald-500",
  exam: "bg-rose-500",
  event: "bg-purple-500",
};

const MARK_ORDER: MarkKind[] = ["exam", "assignment", "quiz", "semester", "holiday", "event"];

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function TypeIcon({ type, size = 18 }: { type: AcademicEventType; size?: number }) {
  if (type === "SEMESTER") {
    return (
      <svg width={size} height={size} {...ICON_PROPS}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    );
  }
  if (type === "HOLIDAY") {
    return (
      <svg width={size} height={size} {...ICON_PROPS}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (type === "EXAM") {
    return (
      <svg width={size} height={size} {...ICON_PROPS}>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} {...ICON_PROPS}>
      <path d="M8 2v4M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dayKeyFromDate(date: Date): string {
  return dayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

function timeText(value: string): string {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function eventEnd(item: AcademicEventItem): Date {
  return new Date(item.endDate ?? item.startDate);
}

function rangeText(item: AcademicEventItem, locale: Locale): string {
  if (!item.endDate) return fmtDate(item.startDate, locale);
  const start = new Date(item.startDate);
  const end = new Date(item.endDate);
  if (start.getTime() === end.getTime()) return fmtDate(item.startDate, locale);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${fmtDate(item.endDate, locale)}`;
  }
  return `${fmtDate(item.startDate, locale)} — ${fmtDate(item.endDate, locale)}`;
}

function durationDays(item: AcademicEventItem): number {
  const start = startOfDay(item.startDate);
  const end = startOfDay(eventEnd(item));
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function groupByMonth(items: AcademicEventItem[], locale: Locale): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const item of items) {
    const date = new Date(item.startDate);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(item);
    } else {
      groups.set(key, {
        key,
        label: `${monthName(date.getMonth(), locale)} ${date.getFullYear()}`,
        events: [item],
      });
    }
  }
  return Array.from(groups.values());
}

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function previewDuration(start: string, end: string): number | null {
  if (!start) return null;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = end ? new Date(`${end}T00:00:00.000Z`) : startDate;
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  return Math.max(1, days);
}

function selectedDayTitle(key: string, locale: Locale): string {
  const [yearText, monthText, dayText] = key.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const label = monthName(month - 1, locale);
  const weekDay = dayName(new Date(year, month - 1, day).getDay(), locale);
  if (locale === "en") return `${label} ${day}, ${weekDay}`;
  return `${day} ${label.toLowerCase()}, ${weekDay}`;
}

export function UniversalCalendar({ canManage }: { canManage: boolean }) {
  const { t, locale } = useI18n();
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);
  const todayKey = dayKeyFromDate(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(todayKey);

  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [deadlinesLoading, setDeadlinesLoading] = useState(true);
  const [deadlinesError, setDeadlinesError] = useState<string | null>(null);

  const [events, setEvents] = useState<AcademicEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AcademicEventType>("SEMESTER");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const monthKey = `${year}-${pad(month)}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setDeadlinesLoading(true);
      setDeadlinesError(null);
      try {
        const response = await fetch(`/api/calendar?month=${monthKey}`, { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as DeadlinesResponse | null;
        if (!active) return;
        if (!json || !json.ok) {
          setDeadlines([]);
          setDeadlinesError(json && !json.ok ? json.error : t("dashCalLoadError"));
          return;
        }
        setDeadlines(json.data.items);
      } catch {
        if (!active) return;
        setDeadlines([]);
        setDeadlinesError(t("dashCalLoadError"));
      } finally {
        if (active) setDeadlinesLoading(false);
      }
    };
    void Promise.resolve().then(load);
    return () => {
      active = false;
    };
  }, [monthKey, t]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const response = await fetch("/api/academic-calendar", { cache: "no-store" });
        const json = (await response.json().catch(() => null)) as ListResponse | null;
        if (!active) return;
        if (!json || !json.ok) {
          setEvents([]);
          setEventsError(json && !json.ok ? json.error : t("dashAcalLoadError"));
          return;
        }
        setEvents(json.data.events);
      } catch {
        if (!active) return;
        setEvents([]);
        setEventsError(t("dashAcalLoadError"));
      } finally {
        if (active) setEventsLoading(false);
      }
    };
    void Promise.resolve().then(load);
    return () => {
      active = false;
    };
  }, [version, t]);

  const typeLabels: Record<AcademicEventType, string> = {
    SEMESTER: t("dashAcalSemester"),
    HOLIDAY: t("dashAcalHoliday"),
    EXAM: t("dashAcalExam"),
    EVENT: t("dashAcalEvent"),
  };

  function eventDuration(item: AcademicEventItem): string {
    const days = durationDays(item);
    if (days < 7) return t("dashAcalDurationDays", { count: days });
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    const weeksText = t("dashAcalDurationWeeks", { count: weeks });
    return rest === 0 ? weeksText : `${weeksText} ${t("dashAcalDurationDays", { count: rest })}`;
  }

  function eventStatus(item: AcademicEventItem): { label: string; tone: string } | null {
    const start = startOfDay(item.startDate);
    const end = startOfDay(eventEnd(item));
    if (start <= today && today <= end) {
      return { label: t("dashAcalOngoing"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    }
    if (start > today) {
      const days = Math.round((start.getTime() - today.getTime()) / 86400000);
      if (days > 30) return null;
      if (days === 1) {
        return { label: t("dashAcalStartsTomorrow"), tone: "border-brand-200 bg-brand-50 text-brand-700" };
      }
      return { label: t("dashAcalStartsIn", { count: days }), tone: "border-brand-200 bg-brand-50 text-brand-700" };
    }
    return null;
  }

  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const item of deadlines) {
      const key = dayKeyFromDate(new Date(item.dueAt));
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }, [deadlines]);

  const eventsByActiveDay = useMemo(() => {
    const map = new Map<string, AcademicEventItem[]>();
    for (const event of events) {
      const start = startOfDay(event.startDate);
      const end = startOfDay(eventEnd(event));
      const cursor = new Date(start);
      let guard = 0;
      while (cursor.getTime() <= end.getTime() && guard < 800) {
        const key = dayKeyFromDate(cursor);
        const list = map.get(key);
        if (list) {
          list.push(event);
        } else {
          map.set(key, [event]);
        }
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return map;
  }, [events]);

  const marksByDay = useMemo(() => {
    const map = new Map<string, MarkKind[]>();
    const push = (key: string, kind: MarkKind) => {
      const list = map.get(key);
      if (list) {
        list.push(kind);
      } else {
        map.set(key, [kind]);
      }
    };
    for (const item of deadlines) {
      push(dayKeyFromDate(new Date(item.dueAt)), item.type);
    }
    for (const event of events) {
      push(dayKeyFromDate(new Date(event.startDate)), event.type.toLowerCase() as MarkKind);
    }
    for (const list of map.values()) {
      list.sort((a, b) => MARK_ORDER.indexOf(a) - MARK_ORDER.indexOf(b));
    }
    return map;
  }, [deadlines, events]);

  const cells = useMemo(() => {
    const result: Array<number | null> = [];
    const offset = firstWeekday(year, month);
    const total = daysInMonth(year, month);
    for (let index = 0; index < offset; index += 1) result.push(null);
    for (let day = 1; day <= total; day += 1) result.push(day);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [year, month]);

  const monthEventCount = useMemo(() => {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    return events.filter(
      (event) => startOfDay(event.startDate) < monthEnd && startOfDay(eventEnd(event)) >= monthStart,
    ).length;
  }, [events, year, month]);

  const upcoming = useMemo(
    () => events.filter((item) => eventEnd(item) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events, today],
  );
  const past = useMemo(
    () => events.filter((item) => eventEnd(item) < today).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [events, today],
  );
  const upcomingGroups = useMemo(() => groupByMonth(upcoming, locale), [upcoming, locale]);
  const pastGroups = useMemo(() => groupByMonth(past, locale), [past, locale]);

  const selectedDeadlines = selected ? deadlinesByDay.get(selected) ?? [] : [];
  const selectedEvents = selected ? eventsByActiveDay.get(selected) ?? [] : [];
  const selectedCount = selectedDeadlines.length + selectedEvents.length;

  const weekdays = [
    t("dashCalDayMon"),
    t("dashCalDayTue"),
    t("dashCalDayWed"),
    t("dashCalDayThu"),
    t("dashCalDayFri"),
    t("dashCalDaySat"),
    t("dashCalDaySun"),
  ];

  const legend = [
    { dot: DAY_DOT.assignment, label: t("dashCalTypeAssignment") },
    { dot: DAY_DOT.quiz, label: t("dashCalTypeQuiz") },
    { dot: DAY_DOT.semester, label: t("dashAcalSemester") },
    { dot: DAY_DOT.holiday, label: t("dashAcalHoliday") },
    { dot: DAY_DOT.exam, label: t("dashAcalExam") },
    { dot: DAY_DOT.event, label: t("dashAcalEvent") },
  ];

  function goToMonth(delta: number) {
    const target = new Date(year, month - 1 + delta, 1);
    setYear(target.getFullYear());
    setMonth(target.getMonth() + 1);
    setSelected(null);
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelected(todayKey);
  }

  async function request(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<RequestResult> {
    setBusy(true);
    try {
      const token = await ensureCsrfToken();
      const headers: Record<string, string> = { ...(body ? { "Content-Type": "application/json" } : {}) };
      if (token) headers["x-csrf-token"] = token;
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await response.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!response.ok || !json || !json.ok) {
        return { ok: false, error: json?.error ?? t("dashAcalActionError") };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: t("dashAcalNetworkError") };
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setMode("create");
    setEditId(null);
    setTitle("");
    setType("SEMESTER");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setFormError(null);
    setActionError(null);
    setNotice(null);
  }

  function openEdit(item: AcademicEventItem) {
    setMode("edit");
    setEditId(item.id);
    setTitle(item.title);
    setType(item.type);
    setStartDate(toDateInput(item.startDate));
    setEndDate(toDateInput(item.endDate));
    setDescription(item.description ?? "");
    setFormError(null);
    setActionError(null);
    setNotice(null);
  }

  function closeForm() {
    setMode(null);
    setEditId(null);
    setFormError(null);
  }

  async function submit() {
    if (title.trim().length < 2) {
      setFormError(t("dashAcalErrTitle"));
      return;
    }
    if (!startDate) {
      setFormError(t("dashAcalErrStart"));
      return;
    }
    if (endDate && endDate < startDate) {
      setFormError(t("dashAcalErrEnd"));
      return;
    }
    const payload = {
      title: title.trim(),
      type,
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: endDate ? `${endDate}T00:00:00.000Z` : null,
      description: description.trim() ? description.trim() : null,
    };
    const result =
      mode === "create"
        ? await request("/api/academic-calendar", "POST", payload)
        : await request(`/api/academic-calendar/${editId}`, "PATCH", payload);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    const created = mode === "create";
    closeForm();
    setNotice(created ? t("dashAcalNoticeCreated") : t("dashAcalNoticeUpdated"));
    setVersion((value) => value + 1);
  }

  async function remove(item: AcademicEventItem) {
    if (!window.confirm(t("dashAcalConfirmDelete", { title: item.title }))) return;
    const result = await request(`/api/academic-calendar/${item.id}`, "DELETE");
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setActionError(null);
    setNotice(t("dashAcalNoticeDeleted"));
    setVersion((value) => value + 1);
  }

  function manageButtons(item: AcademicEventItem) {
    if (!canManage) return null;
    return (
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
          {t("dashAcalEdit")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={() => void remove(item)}
        >
          {t("dashAcalDelete")}
        </Button>
      </div>
    );
  }

  function renderEventRow(item: AcademicEventItem, dimmed: boolean) {
    const meta = EVENT_META[item.type] ?? EVENT_META.EVENT;
    const status = dimmed ? null : eventStatus(item);
    return (
      <article key={item.id} className={cn("relative flex gap-3", dimmed && "opacity-75 saturate-[0.85]")}>
        <span
          className={cn(
            "relative z-[1] mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm",
            meta.iconWrap,
          )}
        >
          <TypeIcon type={item.type} />
        </span>
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/70 bg-white p-4 transition-colors duration-150 hover:border-slate-300">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                <Badge tone={meta.tone}>{typeLabels[item.type] ?? typeLabels.EVENT}</Badge>
                {status ? (
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", status.tone)}>
                    {status.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-slate-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                <span>{rangeText(item, locale)}</span>
                <span className="text-slate-500">·</span>
                <span>{eventDuration(item)}</span>
              </p>
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
              ) : null}
            </div>
            {dimmed ? null : manageButtons(item)}
          </div>
        </div>
      </article>
    );
  }

  function renderGroups(groups: MonthGroup[], dimmed: boolean) {
    return groups.map((group) => (
      <section key={group.key} className="space-y-2.5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", dimmed ? "bg-slate-300" : "bg-brand-500")} />
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</h4>
          <span className="ml-auto text-[11px] font-medium text-slate-600">{t("dashAcalCount", { count: group.events.length })}</span>
        </div>
        <div className="relative space-y-3">
          <span aria-hidden="true" className="absolute bottom-6 left-5 top-6 w-px bg-slate-200" />
          {group.events.map((item) => renderEventRow(item, dimmed))}
        </div>
      </section>
    ));
  }

  function renderDeadlineRow(item: DeadlineItem) {
    return (
      <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5">
        <span
          className={cn(
            "h-10 w-1 shrink-0 rounded-full",
            item.type === "quiz" ? "bg-brand-500" : "bg-amber-400",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{item.courseTitle}</p>
        </div>
        <Badge tone={item.type === "quiz" ? "brand" : "amber"}>
          {item.type === "quiz" ? t("dashCalTypeQuiz") : t("dashCalTypeAssignment")}
        </Badge>
        <span className="text-xs font-semibold text-slate-700">{timeText(item.dueAt)}</span>
        <ButtonLink
          href={
            item.type === "quiz"
              ? `/quizzes/${item.id}`
              : `/courses/${item.courseSlug}/assignments/${item.id}`
          }
          variant="secondary"
          size="sm"
        >
          {t("crsOpen")}
        </ButtonLink>
      </div>
    );
  }

  function renderForm() {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-brand-950/40 p-4 backdrop-blur-sm sm:p-8"
        role="dialog"
        aria-modal="true"
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) closeForm();
        }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <Card className="overflow-hidden border-brand-200/70 shadow-2xl shadow-brand-950/20">
            <CardHeader
              title={mode === "create" ? t("dashAcalNewTitle") : t("dashAcalEditTitle")}
              subtitle={mode === "create" ? t("dashAcalNewSubtitle") : t("dashAcalEditSubtitle")}
              action={
                <Button variant="ghost" size="sm" onClick={closeForm}>
                  {t("dashAcalClose")}
                </Button>
              }
            />
            <CardBody>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="sm:col-span-2">
                  <Label>{t("dashAcalNameLabel")}</Label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("dashAcalNamePlaceholder")}
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>{t("dashAcalTypeLabel")}</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ACADEMIC_TYPES.map((option) => {
                      const meta = EVENT_META[option];
                      const active = option === type;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setType(option)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                            active
                              ? meta.chipActive
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg border", meta.iconWrap)}>
                            <TypeIcon type={option} size={15} />
                          </span>
                          {typeLabels[option]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>{t("dashAcalStartLabel")}</Label>
                  {/* Native kalendar brauzer tiliga emas, inputning `lang`iga
                      qaraydi — o'zbek interfeysida ruscha chiqmasligi uchun. */}
                  <Input type="date" lang={locale} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                </div>
                <div>
                  <Label>{t("dashAcalEndLabel")}</Label>
                  <Input type="date" lang={locale} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  {startDate ? (
                    endDate && endDate < startDate ? (
                      <p className="text-xs font-medium text-rose-600">{t("dashAcalEndAfter")}</p>
                    ) : (
                      <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {t("dashAcalDuration", { count: previewDuration(startDate, endDate) ?? 1 })}
                      </p>
                    )
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <Label>{t("dashAcalNoteLabel")}</Label>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("dashAcalNotePlaceholder")}
                    rows={2}
                    maxLength={500}
                  />
                </div>
                {formError ? (
                  <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {formError}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <Button type="submit" disabled={busy || title.trim().length < 2}>
                    {busy ? t("dashAcalSaving") : mode === "create" ? t("dashAcalAdd") : t("dashAcalSave")}
                  </Button>
                  <Button variant="ghost" onClick={closeForm}>
                    {t("dashAcalCancel")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mode ? renderForm() : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label={t("dashCalPrevMonth")}
            className="px-3 py-2 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-800"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="border-x border-slate-200 px-3.5 py-2 text-sm font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50"
          >
            {t("dashCalToday")}
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label={t("dashCalNextMonth")}
            className="px-3 py-2 text-sm text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-800"
          >
            →
          </button>
        </div>

        {canManage ? <Button onClick={openCreate}>{t("dashAcalAddEvent")}</Button> : null}

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-slate-200/70 bg-white px-3.5 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={cn("size-2 rounded-full", item.dot)} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {notice ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {notice}
        </span>
      ) : null}
      {actionError ? (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/70 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {actionError}
        </span>
      ) : null}
      {eventsError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{eventsError}</p>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            title={`${monthName(month - 1, locale)} ${year}`}
            subtitle={
              deadlinesLoading
                ? t("commonLoading")
                : `${t("dashCalDeadlineCount", { count: deadlines.length })} · ${t("dashAcalUpcomingCount", { count: monthEventCount })}`
            }
          />
          <CardBody>
            {deadlinesError ? (
              <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{deadlinesError}</p>
            ) : null}
            <div className="grid grid-cols-7 gap-1.5">
              {weekdays.map((name) => (
                <div
                  key={name}
                  className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                >
                  {name}
                </div>
              ))}
              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-16 sm:min-h-20" />;
                }
                const key = dayKey(year, month, day);
                const marks = marksByDay.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selected;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    className={cn(
                      "flex min-h-16 flex-col items-start gap-1.5 rounded-xl border border-slate-100 bg-white p-1.5 text-left transition-all duration-150 hover:border-brand-200 hover:bg-brand-50/40 sm:min-h-20 sm:p-2",
                      isSelected && "border-brand-200 bg-brand-50/70 ring-1 ring-brand-200",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full text-sm",
                        isToday
                          ? "bg-brand-900 font-semibold text-white shadow-sm"
                          : "font-medium text-slate-600",
                      )}
                    >
                      {day}
                    </span>
                    {marks.length > 0 ? (
                      <span className="flex flex-wrap items-center gap-1 px-0.5">
                        {marks.slice(0, 4).map((kind, markIndex) => (
                          <span
                            key={`${kind}-${markIndex}`}
                            className={cn("size-1.5 rounded-full", DAY_DOT[kind])}
                          />
                        ))}
                        {marks.length > 4 ? (
                          <span className="text-[10px] font-medium text-slate-600">+{marks.length - 4}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-900 text-[9px] font-semibold text-white">
                  {today.getDate()}
                </span>
                {t("dashCalToday")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-brand-500" />
                {t("dashCalTypeQuiz")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {t("dashCalTypeAssignment")}
              </span>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title={selected ? selectedDayTitle(selected, locale) : t("dashCalNoDay")}
              subtitle={selectedCount > 0 ? t("dashCalDayItems", { count: selectedCount }) : t("dashCalDeadlines")}
            />
            <CardBody className="space-y-3">
              {selected === null ? (
                <p className="text-sm text-slate-500">{t("dashCalPickDay")}</p>
              ) : selectedCount === 0 ? (
                <EmptyState title={t("dashCalNothingOnDay")} />
              ) : (
                <>
                  {selectedDeadlines.map(renderDeadlineRow)}
                  {selectedEvents.map((item) => renderEventRow(item, false))}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t("dashAcalUpcoming")}
              subtitle={
                eventsLoading ? t("commonLoading") : t("dashAcalUpcomingCount", { count: upcoming.length })
              }
            />
            <CardBody className="space-y-4">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="flex gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2 rounded-2xl border border-slate-100 p-4">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <EmptyState
                  title={t("dashAcalUpcomingEmpty")}
                  description={
                    canManage ? t("dashAcalUpcomingEmptyStaff") : t("dashAcalUpcomingEmptyStudent")
                  }
                  action={
                    canManage ? (
                      <Button size="sm" variant="secondary" onClick={openCreate}>
                        {t("dashAcalAddEvent")}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                renderGroups(upcomingGroups, false)
              )}
            </CardBody>
          </Card>

          {past.length > 0 ? (
            <Card>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-6 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-semibold tracking-tight text-slate-900">
                    {t("dashAcalPast")}
                  </span>
                  <Badge tone="slate">{t("dashAcalCount", { count: past.length })}</Badge>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className="space-y-4 border-t border-slate-100 px-6 py-4">
                  {pastGroups.length === 0 ? (
                    <EmptyState title={t("dashAcalPastEmpty")} description={t("dashAcalPastEmptyDesc")} />
                  ) : (
                    renderGroups(pastGroups, true)
                  )}
                </div>
              </details>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
