import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { attendanceCounts, getStudentAttendance } from "@/app/api/attendance/summary/data";
import { StudentAttendanceOverview } from "@/components/attendance/overview-student";
import { StaffAttendanceOverview } from "@/components/attendance/overview-staff";
import type { AttendanceStatus } from "@prisma/client";

export default async function AttendancePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role === "STUDENT") {
    const [summary, records] = await Promise.all([
      getStudentAttendance(user.id),
      prisma.attendance.findMany({
        where: { studentId: user.id },
        select: {
          id: true,
          date: true,
          status: true,
          course: { select: { title: true, slug: true } },
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 10,
      }),
    ]);

    const history = records.map((record) => ({
      id: record.id,
      date: record.date,
      status: record.status,
      courseTitle: record.course.title,
      courseSlug: record.course.slug,
    }));

    return (
      <>
        <PageHeader
          eyebrow={dictionary.schAttendanceEyebrow}
          title={dictionary.schMyAttendance}
          subtitle={`${user.group?.name ?? dictionary.schStudentFallback} · ${translate(locale, "schCourseCount", { count: summary.courses.length })}`}
          action={
            <ButtonLink href="/attendance/check-in" size="sm">
              QR check-in
            </ButtonLink>
          }
        />
        <StudentAttendanceOverview summary={summary} history={history} />
      </>
    );
  }

  const isGlobalAttendance = ["ADMIN", "PRO_RECTOR", "REKTOR", "REGISTRAR"].includes(user.role);
  const courseWhere = isGlobalAttendance
    ? {}
    : user.role === "DEKAN"
      ? { teacher: { facultyId: user.facultyId ?? "__none__" } }
      : user.role === "KAFEDRA_MUDIRI"
        ? { teacher: { departmentId: user.departmentId ?? "__none__" } }
        : user.role === "TYUTOR"
          ? { enrollments: { some: { status: "ACTIVE" as const, user: { group: { curatorId: user.id } } } } }
          : { teacherId: user.id };
  const courses = await prisma.course.findMany({
    where: courseWhere,
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      _count: { select: { enrollments: { where: { status: "ACTIVE" } }, attendance: true } },
    },
    orderBy: { title: "asc" },
  });

  const records = await prisma.attendance.findMany({
    where: { courseId: { in: courses.map((course) => course.id) } },
    select: { courseId: true, status: true },
  });

  const byCourse = new Map<string, AttendanceStatus[]>();
  for (const record of records) {
    const list = byCourse.get(record.courseId);
    if (list) {
      list.push(record.status);
    } else {
      byCourse.set(record.courseId, [record.status]);
    }
  }

  const rows = courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    isPublished: course.isPublished,
    students: course._count.enrollments,
    ...attendanceCounts(byCourse.get(course.id) ?? []),
  }));

  return (
    <>
      <PageHeader
        eyebrow={dictionary.schAttendanceEyebrow}
        title={dictionary.schAttendanceControl}
        subtitle={
          user.role === "TEACHER"
            ? dictionary.schTeacherPanelYourCourses
            : isGlobalAttendance
              ? dictionary.schAdminPanelAllCourses
              : dictionary.schAttendanceScoped
        }
      />
      <StaffAttendanceOverview courses={rows} />
    </>
  );
}
