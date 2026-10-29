import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const { id } = await ctx.params;
  const item = await prisma.gradeItem.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!item) return Response.json({ ok: false, error: "Ustun topilmadi" }, { status: 404 });
  if (!canManageCourse(user, item.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.gradeItem.delete({ where: { id } });

  await recordEvent(user.id, "gradebook.item.delete", {
    entity: "GradeItem",
    entityId: id,
    meta: { courseId: item.courseId, name: item.name },
  });

  return Response.json({ ok: true, data: { deleted: true } });
}
