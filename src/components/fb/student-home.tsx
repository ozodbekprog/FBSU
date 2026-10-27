import "server-only";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { AttendanceStatus, ScheduleEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GPA_CREDITS, getStudentGpa } from "@/app/api/gpa/data";
import { isValidFaceDescriptor } from "@/modules/attendance/face";
import { CheckInForm } from "@/components/attendance/check-in-form";
import { GradeTrendChart } from "@/components/charts/GradeTrendChart";
import { getStudentAnalytics } from "@/app/(app)/dashboard/analytics";
import { FbMotion } from "@/components/fb/fb-motion";
import { getDictionary, t as translate, type Dictionary, type Locale } from "@/i18n";
import { cn, dayName, fmtDate, monthName } from "@/lib/utils";
import { matchCourseSlug, slotRange } from "@/components/attendance/lesson-utils";

const DAY_MS = 86_400_000;
const ATTENDED = new Set<AttendanceStatus>(["PRESENT", "LATE"]);

const ATT_KEY: Record<AttendanceStatus, keyof Dictionary> = {
  PRESENT: "dashAttendancePresent",
  LATE: "dashAttendanceLate",
  EXCUSED: "dashAttendanceExcused",
  ABSENT: "dashAttendanceAbsent",
  SUSPICIOUS: "dashAttendanceSuspicious",
  LEFT_EARLY: "dashAttendanceLeftEarly",
};

const ATT_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: "#0071e3",
  LATE: "#c98a00",
  EXCUSED: "#86868b",
  ABSENT: "#d2d2d7",
  SUSPICIOUS: "#a855f7",
  LEFT_EARLY: "#f97316",
};

const ROW_DOTS = ["#1d1d1f", "#6e6e73", "#a1a1a6", "#c7c7cc"];

