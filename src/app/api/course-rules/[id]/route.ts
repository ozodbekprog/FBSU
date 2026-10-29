import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rule = await prisma.activityRule.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!rule) return Response.json({ ok: false, error: "Qoida topilmadi" }, { status: 404 });
  if (!canManageCourse(user, rule.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  await prisma.activityRule.delete({ where: { id } });

  await recordEvent(user.id, "courseRule.delete", {
    entity: "ActivityRule",
    entityId: id,
    meta: { courseId: rule.courseId, targetType: rule.targetType, targetId: rule.targetId },
  });

  return Response.json({ ok: true, data: { deleted: true } });
}
