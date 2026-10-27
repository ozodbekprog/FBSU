import Link from "next/link";
import { redirect } from "next/navigation";
import { canViewSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Avatar, Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { GradeTrendChart } from "@/components/charts/GradeTrendChart";
import { cn, dayName, fmtDate, initials } from "@/lib/utils";
import { getAdminAnalytics, getStudentAnalytics, getTeacherAnalytics } from "./analytics";
import { salaryTotalsForMonth } from "@/lib/payroll";
import type { AdminAnalytics, StudentAnalytics, TeacherAnalytics } from "./analytics";
import { getDictionary, getLocale, t as translate, type Locale } from "@/i18n";
import { StudentHome } from "@/components/fb/student-home";
import { LessonBanner } from "@/components/dashboard/lesson-banner";
import { buildWorkloadData } from "@/components/workload/workload-data";
import type { WorkloadCourse, WorkloadSummary } from "@/components/workload/workload-data";
import { TeacherCoursesCard, TeacherSummaryCard } from "@/components/cabinet/teacher-cabinet";
import { isValidFaceDescriptor } from "@/modules/attendance/face";
import {
  SLOT_TIMES,
  dateFromIso,
  matchCourseSlug,
  normalizeTeacherName,
  slotRange,
  todayIso,
} from "@/components/attendance/lesson-utils";
import { LessonCountdown } from "@/components/schedule/lesson-countdown";
import type { CourseOption } from "@/components/attendance/lesson-utils";
import type { ReactNode } from "react";

const ATTENDANCE_BADGES: Record<
  string,
  {
    key:
      | "dashAttendancePresent"
      | "dashAttendanceLate"
      | "dashAttendanceExcused"
      | "dashAttendanceAbsent"
      | "dashAttendanceSuspicious"
      | "dashAttendanceLeftEarly";
    tone: "green" | "amber" | "blue" | "rose" | "slate";
    dot: string;
  }
> = {
  PRESENT: { key: "dashAttendancePresent", tone: "green", dot: "bg-emerald-500 ring-emerald-100" },
  LATE: { key: "dashAttendanceLate", tone: "amber", dot: "bg-amber-500 ring-amber-100" },
  EXCUSED: { key: "dashAttendanceExcused", tone: "blue", dot: "bg-blue-500 ring-blue-100" },
  ABSENT: { key: "dashAttendanceAbsent", tone: "rose", dot: "bg-rose-500 ring-rose-100" },
  SUSPICIOUS: { key: "dashAttendanceSuspicious", tone: "amber", dot: "bg-amber-500 ring-amber-100" },
  LEFT_EARLY: { key: "dashAttendanceLeftEarly", tone: "slate", dot: "bg-slate-400 ring-slate-100" },
};

const STAT_TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  gold: "bg-gold-300/20 text-gold-800 ring-gold-300/40",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
} as const;

type TodayLesson = {
  id: string;
  slot: number;
  subject: string;
  room: string | null;
  groupName: string;
  href: string | null;
  statusText: string;
  marked: boolean;
};

type QuickAction = {
  href: string;
  label: string;
  icon: ReactNode;
};

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <Icon className="size-4">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Icon>
  );
}

function CalendarIcon() {
  return (
    <Icon className="size-4">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </Icon>
  );
}

function ClipboardIcon() {
  return (
    <Icon className="size-4">
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </Icon>
  );
}

