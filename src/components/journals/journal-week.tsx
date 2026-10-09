import { Badge, Button, Card, EmptyState, Progress } from "@/components/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale, t as translate, type Dictionary, type Locale } from "@/i18n";
import { formatShortIso } from "./journals-utils";
import type { JournalLesson, JournalLessonStatus } from "./journals-utils";

type BadgeTone = "slate" | "brand" | "green" | "amber" | "rose" | "blue";

const STATUS_META: Record<JournalLessonStatus, { key: keyof Dictionary; tone: BadgeTone }> = {
  done: { key: "schJrnStatusDone", tone: "green" },
  partial: { key: "schJrnStatusPartial", tone: "amber" },
  empty: { key: "schJrnStatusEmpty", tone: "rose" },
};

const SCHEDULE_META: Record<string, { key: keyof Dictionary; tone: BadgeTone; note: string }> = {
  CHANGED: { key: "schJrnChanged", tone: "amber", note: "text-amber-700" },
  MOVED: { key: "schJrnMoved", tone: "blue", note: "text-sky-700" },
};

const DOT_TONES: Record<JournalLessonStatus, string> = {
  done: "bg-emerald-500",
  partial: "bg-amber-400",
  empty: "bg-rose-400",
};

function statusView(lesson: JournalLesson, today: string) {
  if (lesson.attendanceStatus === "done") return STATUS_META.done;
  if (lesson.attendanceStatus === "partial") return STATUS_META.partial;
  if (lesson.date < today) return STATUS_META.empty;
  if (lesson.date === today) return { key: "schJrnToday" as const, tone: "brand" as BadgeTone };
  return { key: "schJrnPending" as const, tone: "slate" as BadgeTone };
}

function LessonRow({
  lesson,
  today,
  delay,
  locale,
  dictionary,
}: {
  lesson: JournalLesson;
  today: string;
  delay: number;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const cancelled = lesson.status === "CANCELLED";
  const schedule = SCHEDULE_META[lesson.status] ?? null;
  const view = statusView(lesson, today);
  const max = lesson.studentCount > 0 ? lesson.studentCount : 1;
  const lessonHref = lesson.courseSlug
    ? `/courses/${lesson.courseSlug}/attendance/lesson?date=${lesson.date}&slot=${lesson.slot}`
    : null;

  const card = (
    <Card
      className={cn(
        "flex flex-wrap items-center gap-3 p-3.5 transition-[transform,translate,background-color,border-color,box-shadow] duration-200",
        cancelled
          ? "border-dashed border-rose-200 bg-rose-50/50 opacity-80"
          : lessonHref
            ? "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
            : "",
      )}
    >
        <span
          className={cn(
            "inline-flex w-[4.6rem] shrink-0 flex-col rounded-xl px-2.5 py-1.5",
            cancelled ? "bg-rose-100/70 text-rose-700" : "bg-brand-50 text-brand-800",
          )}
        >
          <span className="text-xs font-semibold">{translate(locale, "schJrnSlot", { slot: lesson.slot })}</span>
          <span className={cn("text-[11px]", cancelled ? "text-rose-500" : "text-brand-600")}>
            {lesson.time}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              cancelled ? "text-slate-500 line-through decoration-rose-300" : "text-slate-900",
            )}
          >
            {lesson.subject}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="truncate">{lesson.group}</span>
            {lesson.room ? (
              <>
                <span className="text-slate-500">·</span>
                <span className="truncate">{lesson.room}</span>
              </>
            ) : null}
          </span>
          {!cancelled && schedule && lesson.note ? (
            <span className={cn("mt-1 block truncate text-xs", schedule.note)}>{lesson.note}</span>
          ) : null}
        </span>
        {cancelled ? null : (
          <span className="hidden w-24 shrink-0 flex-col gap-1 md:flex">
            <span className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{dictionary.schJrnAttendance}</span>
              <span className="font-medium tabular-nums text-slate-600">
                {lesson.attendanceCount}/{lesson.studentCount}
              </span>
            </span>
            <Progress value={lesson.attendanceCount} max={max} />
          </span>
        )}
        <span className="flex shrink-0 items-center gap-2.5">
          {cancelled ? (
            <>
              <Badge tone="rose">{dictionary.schJrnCancelled}</Badge>
              <span className="max-w-[15rem] text-right text-xs text-rose-600">
                {lesson.note ?? dictionary.schJrnNoAttendance}
              </span>
            </>
          ) : (
            <>
              {schedule ? <Badge tone={schedule.tone}>{dictionary[schedule.key]}</Badge> : null}
              <Badge tone={view.tone}>{dictionary[view.key]}</Badge>
              {lesson.courseSlug ? (
                <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm">
                  {dictionary.schJrnOpen}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Button size="sm" disabled>
                    {dictionary.schJrnOpen}
                  </Button>
                  <span className="text-[11px] text-slate-600">{dictionary.schJrnCourseNotFound}</span>
                </span>
              )}
            </>
          )}
        </span>
      </Card>
  );

  return (
    <li className="relative animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span
        className={cn(
          "absolute -left-[22px] top-1/2 hidden size-2.5 -translate-y-1/2 rounded-full ring-4 ring-white sm:block",
          cancelled ? "bg-rose-500" : DOT_TONES[lesson.attendanceStatus],
        )}
      />
      {lessonHref ? <Link href={lessonHref} className="block">{card}</Link> : card}
    </li>
  );
}

export async function JournalWeek({ lessons, today }: { lessons: JournalLesson[]; today: string }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const dayShorts = [
    dictionary.schJrnDayShort1,
    dictionary.schJrnDayShort2,
    dictionary.schJrnDayShort3,
    dictionary.schJrnDayShort4,
    dictionary.schJrnDayShort5,
    dictionary.schJrnDayShort6,
    dictionary.schJrnDayShort7,
  ];

  if (lessons.length === 0) {
    return (
      <EmptyState
        title={dictionary.schJrnEmptyTitle}
        description={dictionary.schJrnEmptyBody}
      />
    );
  }

  const groups: Array<{ date: string; items: JournalLesson[] }> = [];
  for (const lesson of lessons) {
    const last = groups[groups.length - 1];
    if (last && last.date === lesson.date) last.items.push(lesson);
    else groups.push({ date: lesson.date, items: [lesson] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group, sectionIndex) => {
        const first = group.items[0];
        const isToday = group.date === today;
        const isPast = group.date < today;
        return (
          <section
            key={group.date}
            className="animate-fade-up"
            style={{ animationDelay: `${sectionIndex * 50}ms` }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-bold uppercase tracking-wide",
                  isToday
                    ? "bg-brand-900 text-white shadow-sm"
                    : isPast
                      ? "bg-slate-100 text-slate-500"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                )}
              >
                <span>{dayShorts[first.dayOfWeek - 1] ?? ""}</span>
                <span className="text-[10px] font-medium normal-case">
                  {formatShortIso(group.date).slice(0, 5)}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {first.day}
                  {isToday ? (
                    <span className="ml-2 text-xs font-medium text-brand-600">{dictionary.schJrnToday}</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-600">{formatShortIso(group.date)}</p>
              </div>
              <span className="ml-auto text-xs text-slate-600">
                {translate(locale, "schJrnLessonCount", { count: group.items.length })}
              </span>
            </div>
            <ol className="ml-4 space-y-2 border-l-2 border-slate-100 pl-4">
              {group.items.map((lesson, lessonIndex) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  today={today}
                  delay={lessonIndex * 40}
                  locale={locale}
                  dictionary={dictionary}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
