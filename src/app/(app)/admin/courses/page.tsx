import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import CoursesManager from "@/components/admin/CoursesManager";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [courses, teachers] = await Promise.all([
    prisma.course.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] }, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const data = courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    isPublished: course.isPublished,
    isElective: course.isElective,
    createdAt: course.createdAt,
    teacher: course.teacher,
    studentCount: course._count.enrollments,
  }));

  return (
    <>
      <PageHeader title={dictionary.admCourses} subtitle={translate(locale, "admCoursesSubtitle", { count: data.length })} />
      <CoursesManager courses={data} teachers={teachers} />
    </>
  );
}
