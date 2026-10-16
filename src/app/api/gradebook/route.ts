import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/components/courses/course-access";
import { computeFinalGrades } from "@/modules/gradebook/compute";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const [categories, items, enrollments] = await Promise.all([
    prisma.gradeCategory.findMany({ where: { courseId }, orderBy: { position: "asc" } }),
    prisma.gradeItem.findMany({ where: { courseId } }),
    prisma.enrollment.findMany({
      where: { courseId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const students = enrollments.map((enrollment) => ({
    id: enrollment.user.id,
    name: enrollment.user.name,
  }));

  const scores = await prisma.gradeItemScore.findMany({
    where: { itemId: { in: items.map((item) => item.id) } },
  });

  const finals = computeFinalGrades(
    categories.map((category) => ({ id: category.id, name: category.name, weight: category.weight })),
    items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      weight: item.weight,
      maxScore: item.maxScore,
    })),
    students.map((student) => student.id),
    scores.map((score) => ({ itemId: score.itemId, studentId: score.studentId, score: score.score })),
  );

  return Response.json({ ok: true, data: { categories, items, students, finals } });
}
