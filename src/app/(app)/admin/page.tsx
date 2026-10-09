import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { getAdminCharts } from "@/app/api/admin/charts/data";
import { cn, fmtDateTime } from "@/lib/utils";
import FileUpload from "@/components/admin/FileUpload";
import { getDictionary, getLocale, t as translate, type Dictionary } from "@/i18n";
import { AdminPanelConfig, ADMIN_WIDGETS, type AdminWidget } from "@/components/admin/AdminPanelConfig";

const QUICK_LINKS: { href: string; title: keyof Dictionary; description: keyof Dictionary; icon: ReactNode }[] = [
  {
    href: "/admin/users",
    title: "admQuickUsersTitle",
    description: "admQuickUsersDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/groups",
    title: "admQuickGroupsTitle",
    description: "admQuickGroupsDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 9 5-9 5-9-5 9-5" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </svg>
    ),
  },
  {
    href: "/admin/courses",
    title: "admQuickCoursesTitle",
    description: "admQuickCoursesDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/generator",
    title: "admQuickGeneratorTitle",
    description: "admQuickGeneratorDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 18v3M7.8 16.3l-2.2 2.1M3 12h3M7.8 7.7 5.6 5.6" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    href: "/admin/dictionaries",
    title: "admDictionaries",
    description: "admQuickDictionariesDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 7h7M9 11h7" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    title: "admSettings",
    description: "admQuickSettingsDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    title: "admOrdersTitle",
    description: "admQuickOrdersDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  {
    href: "/admissions",
    title: "qblTitle",
    description: "admQuickAdmissionsDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
  },
  {
    href: "/admin/structure",
    title: "admNavStructure",
    description: "admQuickStructureDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
        <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
      </svg>
    ),
  },
  {
    href: "/admin/departments",
    title: "admNavDepartments",
    description: "admQuickDepartmentsDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/import",
    title: "admNavImport",
    description: "admQuickImportDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
    ),
  },
  {
    href: "/admin/hemis",
    title: "admNavHemis",
    description: "admQuickHemisDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="m16 6-4-4-4 4" />
        <path d="M12 2v13" />
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    title: "admNavAudit",
    description: "admQuickAuditDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    href: "/admin/updates",
    title: "admNavUpdates",
    description: "admQuickUpdatesDesc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 18v3M7.8 16.3l-2.2 2.1M3 12h3M7.8 7.7 5.6 5.6" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
];

