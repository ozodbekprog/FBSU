import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/components/courses/course-access";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const courseId = params.get("courseId");
  const itemId = params.get("itemId");
  const studentId = params.get("studentId");

  if (!courseId && !itemId) {
    return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });
  }

  let resolvedCourseId = "";

  if (itemId) {
    const item = await prisma.gradeItem.findUnique({
      where: { id: itemId },
      select: { courseId: true },
    });
    if (!item) return Response.json({ ok: false, error: "Ustun topilmadi" }, { status: 404 });
    if (courseId && courseId !== item.courseId) {
      return Response.json({ ok: false, error: "Ustun boshqa kursga tegishli" }, { status: 400 });
    }
    resolvedCourseId = item.courseId;
  } else if (courseId) {
    resolvedCourseId = courseId;
  }

  if (!resolvedCourseId) {
    return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({ where: { id: resolvedCourseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.gradeItem.findMany({
    where: { courseId: course.id },
    select: { id: true },
  });

  const entries = await prisma.gradeItemScoreHistory.findMany({
    where: {
      itemId: { in: items.map((entry) => entry.id) },
      ...(studentId ? { studentId } : {}),
      ...(itemId ? { itemId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { item: { select: { name: true } }, student: { select: { name: true } } },
  });

  return Response.json({
    ok: true,
    data: {
      entries: entries.map((entry) => ({
        id: entry.id,
        itemName: entry.item.name,
        studentName: entry.student.name,
        oldScore: entry.oldScore,
        newScore: entry.newScore,
        changedById: entry.changedById,
        createdAt: entry.createdAt,
      })),
    },
  });
}
