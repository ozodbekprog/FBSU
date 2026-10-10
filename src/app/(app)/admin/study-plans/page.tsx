import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import StudyPlansManager from "@/components/admin/StudyPlansManager";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminStudyPlansPage() {
  await requireRole(["ADMIN", "REGISTRAR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [plans, groups, courses, terms] = await Promise.all([
    prisma.studyPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { id: true, name: true, _count: { select: { users: true } } } },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            teacher: { select: { id: true, name: true } },
            _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          },
        },
        term: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.group.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { users: { where: { role: "STUDENT", isActive: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, teacher: { select: { name: true } } },
    }),
    prisma.term.findMany({
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admStudyPlansTitle}
        subtitle={dictionary.admStudyPlansSubtitle}
      />
      <StudyPlansManager
        plans={plans.map((plan) => ({ ...plan, createdAt: plan.createdAt.toISOString() }))}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          studentCount: group._count.users,
        }))}
        courses={courses.map((course) => ({
          id: course.id,
          title: course.title,
          teacherName: course.teacher.name,
        }))}
        terms={terms}
      />
    </>
  );
}