function clock(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

function shortDate(value: Date, locale: Locale) {
  const month = monthName(value.getMonth(), locale);
  return `${value.getDate()} ${locale === "en" ? month : month.toLowerCase()}`;
}

function dayMonth(value: Date) {
  return `${String(value.getDate()).padStart(2, "0")}.${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function sparkPath(values: number[]) {
  if (values.length < 2) return null;
  return values
    .map((value, index) => {
      const x = 1 + (index / (values.length - 1)) * 64;
      const y = 22 - Math.min(100, Math.max(0, value)) * 0.18;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export async function StudentHome({
  userId,
  userName,
  groupId,
  groupName,
  locale,
}: {
  userId: string;
  userName: string;
  groupId: string | null;
  groupName: string | null;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const now = new Date();
  const todayDow = now.getDay() === 0 ? 7 : now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const time = clock(now);
  const firstName = userName.split(" ")[0];

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: { course: { include: { teacher: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  const courseOptions = enrollments.map((enrollment) => ({
    slug: enrollment.course.slug,
    title: enrollment.course.title,
  }));

  const [schedule, assignments, gpa, attendance, faceRow, announcements, studentAnalytics] =
    await Promise.all([
    groupId
      ? prisma.scheduleEntry.findMany({
          where: { groupId },
          orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
        })
      : Promise.resolve([] as ScheduleEntry[]),
    prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: { dueAt: "asc" },
      select: {
        id: true,
        title: true,
        dueAt: true,
        course: {
          select: {
            title: true,
            slug: true,
            teacher: { select: { name: true } },
          },
        },
        submissions: {
          where: { studentId: userId },
          select: { id: true, submittedAt: true },
        },
      },
    }),
    getStudentGpa(userId),
    prisma.attendance.findMany({
      where: { studentId: userId },
      select: { courseId: true, date: true, status: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { faceDescriptor: true },
    }),
    prisma.announcement.findMany({
      where: {
        OR: [{ courseId: { in: courseIds } }, { courseId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true },
    }),
    getStudentAnalytics(userId, locale),
  ]);

  const gradeTrend = studentAnalytics.gradeTrend;
  const trendValues = gradeTrend.map((point) => point.value);
  const trendAverage =
    trendValues.length > 0
      ? Math.round(trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length)
      : null;
  const trendDelta =
    trendValues.length > 1
      ? Math.round(trendValues[trendValues.length - 1] - trendValues[trendValues.length - 2])
      : null;

  const faceEnrolled = isValidFaceDescriptor(faceRow?.faceDescriptor);
  const gpaByCourse = new Map(gpa.courses.map((course) => [course.courseId, course]));

  let attended = 0;
  const statusCounts = new Map<AttendanceStatus, number>();
  const courseAttendance = new Map<string, { attended: number; total: number }>();
  for (const record of attendance) {
    statusCounts.set(record.status, (statusCounts.get(record.status) ?? 0) + 1);
    const bucket = courseAttendance.get(record.courseId) ?? { attended: 0, total: 0 };
    bucket.total += 1;
    if (ATTENDED.has(record.status)) {
      bucket.attended += 1;
      attended += 1;
    }
    courseAttendance.set(record.courseId, bucket);
  }
  const attendancePct = attendance.length > 0 ? Math.round((attended / attendance.length) * 100) : 0;

  const submittedCount = assignments.filter((assignment) => assignment.submissions.length > 0).length;
  const pending = assignments.filter(
    (assignment) => assignment.submissions.length === 0 && assignment.dueAt,
  );
  const overdueCount = pending.filter(
    (assignment) => assignment.dueAt && new Date(assignment.dueAt) < now,
  ).length;
  const soonCount = pending.filter((assignment) => {
    if (!assignment.dueAt) return false;
    const due = new Date(assignment.dueAt);
    return due >= now && due.getTime() - now.getTime() <= 7 * DAY_MS;
  }).length;
  const deadlineRows = pending.slice(0, 4);

  const todayEntries = schedule.filter((entry) => entry.dayOfWeek === todayDow);

  type FocusInfo = {
    entry: ScheduleEntry;
    offset: number;
    state: "current" | "next";
    start: number;
    end: number;
  };
  let focus: FocusInfo | null = null;
  for (const entry of todayEntries) {
    const range = slotRange(entry.slot);
    if (!range) continue;
    const start = minutes(range.start);
    const end = minutes(range.end);
    if (nowMin >= start && nowMin < end) {
      focus = { entry, offset: 0, state: "current", start, end };
      break;
    }
    if (nowMin < start) {
      focus = { entry, offset: 0, state: "next", start, end };
      break;
    }
  }

  let focusDate = todayStart;
  if (!focus) {
    for (let offset = 1; offset <= 7; offset += 1) {
      const dow = ((todayDow - 1 + offset) % 7) + 1;
      const entry = schedule.find((item) => item.dayOfWeek === dow);
      if (!entry) continue;
      const range = slotRange(entry.slot);
      if (!range) continue;
      focus = {
        entry,
        offset,
        state: "next",
        start: minutes(range.start),
        end: minutes(range.end),
      };
      focusDate = new Date(todayStart);
      focusDate.setDate(focusDate.getDate() + offset);
      break;
    }
  }

  const focusRange = focus ? slotRange(focus.entry.slot) : null;
  const focusSlug = focus ? matchCourseSlug(focus.entry.subject, courseOptions) : null;
  const focusCourse = focusSlug
    ? enrollments.find((enrollment) => enrollment.course.slug === focusSlug)?.course
    : undefined;
  const focusTeacher = focus?.entry.teacher ?? focusCourse?.teacher.name ?? null;

  let focusPct = 0;
  let focusRight = "";
  let focusBottom = "";
  if (focus && focusRange) {
    if (focus.state === "current") {
      const total = Math.max(1, focus.end - focus.start);
      focusPct = Math.min(100, Math.max(0, Math.round(((nowMin - focus.start) / total) * 100)));
      focusRight = translate(locale, "fbdFocusMinutes", {
        elapsed: nowMin - focus.start,
        total,
      });
      focusBottom = translate(locale, "fbdFocusRemaining", { min: focus.end - nowMin });
    } else if (focus.offset === 0) {
      focusRight = `${focusRange.start}–${focusRange.end}`;
      focusBottom = translate(locale, "fbdFocusStartsIn", { min: focus.start - nowMin });
    } else {
      focusRight = `${shortDate(focusDate, locale)} · ${focusRange.start}`;
      focusBottom = `${dayName(focusDate.getDay(), locale)} · ${fmtDate(focusDate, locale)}`;
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart);
    date.setDate(date.getDate() - (todayDow - 1) + index);
    return { date, count: 0, today: index === todayDow - 1 };
  });
  for (const record of attendance) {
    const day = weekDays.find(
      (item) => item.date.toDateString() === new Date(record.date).toDateString(),
    );
    if (day) day.count += 1;
  }
  for (const assignment of assignments) {
    for (const submission of assignment.submissions) {
      const day = weekDays.find(
        (item) => item.date.toDateString() === new Date(submission.submittedAt).toDateString(),
      );
      if (day) day.count += 1;
    }
  }
  const maxActivity = Math.max(1, ...weekDays.map((day) => day.count));
  const activeDays = weekDays.filter((day) => day.count > 0).length;
  const activityTotal = weekDays.reduce((sum, day) => sum + day.count, 0);
  let streak = 0;
  for (let index = todayDow - 1; index >= 0; index -= 1) {
    if (weekDays[index].count > 0) streak += 1;
    else if (index !== todayDow - 1) break;
  }

  const legend: AttendanceStatus[] = ["PRESENT", "LATE", "EXCUSED", "ABSENT"];
  for (const status of ["SUSPICIOUS", "LEFT_EARLY"] as AttendanceStatus[]) {
    if ((statusCounts.get(status) ?? 0) > 0) legend.push(status);
  }

  const spark = sparkPath(gpa.courses.map((course) => course.percent));
  const creditTarget = enrollments.length * GPA_CREDITS;
  const creditPct = creditTarget > 0 ? Math.round((gpa.totalCredits / creditTarget) * 100) : 0;
  const assignmentPct =
    assignments.length > 0 ? Math.round((submittedCount / assignments.length) * 100) : 0;
  const greeting =
    now.getHours() < 12
      ? dict.fbdGreetingMorning
      : now.getHours() < 18
        ? dict.fbdGreetingDay
        : dict.fbdGreetingEvening;

  return (
    <div className="fb-dash">
      <FbMotion variant="dashboard" />
      <header className="fb-dash-head" data-fb-reveal>
        <div>
          <div className="fb-chips">
            {focus?.state === "current" ? (
              <span className="fb-chip live">
                <i />
                {dict.fbdLive}
              </span>
            ) : null}
            {groupName ? <span className="fb-chip blue">{groupName}</span> : null}
            <span className="fb-chip">
              {dayName(now.getDay(), locale)} · {shortDate(now, locale)}
            </span>
          </div>
          <h1 className="fb-greet">
            {greeting} <span className="fb-serif">{firstName}.</span>
          </h1>
          <div className="fb-subline">
            <span>{translate(locale, "fbdSubLessons", { count: todayEntries.length })}</span>
            <i />
            <span>{translate(locale, "fbdSubDeadlines", { count: overdueCount + soonCount })}</span>
            {gpa.gpa !== null ? (
              <>
                <i />
                <span>{translate(locale, "fbdSubGpa", { gpa: gpa.gpa.toFixed(2) })}</span>
              </>
            ) : null}
          </div>
          <nav className="fb-quick" aria-label={dict.dashQuickActions}>
            <span className="fb-quick-label">{dict.dashQuickActions}</span>
            <Link href="/attendance">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 11l3 3 8-8" />
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
              </svg>
              {dict.navAttendance}
            </Link>
            <Link href="/grades">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20V11M10 20V5M16 20v-6M22 20H2" />
              </svg>
              {dict.navGradesStudent}
            </Link>
            <Link href="/my-qr">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" />
              </svg>
              {dict.accMyQr}
            </Link>
            <Link href="/assistant">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
                <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
              </svg>
              {dict.navAssistant}
            </Link>
          </nav>
        </div>
        <div className="fb-head-actions">
          <Link className="fb-btn" href="/transcript">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            {dict.fbdReport}
          </Link>
          <Link className="fb-btn primary" href="/schedule">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
            {dict.fbdSchedule}
          </Link>
        </div>
      </header>

      {focus && focusRange ? (
        <section className="fb-focus" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {focus.state === "current" ? dict.fbdFocusNow : dict.fbdFocusNext} ·{" "}
              {focusRange.start}–{focusRange.end}
            </div>
            <h2>{focus.entry.subject}</h2>
            <div className="fb-focus-meta">
              <b>{focus.entry.room ?? dict.fbdFocusRoomUnknown}</b>
              {focusTeacher ? (
                <>
                  <i />
                  <span>{focusTeacher}</span>
                </>
              ) : null}
              {focus.entry.lessonType ? (
                <>
                  <i />
                  <span>{focus.entry.lessonType}</span>
                </>
              ) : null}
              {groupName ? (
                <>
                  <i />
                  <span>{groupName}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{dict.fbdFocusDuration}</span>
              <b>{focusRight}</b>
            </div>
            <div className="fb-fp-track">
              <i style={{ width: `${focusPct}%` }} />
            </div>
            <div className="fb-fp-bot">{focusBottom}</div>
          </div>
          <div className="fb-focus-join">
            <span className="fb-zoom">
              <i />
              {focus.offset === 0 ? dict.fbdFocusToday : dayName(focusDate.getDay(), locale)}
            </span>
            <Link className="fb-join-btn" href={`/schedule/lesson/${focus.entry.id}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m16 10 5-3v10l-5-3" />
                <rect x="3" y="6" width="13" height="12" rx="2.5" />
              </svg>
              {dict.fbdFocusJoin}
            </Link>
          </div>
        </section>
      ) : (
        <section className="fb-focus no-lesson" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dict.fbdFocusToday}
            </div>
            <h2>{dict.fbdFocusNoLesson}</h2>
            <div className="fb-focus-meta">
              <span>{dict.fbdFocusNoLessonDesc}</span>
            </div>
          </div>
          <div className="fb-focus-join">
            <Link className="fb-join-btn" href="/schedule">
              {dict.fbdCardFullSchedule}
            </Link>
          </div>
        </section>
      )}

      <section className="fb-kpis">
        <div className="fb-kpi" data-fb-reveal data-fb-delay="120">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dict.fbdKpiGpa}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={gpa.gpa ?? undefined} data-fb-decimals="2">
              {gpa.gpa !== null ? gpa.gpa.toFixed(2) : "—"}
            </b>
            {gpa.gpa !== null ? <span>/ 4.00</span> : null}
          </div>
          <div className="fb-kpi-foot">
            {gpa.gpa !== null
              ? translate(locale, "fbdKpiGpaFoot", {
                  credits: gpa.totalCredits,
                  graded: gpa.gradedCount,
                })
              : dict.fbdKpiEmpty}
          </div>
          {spark ? (
            <svg className="fb-spark" viewBox="0 0 66 24" aria-hidden="true">
              <path d={spark} />
            </svg>
          ) : null}
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="160">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dict.fbdKpiAttendance}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={attendance.length > 0 ? attendancePct : undefined}>
              {attendance.length > 0 ? attendancePct : "—"}
            </b>
            {attendance.length > 0 ? <span>%</span> : null}
          </div>
          <div className="fb-kpi-foot">
            {attendance.length > 0
              ? translate(locale, "fbdKpiAttendanceFoot", {
                  attended,
                  total: attendance.length,
                })
              : dict.fbdKpiEmpty}
          </div>
          <div
            className="fb-mini-ring"
            style={{ "--to": attendancePct } as CSSProperties}
            aria-hidden="true"
          >
            <b>
              <i data-fb-count={attendancePct}>{attendancePct}</i>%
            </b>
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="200">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dict.fbdKpiAssignments}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 11l3 3 8-8" />
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b
              data-fb-count={assignments.length > 0 ? submittedCount : undefined}
              data-fb-pad="2"
            >
              {assignments.length > 0 ? String(submittedCount).padStart(2, "0") : "—"}
            </b>
            {assignments.length > 0 ? <span>/ {assignments.length}</span> : null}
          </div>
          <div className="fb-kpi-foot">
            {assignments.length > 0
              ? translate(locale, "fbdKpiAssignmentsFoot", {
                  soon: soonCount,
                  overdue: overdueCount,
                })
              : dict.fbdKpiEmpty}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${assignmentPct}%` }} />
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="240">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dict.fbdKpiCredits}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M3 10h18M7 15h3" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={creditTarget > 0 ? gpa.totalCredits : undefined}>
              {creditTarget > 0 ? gpa.totalCredits : "—"}
            </b>
            {creditTarget > 0 ? <span>/ {creditTarget}</span> : null}
          </div>
          <div className="fb-kpi-foot">
            {creditTarget > 0
              ? translate(locale, "fbdKpiCreditsFoot", {
                  credits: gpa.totalCredits,
                  count: enrollments.length,
                })
              : dict.fbdKpiEmpty}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${creditPct}%` }} />
          </div>
        </div>
      </section>

      <div className="fb-grid">
        <div className="fb-col">
          <section className="fb-card" data-fb-reveal data-fb-delay="160">
            <div className="fb-card-head">
              <h3>{dict.fbdCardTodaySchedule}</h3>
              <span className="fb-tagline">
                {dayName(now.getDay(), locale)} · {dayMonth(now)}
              </span>
              <Link className="fb-more" href="/schedule">
                {dict.fbdCardFullSchedule}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            {todayEntries.length === 0 ? (
              <div className="fb-empty">
                <b>{dict.fbdCardNoLessons}</b>
                <p>{dict.fbdFocusNoLessonDesc}</p>
              </div>
            ) : (
              <div className="fb-sched">
                {todayEntries.map((entry) => {
                  const range = slotRange(entry.slot);
                  const start = range ? minutes(range.start) : 0;
                  const end = range ? minutes(range.end) : 0;
                  const state = nowMin >= end ? "done" : nowMin >= start ? "now" : "next";
                  return (
                    <Link
                      key={entry.id}
                      className={cn("fb-srow", state === "now" && "now")}
                      href={`/schedule/lesson/${entry.id}`}
                    >
                      <span className="fb-stime">
                        {range?.start ?? `#${entry.slot}`}
                        {range ? <span>{range.end}</span> : null}
                      </span>
                      <span className="fb-sinfo">
                        <b>{entry.subject}</b>
                        <span>
                          {entry.room ?? dict.fbdFocusRoomUnknown}
                          {entry.teacher ? (
                            <>
                              <i />
                              {entry.teacher}
                            </>
                          ) : null}
                          {entry.lessonType ? (
                            <>
                              <i />
                              {entry.lessonType}
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "fb-status",
                          state === "now" && "now",
                          state === "done" && "done",
                          state === "next" && "next",
                        )}
                      >
                        {state === "now"
                          ? dict.fbdFocusNow
                          : state === "done"
                            ? dict.fbdLessonCompleted
                            : dict.fbdFocusNext}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="fb-card fb-chart" data-fb-reveal data-fb-delay="200">
            <div className="fb-card-head">
              <div>
                <h3>{translate(locale, "dashGradeTrendTitle")}</h3>
                <span className="fb-tagline">{translate(locale, "dashGradeTrendSubtitle")}</span>
              </div>
              <div className="fb-chart-meta">
                {trendAverage != null ? (
                  <span className="fb-chart-pill">
                    {translate(locale, "grdAverage")} {trendAverage}%
                  </span>
                ) : null}
                {trendDelta != null ? (
                  <span className={cn("fb-chart-pill", trendDelta >= 0 ? "up" : "down")}>
                    {trendDelta >= 0 ? "▲" : "▼"} {Math.abs(trendDelta)}%
                  </span>
                ) : null}
                <Link className="fb-more" href="/grades">
                  {dict.fbdCardGrades}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="fb-chart-body">
              {gradeTrend.length > 0 ? (
                <GradeTrendChart data={gradeTrend} height={170} />
              ) : (
                <p className="fb-chart-empty">{translate(locale, "dashGradeTrendEmpty")}</p>
              )}
            </div>
          </section>

          <section className="fb-card" data-fb-reveal data-fb-delay="220">
            <div className="fb-card-head">
              <h3>{dict.fbdCardCoursesResults}</h3>
              <span className="fb-tagline">{dict.fbdCardSemester}</span>
              <Link className="fb-more" href="/grades">
                {dict.fbdCardGrades}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <div className="fb-empty">
                <b>{dict.fbdNoCourseData}</b>
              </div>
            ) : (
              <div className="fb-table-wrap">
                <table className="fb-table">
                  <thead>
                    <tr>
                      <th>{dict.fbdColSubject}</th>
                      <th>{dict.fbdColTeacher}</th>
                      <th>{dict.fbdColProgress}</th>
                      <th>{dict.fbdColAttendance}</th>
                      <th>{dict.fbdColScore}</th>
                      <th>{dict.fbdColGrade}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment, index) => {
                      const course = gpaByCourse.get(enrollment.courseId);
                      const stats = courseAttendance.get(enrollment.courseId);
                      const coursePct =
                        stats && stats.total > 0
                          ? Math.round((stats.attended / stats.total) * 100)
                          : null;
                      return (
                        <tr key={enrollment.id}>
                          <td>
                            <span className="fb-tname">
                              <i
                                style={{
                                  background: ROW_DOTS[index % ROW_DOTS.length],
                                }}
                              />
                              {enrollment.course.title}
                            </span>
                          </td>
                          <td className="fb-tt">{enrollment.course.teacher.name}</td>
                          <td>
                            {course ? (
                              <div className="fb-prog">
                                <i style={{ width: `${course.percent}%` }} />
                              </div>
                            ) : (
                              <span className="fb-mono-num">—</span>
                            )}
                          </td>
                          <td className="fb-mono-num">
                            {coursePct !== null ? `${coursePct}%` : "—"}
                          </td>
                          <td className="fb-mono-num">
                            {course ? course.points.toFixed(1) : "—"}
                          </td>
                          <td>
                            <span className={cn("fb-grade", course ? course.letter.toLowerCase() : "none")}>
                              {course?.letter ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="fb-card" data-fb-reveal data-fb-delay="280">
            <div className="fb-card-head">
              <h3>{dict.fbdCardCoursesContinue}</h3>
              <span className="fb-tagline">
                {translate(locale, "fbdCardActiveCourses", { count: enrollments.length })}
              </span>
              <Link className="fb-more" href="/courses">
                {dict.fbdCardAll}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <div className="fb-empty">
                <b>{dict.fbdNoCourseData}</b>
              </div>
            ) : (
              <div className="fb-courses">
                {enrollments.map((enrollment) => {
                  const course = gpaByCourse.get(enrollment.courseId);
                  const percent = course?.percent ?? 0;
                  return (
                    <Link
                      key={enrollment.id}
                      className="fb-course"
                      href={`/courses/${enrollment.course.slug}`}
                    >
                      <div className="fb-course-top">
                        <span className="fb-course-ico">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m8 5 11 7-11 7V5Z" />
                          </svg>
                        </span>
                        <span className="fb-course-name">
                          <b>{enrollment.course.title}</b>
                          <span>
                            {course && course.gradedCount > 0
                              ? translate(locale, "fbdCourseGraded", {
                                  count: course.gradedCount,
                                })
                              : dict.fbdNoCourseData}
                          </span>
                        </span>
                      </div>
                      <div className="fb-cbar">
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <div className="fb-cfoot">
                        <span>{dict.fbdCardContinue}</span>
                        <b>{percent}%</b>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="fb-col">
          <section className="fb-card" data-fb-reveal data-fb-delay="200">
            <div className="fb-card-head">
              <h3>{dict.fbdAttendanceTitle}</h3>
              <span className="fb-tagline ml-auto">{dict.fbdCardSemester}</span>
            </div>
            <div className="fb-att-body">
              <div
                className="fb-donut"
                style={{ "--to": attendancePct } as CSSProperties}
                aria-hidden="true"
              >
                <span className="fb-donut-in">
                  <b>
                    <i data-fb-count={attendancePct}>{attendancePct}</i>%
                  </b>
                  <span>{dict.fbdAttendanceOverall}</span>
                </span>
              </div>
              <div className="fb-legend">
                {legend.map((status) => (
                  <div className="fb-leg" key={status}>
                    <i style={{ background: ATT_COLOR[status] }} />
                    {translate(locale, ATT_KEY[status])}
                    <b>{statusCounts.get(status) ?? 0}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="fb-att-foot">
              <span>{translate(locale, "fbdAttendanceSynced", { time })}</span>
              <b>
                {translate(locale, "fbdKpiAttendanceFoot", {
                  attended,
                  total: attendance.length,
                })}
              </b>
            </div>
            <div className="fb-checkin" data-tour="dash-checkin">
              <CheckInForm compact faceEnrolled={faceEnrolled} />
            </div>
          </section>

          <section className="fb-card" data-fb-reveal data-fb-delay="260">
            <div className="fb-card-head">
              <h3>{dict.fbdDeadlinesTitle}</h3>
              <span className="fb-count">
                {translate(locale, "fbdDeadlineCount", { count: pending.length })}
              </span>
            </div>
            {deadlineRows.length === 0 ? (
              <div className="fb-empty">
                <b>{dict.fbdDeadlineEmpty}</b>
                <p>{dict.fbdDeadlineEmptyDesc}</p>
              </div>
            ) : (
              <div className="fb-dls">
                {deadlineRows.map((assignment) => {
                  const due = assignment.dueAt ? new Date(assignment.dueAt) : null;
                  if (!due) return null;
                  const diff = Math.ceil(
                    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
                      todayStart.getTime()) /
                      DAY_MS,
                  );
                  const when =
                    diff < 0
                      ? dict.fbdDeadlineOverdue
                      : diff === 0
                        ? dict.fbdDeadlineToday
                        : diff === 1
                          ? dict.fbdDeadlineTomorrow
                          : diff <= 7
                            ? translate(locale, "fbdDeadlineInDays", { count: diff })
                            : shortDate(due, locale);
                  return (
                    <Link
                      key={assignment.id}
                      className={cn("fb-dl", diff < 0 && "urgent")}
                      href={`/courses/${assignment.course.slug}/assignments/${assignment.id}`}
                    >
                      <span className="fb-dl-date">
                        <b>{due.getDate()}</b>
                        <span>{monthName(due.getMonth(), locale).slice(0, 3)}</span>
                      </span>
                      <span className="fb-dl-info">
                        <b>{assignment.title}</b>
                        <span>
                          {assignment.course.title} · {assignment.course.teacher.name}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "fb-dl-when",
                          diff < 0 ? "overdue" : diff <= 1 ? "soon" : undefined,
                        )}
                      >
                        {when}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="fb-card" data-fb-reveal data-fb-delay="320">
            <div className="fb-card-head">
              <h3>{dict.fbdActivityTitle}</h3>
              <span className="fb-tagline ml-auto">
                {translate(locale, "fbdActivityDays", { count: activeDays })}
              </span>
            </div>
            <div className="fb-act">
              <div className="fb-act-top">
                <span className="fb-streak">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 22c4 0 7-2.7 7-6.5 0-3-1.8-5.3-3.5-7.5C14 6 13 4 13 2c-3 1.5-5 4-5 7 0 1.2.3 2 .3 2S7 10 6 9c-.7 1.4-1 2.8-1 4.3C5 18.6 8 22 12 22Z" />
                  </svg>
                  {translate(locale, "fbdActivityStreak", { count: streak })}
                </span>
                <span className="fb-act-total">
                  {translate(locale, "fbdActivityEntries", { count: activityTotal })}
                </span>
              </div>
              <div className="fb-bars">
                {weekDays.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    className={cn(
                      "fb-daybar",
                      day.count > 0 && "has",
                      day.today && "today",
                    )}
                    title={`${dayName(day.date.getDay(), locale)} · ${day.count}`}
                  >
                    <div
                      className="b"
                      style={{
                        height: `${day.count > 0 ? Math.max(16, Math.round((day.count / maxActivity) * 100)) : 6}%`,
                      }}
                    />
                    <span>{dayName(day.date.getDay(), locale).slice(0, 2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="fb-strip" data-fb-reveal data-fb-delay="340">
        <span className="fb-strip-label">
          <i />
          {dict.fbdAnnouncements}
        </span>
        <div className="fb-strip-items">
          {announcements.length === 0 ? (
            <span className="fb-strip-empty">{dict.fbdAnnouncementsEmpty}</span>
          ) : (
            announcements.map((announcement) => (
              <span className="fb-strip-item" key={announcement.id}>
                <b>{announcement.title}</b>
                {announcement.body.replace(/\s+/g, " ").slice(0, 90)}
              </span>
            ))
          )}
        </div>
        <Link className="fb-strip-arrow" href="/messages" aria-label={dict.fbdAnnouncements}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </section>

      <div className="fb-foot-note">
        <span>FBSU LMS · Turin Polytechnic University in Tashkent</span>
        <span className="fb-foot-sync">
          <i />
          {translate(locale, "fbdStable", { time })}
        </span>
      </div>
    </div>
  );
}
