import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canGradeCourse } from "@/components/courses/course-access";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.attendancePointConfig.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { teacherId: user.id },
              {
                course: {
                  OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }],
                },
              },
            ],
          },
    include: {
      course: { select: { id: true, title: true, slug: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: [{ courseId: "asc" }, { groupId: "asc" }],
  });

  return Response.json({ ok: true, data: configs });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { courseId, groupId, points } = body;

  if (!courseId || points === undefined) {
    return Response.json({ ok: false, error: "courseId va points shart" }, { status: 400 });
  }

  const value = Number(points);
  if (!Number.isFinite(value) || value < 0.1 || value > 15) {
    return Response.json({ ok: false, error: "Ball 0.1 dan 15 gacha" }, { status: 400 });
  }

  // Validate course belongs to this teacher (or admin)
  if (user.role !== "ADMIN") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true, teacherIds: true, managerIds: true, assistantIds: true },
    });
    if (!course || !canGradeCourse(user, course)) {
      return Response.json({ ok: false, error: "Bu kursga huquq yo'q" }, { status: 403 });
    }
  }

  // groupId nullable compound unique: Prisma shuni `string` kutadi, ammo
  // bazada `groupId = NULL` bo'lgan qator ham bor. Shuning uchun `""`
  // emas, to'g'ridan-to'g'ri `null` bilan izlaymiz.
  const normalizedGroupId: string | null = groupId ?? null;

  const existing = await prisma.attendancePointConfig.findFirst({
    where: { courseId, groupId: normalizedGroupId },
    select: { id: true },
  });

  const config = existing
    ? await prisma.attendancePointConfig.update({
        where: { id: existing.id },
        data: { points: value },
      })
    : await prisma.attendancePointConfig.create({
        data: {
          courseId,
          groupId: normalizedGroupId,
          points: value,
          teacherId: user.id,
        },
      });

  return Response.json({ ok: true, data: config });
}