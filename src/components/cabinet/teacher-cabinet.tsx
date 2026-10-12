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

export function TeacherInfoCard({
  name,
  email,
  avatarUrl,
  position,
  department,
  faculty,
  joinedAt,
  faceEnrolled,
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
  d: Dictionary;
}) {
  const rows = [
    { label: d.cabPosition, value: position },
    { label: d.cabDepartment, value: department },
    { label: d.cabFaculty, value: faculty },
    { label: d.cabJoined, value: joinedAt },
  ];
  return (
    <Card>
      <CardHeader title={d.cabProfileTitle} />
      <CardBody>
        <div className="flex items-center gap-4">
          <Avatar name={name} src={avatarUrl} size={56} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-brand-950">{name}</p>
            <p className="truncate text-sm text-slate-500">{email}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="blue">{position}</Badge>
          <Badge tone={faceEnrolled ? "green" : "amber"}>
            {d.cabFace}: {faceEnrolled ? d.cabFaceOk : d.cabFaceNo}
          </Badge>
        </div>
        <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="truncate text-sm font-medium text-slate-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

export function TeacherSalaryCard({
  salary,
  visible,
  d,
}: {
  salary: SalaryView | null;
  visible: boolean;
  d: Dictionary;
}) {
  const labels: Record<string, string> = {
    DRAFT: d.payDraft,
    PENDING: d.payPending,
    APPROVED: d.payApproved,
    PAID: d.payPaid,
  };
  return (
    <Card>
      <CardHeader title={d.cabSalaryTitle} />
      {visible && salary ? (
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">{salary.monthLabel}</span>
            <Badge tone={SALARY_TONE[salary.status] ?? "slate"}>
              {labels[salary.status] ?? salary.status}
            </Badge>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-brand-900">
            {new Intl.NumberFormat("ru-RU").format(salary.total)}
          </p>
        </CardBody>
      ) : (
        <CardBody>
          <p className="text-sm text-slate-500">{d.cabSalaryEmpty}</p>
        </CardBody>
      )}
    </Card>
  );
}

export function TeacherLinksCard({ salaryVisible, d }: { salaryVisible: boolean; d: Dictionary }) {
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
      <CardHeader title={d.cabLinksTitle} />
      <CardBody>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <ButtonLink key={link.href} href={link.href} size="sm" variant="secondary">
              {link.label}
            </ButtonLink>
          ))}
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
