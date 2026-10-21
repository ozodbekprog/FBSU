import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Locale } from "@/i18n";
import type { StudentGpa } from "@/app/api/gpa/data";
import type { StudentAnalytics } from "@/app/(app)/dashboard/analytics";
import { SLOT_TIMES, slotRange } from "@/components/attendance/lesson-utils";
import { CheckInForm } from "@/components/attendance/check-in-form";
import { StudentPerformanceChart } from "@/components/dashboard/student-performance-chart";
import { courseCoverColor } from "@/components/courses/cover-tone";
import { cn, dayName, fmtDate } from "@/lib/utils";

export type StudentScheduleItem = {
  id: string;
  slot: number;
  subject: string;
  room: string | null;
  teacher: string | null;
  lessonType: string | null;
};

export type StudentUpcomingItem = {
  id: string;
  title: string;
  dueAt: Date | null;
  course: { title: string; slug: string };
  submissions: { id: string }[];
};

const LABELS = {
  uz: {
    morning: "Xayrli tong",
    day: "Xayrli kun",
    evening: "Xayrli kech",
    live: "Dars davom etmoqda",
    nextLesson: "Keyingi dars",
    noLesson: "Hozir dars yo'q",
    noLessonHint: "Bugungi darslar tugagan yoki jadval bo'sh. To'liq jadvalni ko'ring.",
    join: "Darsga qo'shilish",
    view: "Darsni ko'rish",
    finished: "Dars yakunlandi",
    done: "Tugallandi",
    now: "Hozir",
    next: "Keyingi",
    fullSchedule: "To'liq jadval",
    coursesAttendance: "Kurslar davomati",
    all: "Barchasi",
    deadlines: "Yaqin muddatlar",
    today: "Bugun",
    overdue: "Muddati o'tgan",
    daysLeft: "{count} kun",
    gradeHint: "ta baholangan",
    creditsHint: "bitiruvga {count} kredit",
    attendanceHint: "{attended} / {total} dars",
    deadlineHint: "{count} ta yaqin topshiriq",
    lessonProgress: "Dars jarayoni",
    minutes: "{done} / {total} daqiqa",
    remaining: "Tugashiga {count} daqiqa qoldi",
    online: "Onlayn",
    remainingLabel: "Qolgan vaqt",
    startLabel: "Boshlanish",
    room: "Xona",
    teacher: "O'qituvchi",
    noData: "Ma'lumot yo'q",
    semester: "Semestr",
    assignments: "Topshiriqlar",
    credits: "Kreditlar",
    attendance: "Davomat",
    gpa: "Umumiy GPA",
    courses: "Kurslarim",
    schedule: "Bugungi jadval",
    report: "Baholar",
    scheduleShort: "Jadval",
    quizzes: "Testlar",
    submitted: "{count} ta topshirilgan",
    submittedStatus: "Topshirilgan",
    notMarked: "Belgilanmagan",
    leftEarly: "Erta chiqdi",
    suspicious: "Shubhali",
    gradeTrend: "Baholar dinamikasi",
    gradeTrendSub: "Haftalik o'rtacha: topshiriq, test, GPA va davomat",
    last8Weeks: "so'nggi 8 hafta",
    attendanceAverage: "Davomat (o'rtacha)",
    weeklyActivity: "Haftalik faollik",
    weeklyActivitySub: "So'nggi 8 haftadagi harakatlar",
    actions: "harakat",
    average: "O'rtacha",
    last10: "oxirgi 10 natija",
    myCourses: "Kurslarim",
    viewAll: "Barchasi",
    qrTitle: "QR davomat",
    noGradeData: "Hozircha baholangan ish yo'q",
    present: "Qatnashdi",
    late: "Kechikdi",
    absent: "Kelmadi",
    excused: "Sababli",
    startsAt: "Boshlanishi {time}",
    group: "guruh",
  },
  ru: {
    morning: "Доброе утро",
    day: "Добрый день",
    evening: "Добрый вечер",
    live: "Урок идёт",
    nextLesson: "Следующий урок",
    noLesson: "Сейчас уроков нет",
    noLessonHint: "Занятия на сегодня завершены или расписание пустое.",
    join: "Подключиться",
    view: "Открыть урок",
    finished: "Урок завершён",
    done: "Завершён",
    now: "Сейчас",
    next: "Далее",
    fullSchedule: "Всё расписание",
    coursesAttendance: "Посещаемость курсов",
    all: "Все",
    deadlines: "Ближайшие сроки",
    today: "Сегодня",
    overdue: "Просрочено",
    daysLeft: "{count} дн.",
    gradeHint: "оценено",
    creditsHint: "до выпуска {count} кредитов",
    attendanceHint: "{attended} / {total} занятий",
    deadlineHint: "{count} ближайших заданий",
    lessonProgress: "Ход урока",
    minutes: "{done} / {total} минут",
    remaining: "До конца {count} минут",
    online: "Онлайн",
    remainingLabel: "Осталось",
    startLabel: "Начало",
    room: "Кабинет",
    teacher: "Преподаватель",
    noData: "Нет данных",
    semester: "Семестр",
    assignments: "Задания",
    credits: "Кредиты",
    attendance: "Посещаемость",
    gpa: "Общий GPA",
    courses: "Мои курсы",
    schedule: "Расписание на сегодня",
    report: "Оценки",
    scheduleShort: "Расписание",
    quizzes: "Тесты",
    submitted: "{count} сдано",
    submittedStatus: "Сдано",
    notMarked: "Не отмечено",
    leftEarly: "Ушёл раньше",
    suspicious: "Подозрительно",
    gradeTrend: "Динамика оценок",
    gradeTrendSub: "Недельные средние: задания, тесты, GPA и посещаемость",
    last8Weeks: "последние 8 недель",
    attendanceAverage: "Посещаемость (сред.)",
    weeklyActivity: "Недельная активность",
    weeklyActivitySub: "Действия за последние 8 недель",
    actions: "действий",
    average: "Среднее",
    last10: "последние 10 результатов",
    myCourses: "Мои курсы",
    viewAll: "Все",
    qrTitle: "QR-посещаемость",
    noGradeData: "Пока нет оценённых работ",
    present: "Присутствовал",
    late: "Опоздал",
    absent: "Отсутствовал",
    excused: "По причине",
    startsAt: "Начало в {time}",
    group: "группа",
  },
  en: {
    morning: "Good morning",
    day: "Good day",
    evening: "Good evening",
    live: "Lesson in progress",
    nextLesson: "Next lesson",
    noLesson: "No lesson right now",
    noLessonHint: "Today's classes are over or the schedule is empty.",
    join: "Join lesson",
    view: "View lesson",
    finished: "Lesson finished",
    done: "Completed",
    now: "Now",
    next: "Next",
    fullSchedule: "Full schedule",
    coursesAttendance: "Course attendance",
    all: "All",
    deadlines: "Upcoming deadlines",
    today: "Today",
    overdue: "Overdue",
    daysLeft: "{count} days",
    gradeHint: "graded",
    creditsHint: "{count} credits to graduation",
    attendanceHint: "{attended} / {total} classes",
    deadlineHint: "{count} upcoming assignments",
    lessonProgress: "Lesson progress",
    minutes: "{done} / {total} minutes",
    remaining: "{count} minutes left",
    online: "Online",
    remainingLabel: "Time left",
    startLabel: "Starts",
    room: "Room",
    teacher: "Teacher",
    noData: "No data",
    semester: "Semester",
    assignments: "Assignments",
    credits: "Credits",
    attendance: "Attendance",
    gpa: "Overall GPA",
    courses: "My courses",
    schedule: "Today's schedule",
    report: "Grades",
    scheduleShort: "Schedule",
    quizzes: "Tests",
    submitted: "{count} submitted",
    submittedStatus: "Submitted",
    notMarked: "Not marked",
    leftEarly: "Left early",
    suspicious: "Suspicious",
    gradeTrend: "Grade dynamics",
    gradeTrendSub: "Weekly averages: assignments, tests, GPA and attendance",
    last8Weeks: "last 8 weeks",
    attendanceAverage: "Attendance (avg)",
    weeklyActivity: "Weekly activity",
    weeklyActivitySub: "Actions over the last 8 weeks",
    actions: "actions",
    average: "Average",
    last10: "last 10 results",
    myCourses: "My courses",
    viewAll: "All",
    qrTitle: "QR attendance",
    noGradeData: "No graded work yet",
    present: "Present",
    late: "Late",
    absent: "Absent",
    excused: "Excused",
    startsAt: "Starts at {time}",
    group: "group",
  },
} as const;

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function StarIcon() {
  return (
    <Icon>
      <path d="m12 3 2.7 5.7 6.2.8-4.5 4.3 1.2 6.1-5.6-3.1-5.6 3.1 1.2-6.1-4.5-4.3 6.2-.8Z" />
    </Icon>
  );
}
function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}
function DocIcon() {
  return (
    <Icon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </Icon>
  );
}
function TicketIcon() {
  return (
    <Icon>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M12 7v10" />
    </Icon>
  );
}
function VideoIcon() {
  return (
    <Icon>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10 5-3v10l-5-3" />
    </Icon>
  );
}
function CalendarIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </Icon>
  );
}
function ArrowIcon() {
  return (
    <Icon>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}
function ChevronIcon() {
  return (
    <Icon className="size-3.5">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 86;
  const height = 30;
  const safe = values.length >= 2 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...safe, 100);
  const points = safe.map((value, index) => {
    const x = (index / (safe.length - 1)) * width;
    const y = height - (value / max) * (height - 3) - 1;
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[30px] w-[86px]" aria-hidden="true">
      <path d={area} fill="rgba(73,109,163,0.14)" />
      <path d={line} fill="none" stroke="#5373b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ring({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <span
      className={cn("inline-block size-10 rounded-full", className)}
      style={{
        background: `conic-gradient(#5373b8 ${value * 3.6}deg, rgba(127,166,217,0.18) 0)`,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-1 rounded-full bg-white" />
    </span>
  );
}

function AttendanceDonut({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, percent));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative grid size-28 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="size-28" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-slate-200" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#5373b8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform="rotate(-90 60 60)"
          className="student-ring-progress"
          style={{ "--ring-circumference": String(circumference) } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          <span className="block text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value.toFixed(1)}%
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {label}
          </span>
        </span>
      </span>
    </span>
  );
}

function Kpi({
  href,
  label,
  value,
  small,
  hint,
  icon,
  children,
}: {
  href: string;
  label: string;
  value: ReactNode;
  small?: ReactNode;
  hint: ReactNode;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[148px] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-400 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
          {icon}
        </span>
      </span>
      <span className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[2rem] font-semibold leading-none tracking-[-0.055em] tabular-nums text-slate-900">
          {value}
        </span>
        {small ? <span className="text-xs font-medium text-slate-400">{small}</span> : null}
      </span>
      <span className="mt-2 text-xs text-slate-500">{hint}</span>
      {children}
    </Link>
  );
}

export function StudentOverview({
  firstName,
  groupName,
  now,
  locale,
  gpa,
  scheduleToday,
  analytics,
  upcoming,
  assignmentStats,
  lessonAttendance,
  courses,
}: {
  firstName: string;
  groupName: string | null;
  now: Date;
  locale: Locale;
  gpa: StudentGpa;
  scheduleToday: StudentScheduleItem[];
  analytics: StudentAnalytics;
  upcoming: StudentUpcomingItem[];
  assignmentStats: { submitted: number; total: number };
  lessonAttendance: Record<string, string>;
  courses: { id: string; title: string; slug: string; teacherName: string }[];
}) {
  const L = LABELS[locale] ?? LABELS.uz;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hour = now.getHours();
  const greeting = hour < 12 ? L.morning : hour < 18 ? L.day : L.evening;

  const lessons = scheduleToday.map((lesson) => {
    const range = slotRange(lesson.slot);
    const start = range ? minutesOf(range.start) : null;
    const end = range ? minutesOf(range.end) : null;
    const state: "done" | "now" | "next" =
      start != null && end != null && nowMinutes >= start && nowMinutes < end
        ? "now"
        : start != null && nowMinutes >= start
          ? "done"
          : "next";
    return { ...lesson, range, start, end, state };
  });
  const active = lessons.find((lesson) => lesson.state === "now") ?? null;
  const next = lessons.find((lesson) => lesson.state === "next") ?? null;
  const lastDone = [...lessons].reverse().find((lesson) => lesson.state === "done") ?? null;
  const focus = active ?? next ?? lastDone;
  const focusState = active ? "now" : next ? "next" : focus ? "done" : null;

  const attendanceRate = analytics.attendanceRate;
  const attendanceTotal = analytics.attendanceTotal;
  const attendedCount = analytics.attendanceCounts.present + analytics.attendanceCounts.late;
  const gradeValues = analytics.gradeTrend.map((point) => point.value);
  const creditsTarget = 120;
  const creditsLeft = Math.max(0, creditsTarget - gpa.totalCredits);
  const courseRows = analytics.courseAttendanceDetail.slice(0, 3);
  const quizSamples = analytics.performance.quizzes.filter((value): value is number => value != null);
  const quizAverage =
    quizSamples.length > 0 ? Math.round(quizSamples.reduce((sum, value) => sum + value, 0) / quizSamples.length) : null;
  const assignmentSamples = analytics.performance.assignments.filter((value): value is number => value != null);
  const assignmentAverage =
    assignmentSamples.length > 0
      ? Math.round(assignmentSamples.reduce((sum, value) => sum + value, 0) / assignmentSamples.length)
      : null;
  const attendanceLabels: Record<string, string> = {
    PRESENT: L.present,
    LATE: L.late,
    EXCUSED: L.excused,
    ABSENT: L.absent,
    SUSPICIOUS: L.suspicious,
    LEFT_EARLY: L.leftEarly,
  };
  const attendanceTones: Record<string, string> = {
    PRESENT: "bg-brand-500",
    LATE: "bg-gold-400",
    EXCUSED: "bg-slate-400",
    ABSENT: "bg-rose-400",
    SUSPICIOUS: "bg-gold-600",
    LEFT_EARLY: "bg-slate-500",
  };

  const activeProgress =
    active && active.start != null && active.end != null
      ? Math.max(3, Math.min(100, Math.round(((nowMinutes - active.start) / (active.end - active.start)) * 100)))
      : null;

  return (
    <div className="student-dash space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
            <span className="size-1.5 animate-pulse rounded-full bg-gold-400" />
            {L.live}
          </span>
        ) : null}
        <span className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
          {groupName ? `${groupName} · ${L.group}` : L.noLesson}
        </span>
        <span className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
          {dayName(now.getDay())} · {fmtDate(now)} · {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-brand-950 sm:text-[2.8rem]">
            {greeting}, <em className="font-serif font-normal italic tracking-[-0.04em] text-gold-600 dark:text-gold-300">{firstName}.</em>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {fill(L.attendanceHint, { attended: attendedCount, total: attendanceTotal })} ·{" "}
            {fill(L.deadlineHint, { count: upcoming.length })} · GPA {gpa.gpa != null ? gpa.gpa.toFixed(2) : "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {[
            { href: "/attendance", label: L.attendance, icon: <ClockIcon /> },
            { href: "/schedule", label: L.scheduleShort, icon: <CalendarIcon /> },
            { href: "/grades", label: L.assignments, icon: <DocIcon /> },
            { href: "/quizzes", label: L.quizzes, icon: <StarIcon /> },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-800"
            >
              {action.icon}
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-slate-200/70 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="font-semibold tracking-tight text-slate-900">{L.gradeTrend}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{L.gradeTrendSub}</p>
            </div>
            <span className="text-[11px] font-medium text-slate-400">{L.last8Weeks}</span>
          </div>
          <div className="px-4 pb-4">
            {analytics.performance.assignments.some((value) => value != null) ||
            analytics.performance.quizzes.some((value) => value != null) ||
            analytics.performance.attendance.some((value) => value != null) ? (
              <StudentPerformanceChart
                labels={analytics.performance.weeks}
                series={[
                  {
                    key: "assignments",
                    label: L.assignments,
                    color: "#5373b8",
                    values:
                      assignmentSamples.length >= 2
                        ? analytics.performance.assignments
                        : analytics.performance.weeks.map(() => assignmentAverage),
                  },
                  {
                    key: "quizzes",
                    label: L.quizzes,
                    color: "#d4af37",
                    values: analytics.performance.weeks.map(() => quizAverage),
                    dashed: true,
                  },
                  {
                    key: "gpa",
                    label: L.gpa,
                    color: "#7fa6d9",
                    values: analytics.performance.weeks.map(() =>
                      gpa.gpa != null ? Math.round((gpa.gpa / 4) * 100) : null,
                    ),
                    dashed: true,
                  },
                  {
                    key: "attendance",
                    label: L.attendanceAverage,
                    color: "#8d9aab",
                    values: analytics.performance.weeks.map(() => attendanceRate),
                    dashed: true,
                  },
                ]}
              />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">{L.noGradeData}</p>
            )}
          </div>
        </section>

        <div className="h-full [&>div]:mx-0 [&>div]:h-full [&>div]:max-w-none [&>div>div]:flex [&>div>div]:h-full [&>div>div]:flex-col [&>div>div]:justify-center">
          <CheckInForm />
        </div>
      </div>

      {focus ? (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#091a31] via-[#102747] to-[#24406f] p-6 text-white shadow-[0_30px_80px_-50px_rgba(3,10,22,0.9)] sm:p-7">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-gold-400/80 via-gold-300/20 to-transparent" />
          <div className={cn("relative grid gap-6 lg:items-center", focusState === "done" ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_auto]")}>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200/80">
                <span className={cn("size-1.5 rounded-full", focusState === "now" ? "bg-gold-300 shadow-[0_0_0_4px_rgba(212,175,55,0.16)]" : focusState === "done" ? "bg-brand-300" : "bg-brand-400")} />
                {focusState === "now" ? L.live : focusState === "done" ? L.finished : L.nextLesson} · {focus.range ? `${focus.range.start}–${focus.range.end}` : SLOT_TIMES[focus.slot]}
              </span>
              <h2 className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{focus.subject}</h2>
              <p className="mt-2 truncate text-sm text-white/55">
                {[focus.room, focus.teacher, focus.lessonType].filter(Boolean).join(" · ") || "—"}
              </p>
              {active && activeProgress != null ? (
                <div className="mt-5 max-w-xl">
                  <div className="flex items-center justify-between text-[11px] text-white/45">
                    <span>{L.lessonProgress}</span>
                    <span className="font-semibold text-white/80">
                      {fill(L.minutes, {
                        done: Math.max(0, nowMinutes - (active.start ?? nowMinutes)),
                        total: (active.end ?? nowMinutes) - (active.start ?? nowMinutes),
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
                    <div className="student-bar h-full rounded-full bg-gradient-to-r from-brand-400 to-gold-300" style={{ width: `${activeProgress}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
            {focusState !== "done" ? (
              <div className="min-w-0 text-sm text-white/55">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-200">
                  <span className="size-1.5 rounded-full bg-brand-300" />
                  {focusState === "now" ? L.remainingLabel : L.startLabel}
                </span>
                <p className="mt-2 max-w-[230px] leading-relaxed">
                  {focusState === "now" && focus.end != null
                    ? fill(L.remaining, { count: Math.max(0, focus.end - nowMinutes) })
                    : focus.range
                      ? fill(L.startsAt, { time: focus.range.start })
                      : "—"}
                </p>
              </div>
            ) : null}
            <Link
              href={`/schedule/lesson/${focus.id}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-950 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <VideoIcon />
              {focusState === "done" ? L.view : L.join}
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <CalendarIcon />
              </span>
              <div>
                <p className="font-semibold text-slate-900">{L.noLesson}</p>
                <p className="mt-1 text-sm text-slate-500">{L.noLessonHint}</p>
              </div>
            </div>
            <Link href="/schedule" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-800">
              {L.fullSchedule}
              <ArrowIcon />
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Asosiy ko'rsatkichlar">
        <Kpi
          href="/gpa"
          label={L.gpa}
          value={gpa.gpa != null ? gpa.gpa.toFixed(2) : "—"}
          small="/ 4.00"
          hint={`${gpa.gradedCount} ${L.gradeHint}`}
          icon={<StarIcon />}
        >
          <span className="absolute bottom-4 right-4 opacity-80">
            <Sparkline values={gradeValues} />
          </span>
        </Kpi>
        <Kpi
          href="/attendance"
          label={L.attendance}
          value={attendanceRate != null ? attendanceRate.toFixed(1) : "—"}
          small="%"
          hint={fill(L.attendanceHint, { attended: attendedCount, total: attendanceTotal })}
          icon={<ClockIcon />}
        >
          <Ring percent={attendanceRate ?? 0} className="absolute bottom-4 right-4" />
        </Kpi>
        <Kpi
          href="/grades"
          label={L.assignments}
          value={String(upcoming.length).padStart(2, "0")}
          small={`/ ${assignmentStats.total}`}
          hint={fill(L.submitted, { count: assignmentStats.submitted })}
          icon={<DocIcon />}
        >
          <span className="absolute inset-x-5 bottom-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="student-bar block h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-300"
              style={{ width: `${assignmentStats.total > 0 ? Math.round((assignmentStats.submitted / assignmentStats.total) * 100) : 0}%` }}
            />
          </span>
        </Kpi>
        <Kpi
          href="/gpa"
          label={L.credits}
          value={gpa.totalCredits}
          small={`/ ${creditsTarget}`}
          hint={fill(L.creditsHint, { count: creditsLeft })}
          icon={<TicketIcon />}
        >
          <span className="absolute inset-x-5 bottom-3 h-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="student-bar block h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(100, Math.round((gpa.totalCredits / creditsTarget) * 100))}%` }}
            />
          </span>
        </Kpi>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)] xl:items-start">
        <div className="space-y-3">
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="font-semibold tracking-tight text-slate-900">{L.schedule}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{dayName(now.getDay())} · {fmtDate(now)}</p>
              </div>
              <Link href="/schedule" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                {L.fullSchedule}
                <ChevronIcon />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {lessons.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">{L.noLesson}</p>
              ) : (
                lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/schedule/lesson/${lesson.id}`}
                    className={cn(
                      "grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50",
                      lesson.state === "now" && "bg-brand-50/70 hover:bg-brand-50",
                    )}
                  >
                    <span className="text-xs font-semibold tabular-nums text-brand-800">
                      {lesson.range?.start ?? `#${lesson.slot}`}
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{lesson.range?.end}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{lesson.subject}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {[lesson.room, lesson.teacher, lesson.lessonType].filter(Boolean).join(" · ") || "—"}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                        <span className={cn("size-1.5 rounded-full", lessonAttendance[lesson.id] ? attendanceTones[lessonAttendance[lesson.id]] ?? "bg-slate-400" : "bg-slate-300")} />
                        {lessonAttendance[lesson.id] ? attendanceLabels[lessonAttendance[lesson.id]] ?? lessonAttendance[lesson.id] : L.notMarked}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        lesson.state === "now"
                          ? "bg-gold-300/20 text-gold-800"
                          : lesson.state === "done"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-brand-50 text-brand-700",
                      )}
                    >
                      {lesson.state === "now" ? L.now : lesson.state === "done" ? L.done : L.next}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="font-semibold tracking-tight text-slate-900">{L.coursesAttendance}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{courseRows.length} ta faol kurs</p>
              </div>
              <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                {L.all}
                <ChevronIcon />
              </Link>
            </div>
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
              {courseRows.length === 0 ? (
                <p className="text-sm text-slate-500">{L.noData}</p>
              ) : (
                courseRows.map((course) => {
                  const meta = courses.find((item) => item.id === course.courseId);
                  return (
                  <Link
                    key={course.courseId}
                    href={meta ? `/courses/${meta.slug}` : "/courses"}
                    className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 transition-colors hover:border-brand-200 hover:bg-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: courseCoverColor("#2b4b7e") }}
                      >
                        {course.title.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-900">{course.title}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{course.attended} / {course.total} dars</span>
                      </span>
                    </span>
                    <span className="mt-3 block h-1 overflow-hidden rounded-full bg-slate-200/60">
                      <span className="student-bar block h-full rounded-full bg-brand-500" style={{ width: `${course.percent}%` }} />
                    </span>
                    <span className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span>{L.attendance}</span>
                      <span className="tabular-nums text-slate-700">{course.percent}%</span>
                    </span>
                  </Link>
                  );
                })
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h3 className="font-semibold tracking-tight text-slate-900">{L.myCourses}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{courses.length} ta kurs</p>
              </div>
              <Link href="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">
                {L.viewAll}
                <ChevronIcon />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {courses.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">{L.noData}</p>
              ) : (
                courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">
                      {course.title.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{course.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{course.teacherName}</span>
                    </span>
                    <ChevronIcon />
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-3">
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold tracking-tight text-slate-900">{L.attendance}</h3>
              <span className="text-[11px] font-medium text-slate-500">{L.semester}</span>
            </div>
            <div className="mt-5 flex items-center gap-5">
              {attendanceRate != null ? (
                <AttendanceDonut percent={attendanceRate} label={L.semester} />
              ) : (
                <span className="grid size-28 shrink-0 place-items-center rounded-full bg-slate-100 text-sm text-slate-500">
                  {L.noData}
                </span>
              )}
              <ul className="min-w-0 flex-1 space-y-2 text-xs">
                {[
                  { label: L.present, value: analytics.attendanceCounts.present, color: "bg-brand-500" },
                  { label: L.late, value: analytics.attendanceCounts.late, color: "bg-brand-300" },
                  { label: L.absent, value: analytics.attendanceCounts.absent, color: "bg-rose-400" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", item.color)} />
                    <span className="min-w-0 flex-1 truncate text-slate-500">{item.label}</span>
                    <span className="font-semibold tabular-nums text-slate-800">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="font-semibold tracking-tight text-slate-900">{L.deadlines}</h3>
              <span className="text-[11px] font-medium text-slate-500">{upcoming.length} ta</span>
            </div>
            <div className="divide-y divide-slate-100">
              {upcoming.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-500">{L.noData}</p>
              ) : (
                upcoming.slice(0, 4).map((item) => {
                  const due = item.dueAt ? new Date(item.dueAt) : null;
                  const dayDiff = due ? Math.ceil((due.getTime() - now.getTime()) / 86_400_000) : null;
                  const overdue = due ? due.getTime() < now.getTime() : false;
                  const dateTile = due
                    ? {
                        day: String(due.getDate()).padStart(2, "0"),
                        month: due
                          .toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ", {
                            month: "short",
                          })
                          .replace(/[.,]/g, "")
                          .toUpperCase(),
                      }
                    : null;
                  return (
                    <Link
                      key={item.id}
                      href={`/courses/${item.course.slug}/assignments/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-center">
                        <span>
                          <span className="block text-sm font-semibold leading-none text-slate-800">{dateTile?.day ?? "—"}</span>
                          <span className="mt-0.5 block text-[8px] font-bold uppercase leading-none text-slate-500">{dateTile?.month ?? ""}</span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.course.title}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {item.submissions.length > 0 ? (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                            {L.submittedStatus}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              overdue ? "text-rose-500" : dayDiff != null && dayDiff <= 1 ? "text-gold-700" : "text-slate-500",
                            )}
                          >
                            {overdue ? L.overdue : dayDiff != null && dayDiff <= 0 ? L.today : dayDiff != null ? fill(L.daysLeft, { count: dayDiff }) : "—"}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/70 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">{L.weeklyActivity}</h3>
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                {analytics.performance.activity.reduce((sum, value) => sum + value, 0)} {L.actions}
              </span>
            </div>
            <div className="mt-2 flex h-8 items-end gap-1">
              {analytics.performance.activity.map((count, index) => {
                const max = Math.max(...analytics.performance.activity, 1);
                return (
                  <span key={`${analytics.performance.weeks[index]}-${index}`} className="flex h-full flex-1 items-end" title={`${analytics.performance.weeks[index]}: ${count}`}>
                    <span
                      className="student-bar-y block w-full rounded-t bg-brand-500/85"
                      style={{ height: count > 0 ? `${Math.max(10, Math.round((count / max) * 100))}%` : "2px" }}
                    />
                  </span>
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
              <span>{analytics.performance.weeks[0]}</span>
              <span>{analytics.performance.weeks[analytics.performance.weeks.length - 1]}</span>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-3 text-[11px] text-slate-500">
        <span>FBSU LMS · Turin Polytechnic University in Tashkent</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand-400" />
          Tizim barqaror
        </span>
      </div>
    </div>
  );
}
