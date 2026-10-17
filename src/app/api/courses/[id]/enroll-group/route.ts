import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const bodySchema = z.object({
  groupId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Guruh tanlanmagan" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: parsed.data.groupId },
    select: { id: true },
  });
  if (!group) {
    return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });
  }

  const plan = await prisma.studyPlan.findUnique({
    where: { groupId_courseId: { groupId: group.id, courseId: course.id } },
    select: { id: true },
  });
  if (!plan) {
    return Response.json(
      { ok: false, error: "Guruh bu kursga tegishli emas" },
      { status: 400 },
    );
  }

  const students = await prisma.user.findMany({
    where: { groupId: group.id, role: "STUDENT", isActive: true },
    select: { id: true },
  });

  if (students.length === 0) {
    return Response.json({ ok: true, data: { enrolled: 0 } });
  }

  const existing = await prisma.enrollment.findMany({
    where: { courseId: course.id, userId: { in: students.map((student) => student.id) } },
    select: { userId: true },
  });
  const enrolledIds = new Set(existing.map((entry) => entry.userId));
  const toCreate = students.filter((student) => !enrolledIds.has(student.id));

  if (toCreate.length > 0) {
    await prisma.enrollment.createMany({
      data: toCreate.map((student) => ({
        courseId: course.id,
        userId: student.id,
        status: "ACTIVE" as const,
      })),
      skipDuplicates: true,
    });
  }

  await recordEvent(user.id, "enroll", {
    entity: "Group",
    entityId: group.id,
    meta: { courseId: course.id, enrolled: toCreate.length },
  });

  return Response.json({ ok: true, data: { enrolled: toCreate.length } });
}