const STAT_META = {
  users: {
    bar: "from-brand-900 via-brand-500 to-gold-400",
    bubble: "from-brand-500 to-brand-900 shadow-brand-900/25",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  courses: {
    bar: "from-sky-400 via-brand-500 to-brand-900",
    bubble: "from-sky-400 to-brand-700 shadow-sky-500/25",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  groups: {
    bar: "from-violet-400 via-purple-500 to-brand-800",
    bubble: "from-violet-400 to-purple-700 shadow-purple-500/25",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 9 5-9 5-9-5 9-5" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </svg>
    ),
  },
  submissions: {
    bar: "from-emerald-400 via-teal-500 to-brand-800",
    bubble: "from-emerald-400 to-teal-600 shadow-emerald-500/25",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4z" />
      </svg>
    ),
  },
  quizzes: {
    bar: "from-amber-300 via-gold-400 to-gold-600",
    bubble: "from-amber-300 to-gold-500 shadow-gold-500/25",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l2 2 4-4" />
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
};

function StatTile({
  meta,
  label,
  value,
  hint,
  delay,
  href,
}: {
  meta: keyof typeof STAT_META;
  label: string;
  value: ReactNode;
  hint: ReactNode;
  delay: number;
  href?: string;
}) {
  const { bar, bubble, icon } = STAT_META[meta];
  const tile = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden p-5",
        href && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", bar)} />
      <span
        className={cn(
          "absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-[0.07]",
          bubble,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
            bubble,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="relative mt-3 text-3xl font-semibold tabular-nums tracking-tight text-brand-950">{value}</p>
      <p className="relative mt-1 text-xs text-slate-600">{hint}</p>
    </Card>
  );
  const wrapped = (
    <div className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      {tile}
    </div>
  );
  if (!href) return wrapped;
  return (
    <Link href={href} className="block h-full" aria-label={label}>
      {wrapped}
    </Link>
  );
}

export default async function AdminPage() {
  const user = await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const prefs =
    user.preferences && typeof user.preferences === "object" && !Array.isArray(user.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};
  const hiddenWidgets = (Array.isArray(prefs.adminHidden) ? prefs.adminHidden : []).filter(
    (value): value is AdminWidget =>
      typeof value === "string" && (ADMIN_WIDGETS as readonly string[]).includes(value),
  );
  const showWidget = (widget: AdminWidget) => !hiddenWidgets.includes(widget);

  const [
    users,
    courses,
    groups,
    submissions,
    quizzes,
    teachers,
    students,
    charts,
    newOrders,
    admissionCount,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.group.count(),
    prisma.submission.count(),
    prisma.quiz.count(),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    getAdminCharts(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.admissionApplication.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  const roleTotal = charts.usersByRole.reduce((sum, slice) => sum + slice.value, 0);
  const submissionTotal = charts.submissionsByDay.reduce((sum, point) => sum + point.value, 0);
  const attendanceDays = charts.attendanceRateByDay.filter((point) => point.value > 0);
  const attendanceAvg =
    attendanceDays.length > 0
      ? Math.round(attendanceDays.reduce((sum, point) => sum + point.value, 0) / attendanceDays.length)
      : 0;
  const topCourse = charts.topCourses[0];

  const quickCounts: Record<string, number> = {
    "/admin/users": users,
    "/admin/groups": groups,
    "/admin/courses": courses,
    "/admin/orders": newOrders,
    "/admissions": admissionCount,
  };

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admTitle}
        subtitle={dictionary.admSubtitle}
        action={<AdminPanelConfig hidden={hiddenWidgets} />}
      />

      {showWidget("stats") ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            meta="users"
            href="/admin/users"
            label={dictionary.admStatUsers}
            value={users}
            hint={translate(locale, "admStatUsersHint", { teachers, students })}
            delay={0}
          />
          <StatTile meta="courses" href="/admin/courses" label={dictionary.admCourses} value={courses} hint={dictionary.admStatCoursesHint} delay={60} />
          <StatTile meta="groups" href="/admin/groups" label={dictionary.admGroups} value={groups} hint={dictionary.admStatGroupsHint} delay={120} />
          <StatTile
            meta="submissions"
            href="/reports"
            label={dictionary.admStatSubmissions}
            value={submissions}
            hint={dictionary.admStatSubmissionsHint}
            delay={180}
          />
          <StatTile meta="quizzes" href="/quizzes" label={dictionary.admQuizzes} value={quizzes} hint={dictionary.admStatQuizzesHint} delay={240} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {showWidget("quick") ? (
          <Card className="animate-fade-up lg:col-span-2">
            <CardHeader title={dictionary.admQuickLinksTitle} subtitle={dictionary.admQuickLinksSubtitle} />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {QUICK_LINKS.map((link) => {
                const count = quickCounts[link.href];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/60 hover:shadow-sm"
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 group-hover:bg-brand-900 group-hover:text-white group-hover:ring-brand-900">
                      {link.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        {dictionary[link.title]}
                        {typeof count === "number" ? <Badge tone="slate">{count}</Badge> : null}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{dictionary[link.description]}</span>
                    </span>
                  </Link>
                );
              })}
            </CardBody>
          </Card>
        ) : null}

        <div className={cn("space-y-4", !showWidget("quick") && "lg:col-span-3")}>
          {showWidget("upload") ? (
            <Card className="animate-fade-up">
              <CardHeader title={dictionary.admFileUploadTitle} subtitle={dictionary.admFileUploadHint} />
              <CardBody>
                <FileUpload />
              </CardBody>
            </Card>
          ) : null}

          {showWidget("recent") ? (
            <Card className="animate-fade-up">
              <CardHeader title={dictionary.admRecentTitle} subtitle={dictionary.admRecentSubtitle} />
              <CardBody className="space-y-2">
                {recentLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">{dictionary.admRecentEmpty}</p>
                ) : (
                  recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{log.action}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {log.actor?.name ?? "—"}
                          {log.entity ? ` · ${log.entity}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                        {fmtDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {showWidget("charts") ? (
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-brand-950">{dictionary.admAnalyticsTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {dictionary.admAnalyticsSubtitle}
            </p>
          </div>
          <Badge tone="blue">{dictionary.admLast14}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader
                title={dictionary.admChartRolesTitle}
                subtitle={dictionary.admChartRolesSubtitle}
                action={<Badge tone="blue">{translate(locale, "admCount", { count: roleTotal })}</Badge>}
              />
              <CardBody className="flex flex-1 flex-col justify-center px-4 pb-4 pt-3">
                <DonutChart data={charts.usersByRole} />
              </CardBody>
            </Card>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader
                title={dictionary.admChartSubmissionsTitle}
                subtitle={dictionary.admChartSubmissionsSubtitle}
                action={<Badge tone="green">{translate(locale, "admCount", { count: submissionTotal })}</Badge>}
              />
              <CardBody className="flex flex-1 flex-col justify-center px-4 pb-4 pt-3">
                <BarChart data={charts.submissionsByDay} />
              </CardBody>
            </Card>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader
                title={dictionary.admChartAttendanceTitle}
                subtitle={dictionary.admChartAttendanceSubtitle}
                action={<Badge tone={attendanceAvg >= 80 ? "green" : attendanceAvg >= 60 ? "amber" : "rose"}>{attendanceAvg}%</Badge>}
              />
              <CardBody className="flex flex-1 flex-col justify-center px-4 pb-4 pt-3">
                <LineChart data={charts.attendanceRateByDay} />
              </CardBody>
            </Card>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader
                title={dictionary.admChartTopCoursesTitle}
                subtitle={dictionary.admChartTopCoursesSubtitle}
                action={topCourse ? <Badge tone="purple">{topCourse.label}</Badge> : null}
              />
              <CardBody className="flex flex-1 flex-col justify-center px-4 pb-4 pt-3">
                <BarChart data={charts.topCourses} />
              </CardBody>
            </Card>
          </div>

          <div className="animate-fade-up lg:col-span-2" style={{ animationDelay: "300ms" }}>
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader
                title={dictionary.admChartQuizTitle}
                subtitle={dictionary.admChartQuizSubtitle}
                action={<Badge tone="gold">{translate(locale, "admQuizCountBadge", { count: charts.quizAverages.length })}</Badge>}
              />
              <CardBody className="flex flex-1 flex-col justify-center px-4 pb-4 pt-3">
                <BarChart data={charts.quizAverages} />
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
      ) : null}
    </>
  );
}
