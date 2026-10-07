import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui";
import { buildWorkloadData, formatHours } from "@/components/workload/workload-data";
import {
  WorkloadTeachersTable,
  parseWorkloadSort,
  sortWorkloadTeachers,
} from "@/components/workload/workload-teachers-table";
import { WorkloadCoursesTable } from "@/components/workload/workload-courses-table";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string; sort?: string; dir?: string }>;
}) {
  const user = await requireRole(["TEACHER", "ADMIN", "DEKAN", "KAFEDRA_MUDIRI", "PRO_RECTOR", "REKTOR"]);
  const params = await searchParams;
  const requestedTeacherId =
    typeof params.teacherId === "string" && params.teacherId.length > 0 ? params.teacherId : null;
  const teacherId = user.role === "TEACHER" ? user.id : requestedTeacherId;
  const isGlobalViewer = user.role === "ADMIN" || user.role === "PRO_RECTOR" || user.role === "REKTOR";
  const canSelectTeachers = user.role !== "TEACHER";

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const scopeFilter =
    user.role === "DEKAN"
      ? { facultyId: user.facultyId ?? "__none__" }
      : user.role === "KAFEDRA_MUDIRI"
        ? { departmentId: user.departmentId ?? "__none__" }
        : {};
  const data = await buildWorkloadData({
    teacherId,
    includeAllTeachers: canSelectTeachers,
    ...scopeFilter,
  });

  const { sort, dir } = parseWorkloadSort(params.sort, params.dir);
  const teachers = sortWorkloadTeachers(data.teachers, sort, dir);
  const selectedTeacher = teacherId
    ? data.teachers.find((teacher) => teacher.id === teacherId) ?? null
    : null;
  const scopeName = user.role === "TEACHER" ? user.name : selectedTeacher?.name ?? null;

  return (
    <>
      <PageHeader
        title={dictionary.admWorkloadTitle}
        eyebrow={
          user.role === "TEACHER"
            ? dictionary.admWorkloadTeacherPanel
            : isGlobalViewer
              ? dictionary.admWorkloadAdminPanel
              : dictionary.admWorkloadLeadershipPanel
        }
        subtitle={
          scopeName
            ? translate(locale, "admWorkloadSubtitle", {
                scope: scopeName,
                count: data.summary.courseCount,
              })
            : translate(locale, "admWorkloadAllTeachers", { count: data.summary.courseCount })
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-brand-50/70">
          <Stat
            label={dictionary.admCourses}
            value={data.summary.courseCount}
            hint={scopeName ? dictionary.admWorkloadStatCoursesHintAssigned : dictionary.admWorkloadStatCoursesHintAll}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-emerald-50/70">
          <Stat
            label={dictionary.admStudents}
            value={data.summary.studentCount}
            hint={dictionary.admWorkloadStatStudentsHint}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-amber-50/70">
          <Stat
            label={dictionary.admWorkloadStatPending}
            value={data.summary.pendingReviews}
            hint={dictionary.admWorkloadStatPendingHint}
          />
        </div>
        <div className="rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 [&>div]:h-full [&>div]:bg-gradient-to-br [&>div]:from-white [&>div]:to-purple-50/70">
          <Stat
            label={dictionary.admWorkloadStatHours}
            value={formatHours(data.summary.weeklyHours)}
            hint={dictionary.admWorkloadStatHoursHint}
          />
        </div>
      </div>

      {canSelectTeachers ? (
        <Card className="mt-6">
          <CardHeader
            title={dictionary.admWorkloadTeachersTitle}
            subtitle={translate(locale, "admWorkloadTeachersSubtitle", { count: data.teachers.length })}
          />
          <CardBody>
            {data.teachers.length === 0 ? (
              <EmptyState
                title={dictionary.admWorkloadTeachersEmptyTitle}
                description={dictionary.admWorkloadTeachersEmptyDesc}
              />
            ) : (
              <WorkloadTeachersTable
                teachers={teachers}
                sort={sort}
                dir={dir}
                activeTeacherId={teacherId}
              />
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader
          title={dictionary.admWorkloadCoursesTitle}
          subtitle={selectedTeacher ? selectedTeacher.name : dictionary.admWorkloadAllCourses}
          action={
            canSelectTeachers && teacherId ? (
              <Link
                href="/workload"
                className="text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-brand-800"
              >
                {dictionary.admWorkloadAll}
              </Link>
            ) : undefined
          }
        />
        <CardBody>
          {data.courses.length === 0 ? (
            <EmptyState
              title={dictionary.admWorkloadCoursesEmptyTitle}
              description={dictionary.admWorkloadCoursesEmptyDesc}
            />
          ) : (
            <WorkloadCoursesTable
              courses={data.courses}
              showTeacher={canSelectTeachers && !teacherId}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
