import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const configs = await prisma.attendancePointConfig.findMany({
    where: user.role === "ADMIN" ? {} : { teacherId: user.id },
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  const { courseId, groupId, points } = body as {
    courseId?: unknown;
    groupId?: unknown;
    points?: unknown;
  };

  if (!courseId || points === undefined) {
    return Response.json({ ok: false, error: "courseId va points shart" }, { status: 400 });
  }
  if (typeof courseId !== "string") {
    return Response.json({ ok: false, error: "courseId noto'g'ri" }, { status: 400 });
  }

  const value = Number(points);
  if (!Number.isFinite(value) || value < 0.1 || value > 15) {
    return Response.json({ ok: false, error: "Ball 0.1 dan 15 gacha" }, { status: 400 });
  }

  // Validate course belongs to this teacher (or admin)
  if (user.role !== "ADMIN") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!course || course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Bu kursga huquq yo'q" }, { status: 403 });
    }
  }

  // groupId nullable compound unique: Prisma shuni `string` kutadi, ammo
  // bazada `groupId = NULL` bo'lgan qator ham bor. Shuning uchun `""`
  // emas, to'g'ridan-to'g'ri `null` bilan izlaymiz.
  const normalizedGroupId: string | null =
    typeof groupId === "string" && groupId.length > 0 ? groupId : null;

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