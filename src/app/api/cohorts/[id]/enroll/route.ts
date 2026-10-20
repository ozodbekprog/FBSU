import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { recordEvent } from "@/modules/events/record";

const enrollSchema = z.object({
  courseId: z.string().trim().min(1),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cohort = await prisma.cohort.findUnique({ where: { id }, select: { id: true } });
  if (!cohort) return Response.json({ ok: false, error: "Kohort topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kurs tanlanmagan" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true },
  });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });

  const members = await prisma.cohortMember.findMany({
    where: { cohortId: id },
    select: { userId: true },
  });

  if (members.length === 0) {
    return Response.json({ ok: true, data: { enrolled: 0 } });
  }

  const userIds = members.map((member) => member.userId);
  const existing = await prisma.enrollment.findMany({
    where: { courseId: course.id, userId: { in: userIds } },
    select: { userId: true },
  });
  const enrolledIds = new Set(existing.map((entry) => entry.userId));
  const toCreate = userIds.filter((userId) => !enrolledIds.has(userId));

  if (toCreate.length > 0) {
    await prisma.enrollment.createMany({
      data: toCreate.map((userId) => ({
        courseId: course.id,
        userId,
        status: "ACTIVE" as const,
      })),
      skipDuplicates: true,
    });
  }

  await recordEvent(user.id, "cohort.enroll", {
    entity: "Cohort",
    entityId: id,
    meta: { courseId: course.id, enrolled: toCreate.length },
  });

  return Response.json({ ok: true, data: { enrolled: toCreate.length } });
}
