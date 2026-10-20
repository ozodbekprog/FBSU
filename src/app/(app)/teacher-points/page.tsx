import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { TeacherPointsList } from "@/components/teacher-points/teacher-points-list";
import { GpaEmpty } from "@/components/gpa/gpa-empty";

type CourseOption = {
  id: string;
  title: string;
  students: { id: string; name: string; groupId: string | null; groupName: string | null }[];
  groups: { id: string; name: string }[];
};

export default async function TeacherPointsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return (
      <>
        <PageHeader title={dictionary.tchPointsTitle} subtitle={dictionary.tchPointsSubtitle} />
        <GpaEmpty
          title={dictionary.tchNoSubjectAssigned}
          description={dictionary.tchNoSubjectAssignedDesc}
        />
      </>
    );
  }

  const courses = await prisma.course.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : { OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }] },
    select: {
      id: true,
      title: true,
      enrollments: {
        where: { user: { role: "STUDENT" } },
        select: {
          user: {
            select: { id: true, name: true, groupId: true, group: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const courseOptions: CourseOption[] = courses.map((course) => {
    const studentMap = new Map<string, CourseOption["students"][number]>();
    const groupMap = new Map<string, { id: string; name: string }>();

    for (const enrollment of course.enrollments) {
      const enrolled = enrollment.user;
      if (!studentMap.has(enrolled.id)) {
        studentMap.set(enrolled.id, {
          id: enrolled.id,
          name: enrolled.name,
          groupId: enrolled.groupId,
          groupName: enrolled.group?.name ?? null,
        });
      }
      if (enrolled.group && !groupMap.has(enrolled.group.id)) {
        groupMap.set(enrolled.group.id, { id: enrolled.group.id, name: enrolled.group.name });
      }
    }

    return {
      id: course.id,
      title: course.title,
      students: [...studentMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      groups: [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  const hasStudents = courseOptions.some((course) => course.students.length > 0);

  if (courseOptions.length === 0 || !hasStudents) {
    return (
      <>
        <PageHeader title={dictionary.tchPointsTitle} subtitle={dictionary.tchPointsSubtitle} />
        <GpaEmpty
          title={dictionary.tchNoSubjectAssigned}
          description={dictionary.tchNoSubjectAssignedDesc}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={dictionary.tchPointsTitle} subtitle={dictionary.tchPointsSubtitle2} />
      <TeacherPointsList courses={courseOptions} teacherRole={user.role} />
    </>
  );
}