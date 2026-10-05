import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";
import { buildCourseReport } from "@/components/reports/report-data";
import { ExportButtons } from "@/components/reports/export-buttons";
import { ReportStudentsTable } from "@/components/reports/report-table";

function percent(value: number | null) {
  return value !== null ? `${value}%` : "—";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const courses = await prisma.course.findMany({
    where: user.role === "ADMIN" ? {} : { teacherId: user.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  const { courseId } = await searchParams;
  const selected = courses.find((course) => course.id === courseId) ?? courses[0] ?? null;

  if (!selected) {
    return (
      <>
        <PageHeader title={dictionary.grdReports} subtitle={dictionary.grdTeacherPanel} />
        <EmptyState
          title={dictionary.grdNoCourses}
          description={dictionary.grdCreateCourseFirst}
        />
      </>
    );
  }

  const report = await buildCourseReport(selected);
  const { stats } = report;

  return (
    <>
      <PageHeader
        title={dictionary.grdReports}
        subtitle={`${selected.title} · ${translate(locale, "grdNStudents", {
          count: stats.studentCount,
        })}`}
        action={
          <form
            method="get"
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-1.5 shadow-sm backdrop-blur"
          >
            <span className="hidden select-none items-center gap-1.5 pl-2 pr-1 text-xs font-semibold uppercase tracking-wider text-slate-600 sm:inline-flex">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 5h18" />
                <path d="M6 12h12" />
                <path d="M10 19h4" />
              </svg>
              {dictionary.grdCourse}
            </span>
            <Select name="courseId" defaultValue={selected.id} className="w-64!">
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
            <Button type="submit">{dictionary.grdShow}</Button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-brand-50/70">
          <Stat
            label={dictionary.grdStudents}
            value={stats.studentCount}
            hint={translate(locale, "grdAssignmentsQuizzesHint", {
              assignments: stats.assignmentCount,
              quizzes: stats.quizCount,
            })}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-emerald-50/70">
          <Stat
            label={dictionary.grdAssignmentAverage}
            value={percent(stats.assignmentAverage)}
            hint={translate(locale, "grdGradedOfHint", {
              graded: stats.gradedCount,
              total: stats.submissionCount,
            })}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-sky-50/70">
          <Stat
            label={dictionary.grdSubmissionRate}
            value={percent(stats.submissionRate)}
            hint={translate(locale, "grdSubmissionsCount", { count: stats.submissionCount })}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-amber-50/70">
          <Stat
            label={dictionary.grdAttendanceRate}
            value={percent(stats.attendanceRate)}
            hint={translate(locale, "grdRecordsCount", { count: stats.attendanceCount })}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-purple-50/70">
          <Stat
            label={dictionary.grdQuizAverage}
            value={percent(stats.quizAverage)}
            hint={translate(locale, "grdQuizCount", { count: stats.quizCount })}
          />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title={dictionary.grdExport} subtitle={dictionary.grdExportSubtitle} />
        <CardBody>
          <ExportButtons courseId={selected.id} />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title={dictionary.grdStudentTable}
          subtitle={translate(locale, "grdNStudents", { count: stats.studentCount })}
        />
        <CardBody>
          <ReportStudentsTable report={report} />
        </CardBody>
      </Card>
    </>
  );
}