function HelpCircleIcon() {
  return (
    <Icon className="size-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8v.3" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

function BarChartIcon() {
  return (
    <Icon className="size-4">
      <path d="M3 20V10" />
      <path d="M9 20V4" />
      <path d="M15 20v-6" />
      <path d="M21 20H3" />
    </Icon>
  );
}

function UsersIcon() {
  return (
    <Icon className="size-4">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

function FileTextIcon() {
  return (
    <Icon className="size-4">
      <path d="M14 3v5h5" />
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M9 13h6M9 17h4" />
    </Icon>
  );
}

function Reveal({
  delay = 0,
  className,
  tour,
  children,
}: {
  delay?: number;
  className?: string;
  tour?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-tour={tour}
      className={cn("animate-fade-up", className)}
      style={{ animationDelay: `${Math.min(delay, 200)}ms` }}
    >
      {children}
    </div>
  );
}

function QuickActionLink({ href, label, icon }: QuickAction) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/20"
    >
      <span className="text-gold-300 transition-transform duration-200 group-hover:scale-110">{icon}</span>
      {label}
    </Link>
  );
}

function Hero({
  name,
  firstName,
  roleLabel,
  now,
  actions,
  locale,
}: {
  name: string;
  firstName: string;
  roleLabel: string;
  now: Date;
  actions: QuickAction[];
  locale: Locale;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-6 text-white shadow-card md:p-8">
      <span className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-gold-400/10 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-brand-400/10 blur-3xl" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={name} className="size-14! text-base ring-4 ring-white/10" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {translate(locale, "dashGreeting", { name: firstName })}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-brand-100 ring-1 ring-white/15">
                {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-300/15 px-2.5 py-0.5 text-xs font-medium text-gold-300 ring-1 ring-gold-300/25">
                <Icon className="size-3.5">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </Icon>
                {dayName(now.getDay())}, {fmtDate(now)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-200/80">
            {translate(locale, "dashQuickActions")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2" data-tour="dash-actions">
            {actions.map((action) => (
              <QuickActionLink key={action.href} {...action} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = "brand",
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof STAT_TONES;
  icon: ReactNode;
  href?: string;
}) {
  const tile = (
    <Card className="group relative h-full overflow-hidden p-5 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400 opacity-60 transition-opacity duration-200 group-hover:opacity-100" />
      {href ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute right-3 top-3 size-4 text-slate-300 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
        >
          <path d="M7 17 17 7" />
          <path d="m8 7 9 0 0 9" />
        </svg>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-brand-950">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-slate-600">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105",
            STAT_TONES[tone],
          )}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
  if (!href) return tile;
  return (
    <Link href={href} className="block h-full" aria-label={label}>
      {tile}
    </Link>
  );
}

function DateChip({ overdue, soon, children }: { overdue: boolean; soon: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium",
        overdue ? "bg-rose-50 text-rose-600" : soon ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500",
      )}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-1 hidden h-8 w-1 rounded-full bg-gradient-to-b from-brand-700 to-gold-400 sm:block" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-brand-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function AnalyticsCard({
  title,
  subtitle,
  note,
  delay,
  empty,
  emptyDescription,
  locale,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  note: string;
  delay: number;
  empty: boolean;
  emptyDescription: string;
  locale: Locale;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <Card className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-2.5 pt-3.5">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-brand-950">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3">
          {empty ? (
            <EmptyState title={translate(locale, "dashNoDataTitle")} description={emptyDescription} />
          ) : (
            <>
              <div className="flex flex-1 items-center">{children}</div>
              <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-500">
                {note}
              </p>
            </>
          )}
        </div>
      </Card>
    </Reveal>
  );
}

function GradeTrendHero({ data, locale }: { data: StudentAnalytics; locale: Locale }) {
  const values = data.gradeTrend.map((point) => point.value);
  const average = values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const last = values.length > 0 ? values[values.length - 1] : null;
  const previous = values.length > 1 ? values[values.length - 2] : null;
  const delta = last != null && previous != null ? last - previous : null;

  return (
    <Reveal delay={60}>
      <Card className="flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-brand-950">
              {translate(locale, "dashGradeTrendTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {translate(locale, "dashGradeTrendSubtitle")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {average != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                {translate(locale, "grdAverage")}
                <span className="tabular-nums">{average}%</span>
              </span>
            ) : null}
            {delta != null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold tabular-nums",
                  delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
                )}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </span>
            ) : null}
          </div>
        </div>
        <div className="px-4 pb-3.5 pt-2.5 sm:px-5">
          {data.gradeTrend.length === 0 ? (
            <EmptyState
              title={translate(locale, "dashNoDataTitle")}
              description={translate(locale, "dashGradeTrendEmpty")}
            />
          ) : (
            <GradeTrendChart data={data.gradeTrend} height={170} />
          )}
        </div>
      </Card>
    </Reveal>
  );
}

function StudentAnalyticsSection({ data, locale }: { data: StudentAnalytics; locale: Locale }) {
  return (
    <section className="mt-6">
      <SectionHeading
        title={translate(locale, "dashAnalyticsTitle")}
        subtitle={translate(locale, "dashStudentAnalyticsSubtitle")}
        action={<Badge tone="blue">{translate(locale, "dashRecordsCount", { count: data.attendanceTotal })}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title={translate(locale, "dashAttendanceDistTitle")}
          subtitle={translate(locale, "dashAttendanceDistSubtitle")}
          note={translate(locale, "dashAttendanceDistNote")}
          delay={60}
          empty={data.attendanceTotal === 0}
          emptyDescription={translate(locale, "dashAttendanceDistEmpty")}
          locale={locale}
        >
          <DonutChart data={data.attendance} />
        </AnalyticsCard>
        <AnalyticsCard
          title={translate(locale, "dashCourseAttendanceTitle")}
          subtitle={translate(locale, "dashCourseAttendanceSubtitle")}
          note={translate(locale, "dashCourseAttendanceNote")}
          delay={120}
          empty={data.courseAttendance.length === 0}
          emptyDescription={translate(locale, "dashCourseAttendanceEmpty")}
          locale={locale}
        >
          <BarChart data={data.courseAttendance} />
        </AnalyticsCard>
      </div>
    </section>
  );
}

function TeacherAnalyticsSection({ data, locale }: { data: TeacherAnalytics; locale: Locale }) {
  return (
    <section className="mt-6">
      <SectionHeading
        title={translate(locale, "dashAnalyticsTitle")}
        subtitle={translate(locale, "dashTeacherAnalyticsSubtitle")}
        action={<Badge tone="slate">{translate(locale, "dashLast14Days")}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title={translate(locale, "dashAttendanceTrendTitle")}
          subtitle={translate(locale, "dashAttendanceTrendSubtitle")}
          note={translate(locale, "dashAttendanceTrendNote")}
          delay={60}
          empty={data.attendanceByDay.length === 0}
          emptyDescription={translate(locale, "dashAttendanceTrendEmpty")}
          locale={locale}
        >
          <LineChart data={data.attendanceByDay} />
        </AnalyticsCard>
        <AnalyticsCard
          title={translate(locale, "dashSubmissionsTitle")}
          subtitle={translate(locale, "dashSubmissionsSubtitle")}
          note={translate(locale, "dashSubmissionsNote")}
          delay={120}
          empty={!data.submissionsByDay.some((point) => point.value > 0)}
          emptyDescription={translate(locale, "dashSubmissionsEmpty")}
          locale={locale}
        >
          <BarChart data={data.submissionsByDay} />
        </AnalyticsCard>
        <AnalyticsCard
          title={translate(locale, "dashCourseStudentsTitle")}
          subtitle={translate(locale, "dashCourseStudentsSubtitle")}
          note={translate(locale, "dashCourseStudentsNote")}
          delay={180}
          empty={data.studentsByCourse.length === 0}
          emptyDescription={translate(locale, "dashCourseStudentsEmpty")}
          locale={locale}
        >
          <BarChart data={data.studentsByCourse} />
        </AnalyticsCard>
        <AnalyticsCard
          title={translate(locale, "dashSubmissionStatusTitle")}
          subtitle={translate(locale, "dashSubmissionStatusSubtitle")}
          note={translate(locale, "dashSubmissionStatusNote")}
          delay={240}
          empty={!data.submissionStatus.some((slice) => slice.value > 0)}
          emptyDescription={translate(locale, "dashSubmissionStatusEmpty")}
          locale={locale}
        >
          <DonutChart data={data.submissionStatus} />
        </AnalyticsCard>
      </div>
    </section>
  );
}

function AdminAnalyticsSection({ data, locale }: { data: AdminAnalytics; locale: Locale }) {
  return (
    <section className="mt-6">
      <SectionHeading
        title={translate(locale, "dashAnalyticsTitle")}
        subtitle={translate(locale, "dashAdminAnalyticsSubtitle")}
        action={<Badge tone="slate">{translate(locale, "dashLast14Days")}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard
          title={translate(locale, "dashUserRolesTitle")}
          subtitle={translate(locale, "dashUserRolesSubtitle")}
          note={translate(locale, "dashUserRolesNote")}
          delay={60}
          empty={data.usersByRole.every((slice) => slice.value === 0)}
          emptyDescription={translate(locale, "dashUserRolesEmpty")}
          locale={locale}
        >
          <DonutChart data={data.usersByRole} />
        </AnalyticsCard>
        <AnalyticsCard
          title={translate(locale, "dashSubmissionsTrendTitle")}
          subtitle={translate(locale, "dashSubmissionsSubtitle")}
          note={translate(locale, "dashSubmissionsNote")}
          delay={120}
          empty={!data.submissionsByDay.some((point) => point.value > 0)}
          emptyDescription={translate(locale, "dashSubmissionsEmpty")}
          locale={locale}
        >
          <BarChart data={data.submissionsByDay} />
        </AnalyticsCard>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "OTA_ONA") redirect("/parent");
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const now = new Date();
  const firstName = user.name.split(" ")[0];
  const roleLabel =
    user.role === "ADMIN"
      ? dict.dashRoleAdminPanel
      : user.role === "REKTOR"
        ? dict.roleRector
        : user.role === "PRO_RECTOR"
          ? dict.roleProRector
          : user.role === "DEKAN"
            ? dict.roleDean
            : user.role === "KAFEDRA_MUDIRI"
              ? dict.roleHead
              : user.role === "REGISTRAR"
                ? dict.roleRegistrar
                : user.role === "BUXGALTER"
                  ? dict.payRoleBuxgalter
                  : user.role === "TYUTOR"
                    ? dict.roleTutor
                    : user.role === "XODIM"
                      ? dict.roleStaff
                      : user.role === "TEACHER"
                        ? dict.dashRoleTeacherPanel
                        : translate(locale, "dashRoleGroup", {
                            group: user.group?.name ?? dict.dashRoleStudent,
                          });

  if (user.role === "XODIM") {
    return (
      <>
        <Hero
          name={user.name}
          firstName={firstName}
          roleLabel={roleLabel}
          now={now}
          actions={[
            { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
            { href: "/rooms", label: dict.navRooms, icon: <HelpCircleIcon /> },
            { href: "/settings", label: dict.navSettings, icon: <ClipboardIcon /> },
            { href: "/help", label: dict.navHelp, icon: <FileTextIcon /> },
          ]}
          locale={locale}
        />
      </>
    );
  }

  if (user.role === "BUXGALTER") {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [records, totals, pending, staffCount] = await Promise.all([
      prisma.salaryRecord.findMany({
        where: { month },
        orderBy: [{ status: "asc" }, { total: "desc" }],
        take: 6,
        select: {
          id: true, total: true, status: true, baseAmount: true, bonusAmount: true,
          user: {
            select: {
              name: true,
              staffPosition: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      }),
      salaryTotalsForMonth(month),
      prisma.salaryRecord.count({ where: { month, status: "PENDING" } }),
      prisma.user.count({ where: { isActive: true, role: { not: "STUDENT" } } }),
    ]);

    const statusTone: Record<string, "slate" | "amber" | "green" | "blue"> = {
      DRAFT: "slate", PENDING: "amber", APPROVED: "green", PAID: "blue",
    };
    const statusText: Record<string, string> = {
      DRAFT: dict.payDraft, PENDING: dict.payPending,
      APPROVED: dict.payApproved, PAID: dict.payPaid,
    };
    const sum = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

    return (
      <div className="space-y-6">
        <Hero
          name={user.name}
          firstName={firstName}
          roleLabel={roleLabel}
          now={now}
          actions={[
            { href: "/payroll", label: dict.payTitle, icon: <ClipboardIcon /> },
            { href: "/calendar", label: dict.navCalendar, icon: <CalendarIcon /> },
            { href: "/help", label: dict.navHelp, icon: <HelpCircleIcon /> },
          ]}
          locale={locale}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            href="/payroll"
            label={dict.payGrandTotal}
            value={sum(totals.grandTotal)}
            hint={dict.payMonth}
            tone="brand"
            icon={<Icon><path d="M12 2v20" /><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>}
          />
          <StatTile
            href="/payroll"
            label={dict.payStaffCount}
            value={totals.totalCount}
            hint={`${staffCount} ta faol`}
            tone="emerald"
            icon={<Icon><circle cx="9" cy="7" r="4" /><path d="M16 21v-1a5 5 0 0 0-5-5h-3a5 5 0 0 0-5 5v1" /></Icon>}
          />
          <StatTile
            href="/payroll"
            label={dict.payPending}
            value={pending}
            hint={dict.payApprove}
            tone="gold"
            icon={<Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>}
          />
          <StatTile
            href="/payroll"
            label={dict.payDepartment}
            value={totals.byGroup.length}
            hint={dict.paySummarySubtitle}
            tone="brand"
            icon={<Icon><path d="M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></Icon>}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
          <div className="min-w-0 space-y-4">
            <Reveal delay={120}>
              <Card className="transition-shadow duration-200">
                <CardHeader
                  title={dict.payTabRecords}
                  subtitle={`${dict.payMonth}: ${month.toISOString().slice(0, 7)}`}
                  action={<Badge tone="blue">{records.length}</Badge>}
                />
                <CardBody>
                  {records.length === 0 ? (
                    <EmptyState title={dict.payEmpty} />
                  ) : (
                    <div className="space-y-2">
                      {records.map((r) => (
                        <div key={r.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{r.user.name}</p>
                            <p className="text-xs text-slate-500">
                              {[r.user.staffPosition?.name, r.user.department?.name]
                                .filter(Boolean).join(" · ") || "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">
                              {sum(r.total)}
                            </span>
                            <Badge tone={statusTone[r.status] ?? "slate"}>
                              {statusText[r.status] ?? r.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </Reveal>
          </div>

          <Reveal delay={180} className="min-w-0">
            <Card className="transition-shadow duration-200">
              <CardHeader title={dict.paySummaryTitle} subtitle={dict.paySummarySubtitle} />
              <CardBody>
                {totals.byGroup.length === 0 ? (
                  <p className="py-3 text-center text-sm text-slate-500">{dict.payNoGroupData}</p>
                ) : (
                  <div className="space-y-2">
                    {totals.byGroup.map((g) => (
                      <div key={g.group}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{g.group}</p>
                          <p className="text-xs text-slate-500">
                            {dict.payStaffCount}: {g.count}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          {sum(g.total)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-900 px-3 py-2 text-white">
                      <span className="text-sm font-medium">{dict.payGrandTotal}</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {sum(totals.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Reveal>
        </div>
      </div>
    );
  }

  if (user.role !== "STUDENT") {
    const isTeacherRole = user.role === "TEACHER";
    const facultyScope = user.role === "DEKAN" ? user.facultyId ?? "__none__" : null;
    const departmentScope = user.role === "KAFEDRA_MUDIRI" ? user.departmentId ?? "__none__" : null;
    const courseWhere: Prisma.CourseWhereInput = isTeacherRole
      ? { teacherId: user.id }
      : facultyScope
        ? { teacher: { facultyId: facultyScope } }
        : departmentScope
          ? { teacher: { departmentId: departmentScope } }
          : {};
    const quizWhere: Prisma.QuizWhereInput = isTeacherRole
      ? { course: { teacherId: user.id } }
      : facultyScope
        ? { course: { teacher: { facultyId: facultyScope } } }
        : departmentScope
          ? { course: { teacher: { departmentId: departmentScope } } }
          : {};
    const studentWhere: Prisma.UserWhereInput = {
      role: "STUDENT",
      ...(facultyScope ? { facultyId: facultyScope } : {}),
      ...(departmentScope
        ? {
            enrollments: {
              some: { status: "ACTIVE", course: { teacher: { departmentId: departmentScope } } },
            },
          }
        : {}),
    };
    const submissionWhere: Prisma.SubmissionWhereInput = isTeacherRole
      ? { assignment: { course: { teacherId: user.id } } }
      : facultyScope
        ? { student: { facultyId: facultyScope } }
        : departmentScope
          ? { assignment: { course: { teacher: { departmentId: departmentScope } } } }
          : {};
    const [courses, students, submissions, quizzes] = await Promise.all([
      prisma.course.count({ where: courseWhere }),
      prisma.user.count({ where: studentWhere }),
      prisma.submission.count({ where: submissionWhere }),
      prisma.quiz.count({ where: quizWhere }),
    ]);
    const analytics = isTeacherRole
      ? await getTeacherAnalytics(user.id, locale)
      : await getAdminAnalytics(locale, {
          facultyId: facultyScope,
          departmentId: departmentScope,
        });

    const todayDow = now.getDay() === 0 ? 7 : now.getDay();
    const dateIso = todayIso();
    let todayLessons: TodayLesson[] = [];
    let cabinetCourses: WorkloadCourse[] = [];
    let cabinetSummary: WorkloadSummary = {
      courseCount: 0,
      studentCount: 0,
      pendingReviews: 0,
      weeklyHours: 0,
    };
    let cabinetPosition: string | null = null;
    let cabinetFace = false;
    let cabinetSalary: { monthLabel: string; total: number; status: string } | null = null;
    let cabinetSalaryVisible = false;
    if (user.role === "TEACHER") {
      const [
        entries,
        teacherCourses,
        marks,
        cabinetProfile,
        cabinetSalaryRow,
        cabinetWorkload,
        cabinetSalaryVisibleRow,
      ] = await Promise.all([
        prisma.scheduleEntry.findMany({
          where: {
            dayOfWeek: todayDow,
            OR: [{ teacherId: user.id }, { teacherId: null, teacher: { not: null } }],
          },
          orderBy: { slot: "asc" },
          include: { group: { select: { name: true } } },
        }),
        prisma.course.findMany({
          where: { teacherId: user.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          },
        }),
        prisma.attendance.groupBy({
          by: ["courseId"],
          where: { date: dateFromIso(dateIso), course: { teacherId: user.id } },
          _count: { _all: true },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { faceDescriptor: true, staffPosition: { select: { name: true } } },
        }),
        prisma.salaryRecord.findFirst({
          where: { userId: user.id, status: { not: "DRAFT" } },
          orderBy: { month: "desc" },
          select: { month: true, total: true, status: true },
        }),
        buildWorkloadData({ teacherId: user.id, includeAllTeachers: false }),
        canViewSalary(user.role),
      ]);

      cabinetCourses = cabinetWorkload.courses;
      cabinetSummary = cabinetWorkload.summary;
      cabinetPosition = cabinetProfile?.staffPosition?.name ?? null;
      cabinetFace = isValidFaceDescriptor(cabinetProfile?.faceDescriptor);
      cabinetSalaryVisible = cabinetSalaryVisibleRow;
      cabinetSalary = cabinetSalaryRow
        ? {
            monthLabel: `${String(cabinetSalaryRow.month.getUTCMonth() + 1).padStart(2, "0")}.${cabinetSalaryRow.month.getUTCFullYear()}`,
            total: cabinetSalaryRow.total,
            status: cabinetSalaryRow.status,
          }
        : null;

      const teacherName = normalizeTeacherName(user.name);
      const markedByCourse = new Map(marks.map((row) => [row.courseId, row._count._all]));
      const options: CourseOption[] = teacherCourses.map((item) => ({
        slug: item.slug,
        title: item.title,
      }));
      const fallbackSlug = teacherCourses[0]?.slug ?? null;

      todayLessons = entries
        .filter((entry) =>
          entry.teacherId
            ? entry.teacherId === user.id
            : entry.teacher !== null && normalizeTeacherName(entry.teacher) === teacherName,
        )
        .map((entry) => {
          const matchedSlug = matchCourseSlug(entry.subject, options);
          const matched = teacherCourses.find((item) => item.slug === matchedSlug) ?? null;
          const slug = matched?.slug ?? fallbackSlug;
          const markedCount = matched ? (markedByCourse.get(matched.id) ?? 0) : 0;
          const total = matched?._count.enrollments ?? 0;
          return {
            id: entry.id,
            slot: entry.slot,
            subject: entry.subject,
            room: entry.room,
            groupName: entry.group.name,
            href: slug
              ? `/courses/${slug}/attendance/lesson?date=${dateIso}&slot=${entry.slot}`
              : null,
            statusText:
              markedCount > 0
                ? translate(locale, "dashMarkedStatus", { marked: markedCount, total })
                : dict.dashNotMarked,
            marked: markedCount > 0,
          };
        });
    }

    const actions: QuickAction[] =
      user.role === "ADMIN"
          ? [
              { href: "/admin", label: dict.dashActionStats, icon: <BarChartIcon /> },
              { href: "/admin/users", label: dict.dashActionUsers, icon: <UsersIcon /> },
              { href: "/schedule", label: dict.dashActionSchedule, icon: <CalendarIcon /> },
              { href: "/reports", label: dict.dashActionReports, icon: <FileTextIcon /> },
            ]
          : user.role === "REGISTRAR"
            ? [
                { href: "/monitoring", label: dict.navMonitoring, icon: <BarChartIcon /> },
                { href: "/approvals", label: dict.navApprovals, icon: <CheckCircleIcon /> },
                { href: "/admin/users", label: dict.admNavUsers, icon: <UsersIcon /> },
                { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
              ]
            : user.role === "TYUTOR"
              ? [
                  { href: "/curator", label: dict.navCurator, icon: <UsersIcon /> },
                  { href: "/attendance", label: dict.dashActionAttendance, icon: <CheckCircleIcon /> },
                  { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
                  { href: "/help", label: dict.navHelp, icon: <FileTextIcon /> },
                ]
              : [
                  { href: "/monitoring", label: dict.navMonitoring, icon: <BarChartIcon /> },
                        { href: "/workload", label: dict.navWorkload, icon: <ClipboardIcon /> },
                  { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
                ];

    const staffStudentsHref =
      user.role === "ADMIN" || user.role === "REGISTRAR"
        ? "/admin/users"
        : user.role === "TYUTOR"
          ? "/curator"
          : user.role === "TEACHER"
            ? "/journal"
            : "/monitoring";

    const staffSubmissionsHref =
      user.role === "TEACHER"
        ? "/grades"
        : user.role === "TYUTOR"
          ? "/tasks"
          : user.role === "REGISTRAR"
            ? "/monitoring"
            : "/reports";

    return (
      <>
        {user.role === "TEACHER" ? (
          <TeacherSummaryCard
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            greeting={translate(locale, "dashGreeting", { name: firstName })}
            roleLabel={roleLabel}
            dateLabel={`${dayName(now.getDay())}, ${fmtDate(now)}`}
            position={cabinetPosition ?? dict.roleTeacher}
            department={user.department?.name ?? "—"}
            faculty={user.faculty?.name ?? "—"}
            joinedAt={fmtDate(user.createdAt)}
            faceEnrolled={cabinetFace}
            salary={cabinetSalary}
            salaryVisible={cabinetSalaryVisible}
            d={dict}
          />
        ) : (
          <Hero
            name={user.name}
            firstName={firstName}
            roleLabel={roleLabel}
            now={now}
            actions={actions}
            locale={locale}
          />
        )}

        {analytics.kind === "teacher" ? (
          <TeacherAnalyticsSection data={analytics} locale={locale} />
        ) : null}

        {user.role === "TEACHER" ? (
          <div className="mt-6">
            <LessonBanner teacherId={user.id} />
          </div>
        ) : null}

        <SectionHeading
          title={user.role === "TEACHER" ? dict.dashTeacherLoadTitle : dict.dashStatsTitle}
          subtitle={
            user.role === "TEACHER" ? dict.dashTeacherLoadSubtitle : dict.dashStatsSubtitle
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal delay={60}>
            <StatTile
              href="/courses"
              label={dict.dashStatCourses}
              value={courses}
              hint={
                user.role === "TEACHER"
                  ? dict.dashStatCoursesTeacherHint
                  : dict.dashStatCoursesAdminHint
              }
              icon={
                <Icon>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </Icon>
              }
            />
          </Reveal>
          <Reveal delay={120}>
            <StatTile
              href={staffStudentsHref}
              label={dict.dashStatStudents}
              value={students}
              hint={dict.dashStatStudentsHint}
              tone="emerald"
              icon={
                <Icon>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </Icon>
              }
            />
          </Reveal>
          <Reveal delay={180}>
            <StatTile
              href={staffSubmissionsHref}
              label={dict.dashStatAssignments}
              value={submissions}
              hint={dict.dashStatAssignmentsHint}
              tone="amber"
              icon={
                <Icon>
                  <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
                  <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
                  <path d="m9 13 2 2 4-4" />
                </Icon>
              }
            />
          </Reveal>
          <Reveal delay={240}>
            <StatTile
              href="/quizzes"
              label={dict.dashStatQuizzes}
              value={quizzes}
              hint={dict.dashStatQuizzesHint}
              tone="gold"
              icon={
                <Icon>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8v.3" />
                  <path d="M12 17h.01" />
                </Icon>
              }
            />
          </Reveal>
        </div>

        {user.role === "TEACHER" ? (
          <Reveal delay={300} className="mt-6">
            <Card className="transition-shadow duration-200">
              <CardHeader
                title={dict.dashMyTodayLessons}
                subtitle={translate(locale, "dashTodayLessonsSubtitle", {
                  day: dayName(now.getDay()),
                  date: fmtDate(now),
                  count: todayLessons.length,
                })}
                action={
                  <Badge tone="blue">
                    {translate(locale, "dashLessonsCount", { count: todayLessons.length })}
                  </Badge>
                }
              />
              <CardBody className="space-y-2">
                {todayLessons.length === 0 ? (
                  <EmptyState
                    title={dict.dashNoLessonsTodayTitle}
                    description={dict.dashNoLessonsTodayDesc}
                  />
                ) : (
                  todayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-card",
                        lesson.marked ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex w-24 shrink-0 flex-col rounded-xl bg-brand-50 px-3 py-1.5 text-brand-800">
                          <span className="text-xs font-semibold">
                            {translate(locale, "dashPairNumber", { slot: lesson.slot })}
                          </span>
                          <span className="text-[11px] text-brand-600">
                            {SLOT_TIMES[lesson.slot] ?? ""}
                          </span>
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/schedule/lesson/${lesson.id}`}
                            className="block truncate text-sm font-medium text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline"
                          >
                            {lesson.subject}
                          </Link>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            {lesson.room ? (
                              <>
                                <span className="truncate">{lesson.room}</span>
                                <span className="text-slate-500">·</span>
                              </>
                            ) : null}
                            <span className="truncate">{lesson.groupName}</span>
                          </span>
                        </span>
                      </div>
                      {/* `shrink-0` mobil'da sig'maydi (Badge + tugma ~209px),
                          shuning uchun kichik ekranda o'ralishga ruxsat beramiz. */}
                      <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                        <Badge tone={lesson.marked ? "green" : "slate"}>{lesson.statusText}</Badge>
                        {lesson.href ? (
                          <ButtonLink href={lesson.href} size="sm">
                            {dict.dashMarkAttendance}
                          </ButtonLink>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </Reveal>
        ) : null}

        {user.role === "TEACHER" ? (
          <div className="mt-6">
            <TeacherCoursesCard courses={cabinetCourses} summary={cabinetSummary} d={dict} />
          </div>
        ) : null}

        {analytics.kind === "teacher" ? null : (
          <AdminAnalyticsSection data={analytics} locale={locale} />
        )}
      </>
    );
  }


  return (
    <StudentHome
      userId={user.id}
      userName={user.name}
      groupId={user.groupId}
      groupName={user.group?.name ?? null}
      locale={locale}
    />
  );
}
