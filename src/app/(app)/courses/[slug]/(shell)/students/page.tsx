import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseStudents } from "@/components/courses/course-students";
import { canGradeCourse } from "@/components/courses/course-access";

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              group: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  if (!canGradeCourse(user, course)) notFound();

  return <CourseStudents courseId={course.id} enrollments={course.enrollments} />;
}
