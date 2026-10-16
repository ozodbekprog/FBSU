import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const setSchema = z.object({
  itemId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  score: z.number(),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = setSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });

  const item = await prisma.gradeItem.findUnique({
    where: { id: parsed.data.itemId },
    include: { course: true },
  });
  if (!item) return Response.json({ ok: false, error: "Ustun topilmadi" }, { status: 404 });
  if (!canManageCourse(user, item.course)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { score, studentId } = parsed.data;
  if (score < 0 || score > item.maxScore) {
    return Response.json({ ok: false, error: "Ball 0 va maksimal ball orasida bo'lishi kerak" }, { status: 400 });
  }

  const saved = await prisma.gradeItemScore.upsert({
    where: { itemId_studentId: { itemId: item.id, studentId } },
    update: { score },
    create: { itemId: item.id, studentId, score },
  });

  await recordEvent(user.id, "gradebook.score.set", {
    entity: "GradeItem",
    entityId: item.id,
    meta: { studentId, score },
  });

  return Response.json({ ok: true, data: saved });
}
