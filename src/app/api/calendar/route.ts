import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type CalendarItem = {
  id: string;
  title: string;
  type: "assignment" | "quiz";
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  dueAt: string;
};

function buildItem(
  source: { id: string; title: string; courseId: string; dueAt: Date | null },
  type: CalendarItem["type"],
  courses: Map<string, { title: string; slug: string }>,
): CalendarItem | null {
  if (!source.dueAt) return null;
  const course = courses.get(source.courseId);
  return {
    id: source.id,
    title: source.title,
    type,
    courseId: source.courseId,
    courseTitle: course?.title ?? "",
    courseSlug: course?.slug ?? "",
    dueAt: source.dueAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return Response.json(
      { ok: false, error: "month YYYY-MM ko'rinishida bo'lishi kerak" },
      { status: 400 },
    );
  }

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  try {
    const courses = await prisma.course.findMany({
      where:
        user.role === "STUDENT"
          ? { enrollments: { some: { userId: user.id, status: "ACTIVE" } } }
          : user.role === "TEACHER"
            ? { teacherId: user.id }
            : user.role === "ADMIN" || user.role === "REGISTRAR"
              ? {}
              : { id: "__none__" },
      select: { id: true, title: true, slug: true },
    });
    const courseIds = courses.map((course) => course.id);
    const courseMap = new Map(courses.map((course) => [course.id, { title: course.title, slug: course.slug }]));

    const [assignments, quizzes] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseId: { in: courseIds }, dueAt: { gte: start, lt: end } },
        orderBy: { dueAt: "asc" },
        select: { id: true, title: true, dueAt: true, courseId: true },
      }),
      prisma.quiz.findMany({
        where: {
          courseId: { in: courseIds },
          dueAt: { gte: start, lt: end },
          ...(user.role === "STUDENT" ? { isPublished: true } : {}),
        },
        orderBy: { dueAt: "asc" },
        select: { id: true, title: true, dueAt: true, courseId: true },
      }),
    ]);

    const items = [
      ...assignments.map((assignment) => buildItem(assignment, "assignment", courseMap)),
      ...quizzes.map((quiz) => buildItem(quiz, "quiz", courseMap)),
    ]
      .filter((item): item is CalendarItem => item !== null)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

    return Response.json({ ok: true, data: { items } });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Xatolik yuz berdi" }, { status: 500 });
  }
}
