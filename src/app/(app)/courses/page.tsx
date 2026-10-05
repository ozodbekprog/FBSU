import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { CourseCard, type CourseCardData } from "@/components/courses/course-card";

export default async function CoursesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const where: Prisma.CourseWhereInput =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER"
        ? { teacherId: user.id }
        : { enrollments: { some: { userId: user.id, status: "ACTIVE" } } };

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      teacher: { select: { name: true } },
      sections: { select: { _count: { select: { materials: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  const staff = user.role !== "STUDENT";

  const items: CourseCardData[] = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    coverColor: course.coverColor,
    isPublished: course.isPublished,
    teacherName: course.teacher.name,
    materialsCount: course.sections.reduce((sum, s) => sum + s._count.materials, 0),
    studentsCount: course._count.enrollments,
  }));

  const subtitle =
    user.role === "ADMIN"
      ? translate(locale, "crsAllCoursesCount", { count: items.length })
      : user.role === "TEACHER"
        ? translate(locale, "crsTeachingCoursesCount", { count: items.length })
        : translate(locale, "crsEnrolledCoursesCount", { count: items.length });

  return (
    <>
      <PageHeader
        title={dictionary.crsCourses}
        subtitle={subtitle}
        action={staff ? <ButtonLink href="/courses/new">{dictionary.crsNewCourse}</ButtonLink> : undefined}
      />

      {items.length === 0 ? (
        <EmptyState
          title={dictionary.crsCoursesNotFound}
          description={
            staff
              ? dictionary.crsNoCoursesStaff
              : dictionary.crsNoCoursesStudent
          }
          action={staff ? <ButtonLink href="/courses/new">{dictionary.crsNewCourse}</ButtonLink> : undefined}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((course, index) => (
            <div
              key={course.id}
              className="h-full animate-fade-up"
              style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
            >
              <CourseCard course={course} staff={staff} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
