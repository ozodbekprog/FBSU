import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, Table } from "@/components/ui";
import { formatHours } from "@/components/workload/workload-data";
import type { WorkloadCourse, WorkloadSummary } from "@/components/workload/workload-data";
import type { Dictionary } from "@/i18n";

const SALARY_TONE: Record<string, "slate" | "amber" | "green" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  APPROVED: "green",
  PAID: "blue",
};

export type SalaryView = { monthLabel: string; total: number; status: string };

const ICON_PATHS: Record<string, ReactNode> = {
  journal: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  schedule: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  assignments: (
    <>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  quizzes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8v.3" />
      <path d="M12 17h.01" />
    </>
  ),
  journals: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  workload: (
    <>
      <path d="M6 20v-6" />
      <path d="M12 20V4" />
      <path d="M18 20V10" />
      <path d="M3 20h18" />
    </>
  ),
  reports: (
    <>
      <path d="M14 3v5h5" />
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  bank: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="M8 10h8M8 14h5" />
    </>
  ),
  certificates: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" />
    </>
  ),
  payroll: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
};

function ActionIcon({ path }: { path: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export function TeacherSummaryCard({
  name,
  email,
  avatarUrl,
  greeting,
  roleLabel,
  dateLabel,
  position,
  department,
  faculty,
  joinedAt,
  faceEnrolled,
  salary,
  salaryVisible,
  d,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  greeting: string;
  roleLabel: string;
  dateLabel: string;
  position: string;
  department: string;
  faculty: string;
  joinedAt: string;
  faceEnrolled: boolean;
  salary: SalaryView | null;
  salaryVisible: boolean;
  d: Dictionary;
}) {
  const salaryLabels: Record<string, string> = {
    DRAFT: d.payDraft,
    PENDING: d.payPending,
    APPROVED: d.payApproved,
    PAID: d.payPaid,
  };
  const infoRows = [
    { label: d.cabPosition, value: position },
    { label: d.cabDepartment, value: department },
    { label: d.cabFaculty, value: faculty },
    { label: d.cabJoined, value: joinedAt },
  ];
  const quickLinks = [
    { href: "/journal", label: d.cabLinkJournal, icon: ICON_PATHS.journal },
    { href: "/schedule", label: d.cabLinkSchedule, icon: ICON_PATHS.schedule },
    { href: "/grades", label: d.dashActionAssignments, icon: ICON_PATHS.assignments },
    { href: "/quizzes", label: d.dashActionQuizzes, icon: ICON_PATHS.quizzes },
    { href: "/journals", label: d.cabLinkJournals, icon: ICON_PATHS.journals },
    { href: "/workload", label: d.cabLinkWorkload, icon: ICON_PATHS.workload },
    { href: "/reports", label: d.cabLinkReports, icon: ICON_PATHS.reports },
    { href: "/question-bank", label: d.cabLinkQuestionBank, icon: ICON_PATHS.bank },
    { href: "/certificates", label: d.cabLinkCertificates, icon: ICON_PATHS.certificates },
    ...(salaryVisible
      ? [{ href: "/payroll", label: d.cabLinkPayroll, icon: ICON_PATHS.payroll }]
      : []),
  ];

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="app-hero relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-6 text-white md:p-7">
        <span className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-gold-400/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-brand-400/10 blur-3xl" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-gold-400/90 via-gold-300/30 to-transparent" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={name} className="size-14! text-base ring-4 ring-white/10" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greeting}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-brand-100 ring-1 ring-white/15">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-300/15 px-2.5 py-0.5 text-xs font-medium text-gold-300 ring-1 ring-gold-300/25">
                  {dateLabel}
                </span>
              </div>
            </div>
            <Badge
              tone={faceEnrolled ? "gold" : "slate"}
              className="ring-1 ring-white/15 backdrop-blur"
            >
              {d.cabFace}: {faceEnrolled ? d.cabFaceOk : d.cabFaceNo}
            </Badge>
          </div>
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-200/80">
              {d.dashQuickActions}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/20"
                >
                  <span className="text-gold-300 transition-transform duration-200 group-hover:scale-110">
                    <ActionIcon path={link.icon} />
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="truncate text-sm text-slate-500">{email}</p>
          <ButtonLink href="/profile" variant="secondary" size="sm">
            {d.cabEditProfile}
          </ButtonLink>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {d.cabProfileTitle}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5"
              >
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
          <span className="text-sm font-medium text-slate-600">{d.cabSalaryTitle}</span>
          {salaryVisible && salary ? (
            <span className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">{salary.monthLabel}</span>
              <span className="font-semibold text-brand-900">
                {new Intl.NumberFormat("ru-RU").format(salary.total)}
              </span>
              <Badge tone={SALARY_TONE[salary.status] ?? "slate"}>
                {salaryLabels[salary.status] ?? salary.status}
              </Badge>
            </span>
          ) : (
            <span className="text-sm text-slate-500">{d.cabSalaryEmpty}</span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function TeacherCoursesCard({
  courses,
  summary,
  d,
}: {
  courses: WorkloadCourse[];
  summary: WorkloadSummary;
  d: Dictionary;
}) {
  return (
    <Card>
      <CardHeader title={d.cabCoursesTitle} subtitle={`${summary.courseCount}`} />
      {courses.length === 0 ? (
        <CardBody>
          <EmptyState title={d.cabCoursesEmpty} />
        </CardBody>
      ) : (
        <Table>
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3 font-medium">{d.navCourses}</th>
              <th className="px-6 py-3 font-medium">{d.cabStatStudents}</th>
              <th className="px-6 py-3 font-medium">{d.cabStatHours}</th>
              <th className="px-6 py-3 font-medium">{d.cabStatPending}</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-b border-slate-50 last:border-0">
                <td className="px-6 py-3.5">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="font-medium text-slate-800 hover:text-brand-700"
                  >
                    {course.title}
                  </Link>
                </td>
                <td className="px-6 py-3.5 text-slate-600">{course.studentCount}</td>
                <td className="px-6 py-3.5 text-slate-600">{formatHours(course.weeklyHours)}</td>
                <td className="px-6 py-3.5 text-slate-600">
                  {course.pendingSubmissions + course.pendingTextAnswers}
                </td>
                <td className="px-6 py-3.5 text-right">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="text-sm font-medium text-brand-700 hover:text-brand-900"
                  >
                    {d.cabLinkJournal} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
