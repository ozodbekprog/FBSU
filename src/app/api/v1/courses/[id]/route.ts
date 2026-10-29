import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/modules/api-auth/token";
import { canManageCourse } from "@/components/courses/course-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiToken(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { user } = auth;

  const course = await prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      enrollments: { where: { userId: user.id, status: "ACTIVE" }, select: { id: true } },
      sections: {
        orderBy: { position: "asc" },
        select: { title: true, position: true },
      },
      assignments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, dueAt: true, maxScore: true },
      },
      quizzes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, dueAt: true, timeLimitMin: true },
      },
    },
  });

  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  const isEnrolled = course.enrollments.length > 0;
  if (!canManageCourse(user, course) && !isEnrolled) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    ok: true,
    data: {
      course: { id: course.id, slug: course.slug, title: course.title },
      sections: course.sections,
      assignments: course.assignments,
      quizzes: course.quizzes,
    },
  });
}
