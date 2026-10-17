import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { recordEvent } from "@/modules/events/record";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, selfEnrollment: true },
  });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!course.selfEnrollment) {
    return Response.json(
      { ok: false, error: "Bu kursga o'z-o'zidan yozilish yopiq" },
      { status: 403 },
    );
  }

  const existing = await prisma.enrollment.findFirst({
    where: { courseId: course.id, userId: user.id },
    select: { id: true },
  });
  if (existing) {
    return Response.json(
      { ok: false, error: "Siz allaqachon yozilgansiz" },
      { status: 409 },
    );
  }

  await prisma.enrollment.create({
    data: { courseId: course.id, userId: user.id, status: "ACTIVE" },
  });

  await recordEvent(user.id, "enroll", {
    entity: "Course",
    entityId: course.id,
  });

  return Response.json({ ok: true, data: { enrolled: true } });
}
