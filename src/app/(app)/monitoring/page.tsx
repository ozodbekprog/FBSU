import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  Stat,
  Table,
} from "@/components/ui";
import { canViewMonitoring } from "@/modules/roles/access";
import { getDictionary, getLocale, t as translate } from "@/i18n";

function toneFor(percent: number): "green" | "amber" | "rose" {
  if (percent >= 80) return "green";
  if (percent >= 60) return "amber";
  return "rose";
}

function attendanceStats(counts: Map<string, number>): {
  total: number;
  attended: number;
  percent: number;
} {
  let total = 0;
  let attended = 0;
  for (const [status, count] of counts) {
    total += count;
    if (status === "PRESENT" || status === "LATE") attended += count;
  }
  return {
    total,
    attended,
    percent: total > 0 ? Math.round((attended / total) * 100) : 0,
  };
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ facultyId?: string; groupId?: string }>;
}) {
  const user = await requireUser();
  if (!canViewMonitoring(user.role)) redirect("/dashboard");

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const params = await searchParams;
  const rawFacultyId =
    typeof params.facultyId === "string" && params.facultyId.length > 0 ? params.facultyId : null;
  const groupId =
    typeof params.groupId === "string" && params.groupId.length > 0 ? params.groupId : null;

  const isDean = user.role === "DEKAN";
  const isDeptHead = user.role === "KAFEDRA_MUDIRI";
  const facultyId = isDean ? user.facultyId : rawFacultyId;

  let deptGroupIds: string[] | null = null;
  if (isDeptHead) {
    if (!user.departmentId) {
      deptGroupIds = [];
    } else {
      const deptRows = await prisma.enrollment.findMany({
        where: {
          status: "ACTIVE",
          course: { teacher: { departmentId: user.departmentId } },
        },
        select: { user: { select: { groupId: true } } },
      });
      deptGroupIds = Array.from(
        new Set(
          deptRows
            .map((row) => row.user.groupId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
    }
  }
  const scopeBlocked = (isDean && !user.facultyId) || (isDeptHead && !user.departmentId);

  const [faculties, allGroups] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.group.findMany({
      select: { id: true, name: true, facultyId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const scopeGroups = allGroups.filter((group) => {
    if (scopeBlocked) return false;
    if (isDeptHead) {
      if (!deptGroupIds?.includes(group.id)) return false;
    } else if (facultyId && group.facultyId !== facultyId) {
      return false;
    }
    if (groupId && group.id !== groupId) return false;
    return true;
  });
  const scopeGroupIds = scopeGroups.map((group) => group.id);
  const groupOptions = allGroups.filter((group) => {
    if (isDeptHead) return deptGroupIds?.includes(group.id) ?? false;
    if (facultyId) return group.facultyId === facultyId;
    return true;
  });

  const [
    students,
    teachersCount,
    coursesCount,
    attendanceGroups,
    attendanceUsers,
    submissionsTotal,
    submissionsGraded,
    pendingSchedule,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true, groupId: { in: scopeGroupIds } },
      select: { id: true, groupId: true },
    }),
    prisma.user.count({
      where: {
        role: "TEACHER",
        isActive: true,
        ...(isDean ? { facultyId: user.facultyId ?? "__none__" } : {}),
        ...(isDeptHead ? { departmentId: user.departmentId ?? "__none__" } : {}),
      },
    }),
    prisma.course.count({
      where: isDean
        ? { teacher: { facultyId: user.facultyId ?? "__none__" } }
        : isDeptHead
          ? { teacher: { departmentId: user.departmentId ?? "__none__" } }
          : {},
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { student: { groupId: { in: scopeGroupIds } } },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { groupId: { in: scopeGroupIds } },
      select: { id: true, groupId: true },
    }),
    prisma.submission.count({ where: { student: { groupId: { in: scopeGroupIds } } } }),
    prisma.submission.count({
      where: { student: { groupId: { in: scopeGroupIds } }, status: "GRADED" },
    }),
    prisma.scheduleEntry.count({
      where: { groupId: { in: scopeGroupIds }, approval: "PENDING" },
    }),
  ]);

  const overallCounts = new Map<string, number>();
  const attendanceCounts = new Map<string, Map<string, number>>();
  for (const row of attendanceGroups) {
    const count = row._count._all;
    overallCounts.set(row.status, (overallCounts.get(row.status) ?? 0) + count);
    const perStatus = attendanceCounts.get(row.studentId);
    if (perStatus) {
      perStatus.set(row.status, count);
    } else {
      attendanceCounts.set(row.studentId, new Map<string, number>([[row.status, count]]));
    }
  }

  const overallPercent = attendanceStats(overallCounts).percent;
  const riskTop = Array.from(attendanceCounts.entries())
    .map(([studentId, counts]) => ({ studentId, ...attendanceStats(counts) }))
    .filter((row) => row.total >= 3 && row.percent < 80)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 10);
  const riskUsers = riskTop.length
    ? await prisma.user.findMany({
        where: { id: { in: riskTop.map((row) => row.studentId) } },
        select: { id: true, name: true, group: { select: { name: true } } },
      })
    : [];
  const riskUserMap = new Map(riskUsers.map((row) => [row.id, row]));

  const groupIdByStudent = new Map(attendanceUsers.map((row) => [row.id, row.groupId]));
  const groupTotals = new Map<string, { total: number; attended: number }>();
  for (const [studentId, counts] of attendanceCounts) {
    const studentGroupId = groupIdByStudent.get(studentId);
    if (!studentGroupId) continue;
    const stats = attendanceStats(counts);
    const bucket = groupTotals.get(studentGroupId) ?? { total: 0, attended: 0 };
    bucket.total += stats.total;
    bucket.attended += stats.attended;
    groupTotals.set(studentGroupId, bucket);
  }

  const groupStats = scopeGroups
    .map((group) => {
      const stats = groupTotals.get(group.id) ?? { total: 0, attended: 0 };
      return {
        id: group.id,
        name: group.name,
        studentCount: students.filter((student) => student.groupId === group.id).length,
        records: stats.total,
        percent: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
      };
    })
    .sort((a, b) => a.percent - b.percent);

  const gradedPercent =
    submissionsTotal > 0 ? Math.round((submissionsGraded / submissionsTotal) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admMonitoringTitle}
        subtitle={dictionary.admMonitoringSubtitle}
      />

      <form method="get" className="mb-5">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            {!isDean && !isDeptHead ? (
              <div className="w-full sm:w-64">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{dictionary.admFaculty}</label>
                <Select name="facultyId" defaultValue={facultyId ?? ""}>
                  <option value="">{dictionary.admAllFaculties}</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="w-full sm:w-56">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{dictionary.admGroupLabel}</label>
              <Select name="groupId" defaultValue={groupId ?? ""}>
                <option value="">{dictionary.admAllGroups}</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              {dictionary.admView}
            </Button>
            {isDean ? (
              <p className="text-xs font-medium text-slate-500">
                {translate(locale, "admScope", {
                  value: user.faculty?.name ?? dictionary.admNoFacultyAssigned,
                })}
              </p>
            ) : null}
            {isDeptHead ? (
              <p className="text-xs font-medium text-slate-500">
                {translate(locale, "admScope", {
                  value: user.department?.name ?? dictionary.admNoDepartmentAssigned,
                })}
              </p>
            ) : null}
            {scopeBlocked ? (
              <p className="text-xs font-medium text-rose-600">
                {isDean ? dictionary.admNoFacultyAssignedToYou : dictionary.admNoDepartmentAssignedToYou}
              </p>
            ) : null}
            {facultyId || groupId ? (
              <a
                href="/monitoring"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                {dictionary.admClear}
              </a>
            ) : null}
          </CardBody>
        </Card>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label={dictionary.admStudents} value={students.length} hint={scopeGroups.length > 0 ? translate(locale, "admMonitoringStatStudentsHint", { count: scopeGroups.length }) : dictionary.admNoGroupSelected} />
        <Stat label={dictionary.admColTeachers} value={teachersCount} hint={dictionary.admMonitoringStatTeachersHint} />
        <Stat label={dictionary.admCourses} value={coursesCount} hint={dictionary.admMonitoringStatCoursesHint} />
        <Stat
          label={dictionary.admMonitoringStatAttendance}
          value={`${overallPercent}%`}
          hint={dictionary.admMonitoringStatAttendanceHint}
        />
        <Stat
          label={dictionary.admMonitoringStatGraded}
          value={`${gradedPercent}%`}
          hint={translate(locale, "admMonitoringStatGradedHint", {
            graded: submissionsGraded,
            total: submissionsTotal,
          })}
        />
        <Stat
          label={dictionary.admMonitoringStatPendingSchedule}
          value={pendingSchedule}
          hint={pendingSchedule > 0 ? dictionary.admMonitoringStatPendingScheduleHint : dictionary.admMonitoringQueueClear}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={dictionary.admMonitoringGroupsTitle}
            subtitle={dictionary.admMonitoringGroupsSubtitle}
          />
          <CardBody>
            {groupStats.length === 0 ? (
              <EmptyState title={dictionary.admNoDataTitle} description={dictionary.admNoGroupsFoundDesc} />
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="rounded-l-xl py-2.5 pr-3 pl-3 text-left font-medium">{dictionary.admColGroup}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.admStudents}</th>
                    <th className="px-3 py-2.5 text-left font-medium">{dictionary.admColRecords}</th>
                    <th className="rounded-r-xl px-3 py-2.5 text-left font-medium">{dictionary.admColAttendance}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupStats.map((group) => (
                    <tr key={group.id}>
                      <td className="py-2.5 pr-3 pl-3 text-sm font-medium text-slate-800">{group.name}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{group.studentCount}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{group.records}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={toneFor(group.percent)}>{group.percent}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={dictionary.admMonitoringRiskTitle}
            subtitle={dictionary.admMonitoringRiskSubtitle}
          />
          <CardBody>
            {riskTop.length === 0 ? (
              <EmptyState
                title={dictionary.admMonitoringNoRiskTitle}
                description={dictionary.admMonitoringNoRiskDesc}
              />
            ) : (
              <div className="space-y-2">
                {riskTop.map((row) => {
                  const person = riskUserMap.get(row.studentId);
                  return (
                    <div
                      key={row.studentId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {person?.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {person?.group?.name ?? "—"} ·{" "}
                          {translate(locale, "admMonitoringLessons", { attended: row.attended, total: row.total })}
                        </p>
                      </div>
                      <Badge tone={toneFor(row.percent)}>{row.percent}%</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
