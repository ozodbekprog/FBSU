import Link from "next/link";
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

export function TeacherSummaryCard({
  name,
  email,
  avatarUrl,
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
  const links = [
    { href: "/journal", label: d.cabLinkJournal },
    { href: "/journals", label: d.cabLinkJournals },
    { href: "/workload", label: d.cabLinkWorkload },
    { href: "/schedule", label: d.cabLinkSchedule },
    { href: "/reports", label: d.cabLinkReports },
    { href: "/question-bank", label: d.cabLinkQuestionBank },
    { href: "/certificates", label: d.cabLinkCertificates },
    ...(salaryVisible ? [{ href: "/payroll", label: d.cabLinkPayroll }] : []),
  ];

  return (
    <Card>
      <CardHeader
        title={d.cabProfileTitle}
        action={
          <ButtonLink href="/profile" variant="secondary" size="sm">
            {d.cabEditProfile}
          </ButtonLink>
        }
      />
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} src={avatarUrl} size={56} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-950">{name}</p>
            <p className="truncate text-sm text-slate-500">{email}</p>
          </div>
          <div className="ml-auto hidden flex-wrap justify-end gap-2 sm:flex">
            <Badge tone="blue">{position}</Badge>
            <Badge tone={faceEnrolled ? "green" : "amber"}>
              {d.cabFace}: {faceEnrolled ? d.cabFaceOk : d.cabFaceNo}
            </Badge>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <dt className="text-xs text-slate-500">{row.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{row.value}</dd>
            </div>
          ))}
        </dl>

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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {d.cabLinksTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <ButtonLink key={link.href} href={link.href} size="sm" variant="secondary">
                {link.label}
              </ButtonLink>
            ))}
          </div>
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
