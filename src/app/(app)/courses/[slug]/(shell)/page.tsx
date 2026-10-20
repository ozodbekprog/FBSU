import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseMaterials } from "@/components/courses/course-materials";
import { CourseReviews } from "@/components/courses/course-reviews";
import { SelfEnrollButton } from "@/components/courses/self-enroll-button";
import { CourseSettingsCard } from "@/components/courses/course-settings-card";
import { ChoicePollCard } from "@/components/courses/choice-poll-card";
import { GlossaryCard } from "@/components/courses/glossary-card";
import { canManageCourse, canViewCourse } from "@/components/courses/course-access";

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

  const canManage = canManageCourse(user, course);
  const isEnrolled = course.enrollments.some((entry) => entry.userId === user.id);
  const canView = canViewCourse(user, course, isEnrolled);
  if (!canView && !course.isPublished) notFound();

  const isStudent = user.role === "STUDENT";
  const courseGroups = canManage
    ? Array.from(
        new Map(
          (
            await prisma.studyPlan.findMany({
              where: { courseId: course.id },
              select: { group: { select: { id: true, name: true } } },
              orderBy: { group: { name: "asc" } },
            })
          ).map((plan) => [plan.group.id, plan.group]),
        ).values(),
      )
    : [];
  const materialIds = course.sections.flatMap((section) =>
    section.materials.map((material) => material.id),
  );
  const completedMaterialIds =
    isStudent && materialIds.length > 0
      ? (
          await prisma.activityCompletion.findMany({
            where: {
              studentId: user.id,
              targetType: "MATERIAL",
              targetId: { in: materialIds },
            },
            select: { targetId: true },
          })
        ).map((row) => row.targetId)
      : [];

  return (
    <>
      {user.role === "STUDENT" && !isEnrolled && course.selfEnrollment ? (
        <div className="mb-6">
          <SelfEnrollButton courseId={course.id} />
        </div>
      ) : null}
      {canManage ? (
        <div className="mb-6">
          <CourseSettingsCard
            courseId={course.id}
            selfEnrollment={course.selfEnrollment}
            groups={courseGroups}
          />
        </div>
      ) : null}
      <CourseMaterials
        courseId={course.id}
        sections={course.sections}
        canManage={canManage}
        isStudent={isStudent}
        completedMaterialIds={completedMaterialIds}
      />
      {canManage || isEnrolled ? (
        <div className="mt-6">
          <ChoicePollCard courseId={course.id} canManage={canManage} />
        </div>
      ) : null}
      {canView ? (
        <div className="mt-6">
          <GlossaryCard courseId={course.id} canManage={canManage} />
        </div>
      ) : null}
      {canManage || isEnrolled ? (
        <div className="mt-6">
          <CourseReviews courseId={course.id} isEnrolled={isEnrolled} canManage={canManage} />
        </div>
      ) : null}
    </>
  );
}
