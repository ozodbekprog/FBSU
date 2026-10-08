import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseMaterials } from "@/components/courses/course-materials";
import { CourseReviews } from "@/components/courses/course-reviews";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { position: "asc" },
        include: { materials: { orderBy: { position: "asc" } } },
      },
      enrollments: { where: { status: "ACTIVE" }, select: { userId: true } },
    },
  });

  if (!course) notFound();

  const canManage =
    user.role === "ADMIN" || (user.role === "TEACHER" && course.teacherId === user.id);
  const isEnrolled = course.enrollments.some((entry) => entry.userId === user.id);
  if (!canManage && !course.isPublished && !isEnrolled) notFound();

  return (
    <>
      <CourseMaterials courseId={course.id} sections={course.sections} canManage={canManage} />
      {canManage || isEnrolled ? (
        <div className="mt-6">
          <CourseReviews courseId={course.id} isEnrolled={isEnrolled} canManage={canManage} />
        </div>
      ) : null}
    </>
  );
}
