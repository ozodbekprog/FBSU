import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { notifyUser } from "@/server/notify";
import { logAudit } from "@/server/audit";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

/**
 * Kursga yozilish so'rovini ko'rib chiqish (faqat ADMIN/REGISTRAR).
 * Tasdiqlansa — talaba kursga qo'shiladi; rad etilsa — status REJECTED.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Amal noto'g'ri" }, { status: 400 });
  }

  const { id } = await params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true } },
      course: { select: { title: true, slug: true, isPublished: true } },
    },
  });
  if (!enrollment) {
    return Response.json({ ok: false, error: "Yozuv topilmadi" }, { status: 404 });
  }
  if (enrollment.status !== "PENDING") {
    return Response.json({ ok: false, error: "Bu so'rov allaqachon ko'rib chiqilgan" }, { status: 409 });
  }

  const link = `/courses/${enrollment.course.slug}`;

  if (parsed.data.action === "approve") {
    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    try {
      await notifyUser(enrollment.user.id, {
        title: `Kursga yozilishingiz tasdiqlandi: ${enrollment.course.title}`,
        link,
      });
    } catch {}
    await logAudit({
      actorId: user.id,
      action: "enrollment.approve",
      entity: "Enrollment",
      entityId: id,
      meta: { courseId: enrollment.courseId, studentId: enrollment.userId },
    });
    return Response.json({ ok: true, data: updated });
  }

  const rejected = await prisma.enrollment.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  try {
    await notifyUser(enrollment.user.id, {
      title: `Kursga yozilish so'rovingiz rad etildi: ${enrollment.course.title}`,
      link,
    });
  } catch {}
  await logAudit({
    actorId: user.id,
    action: "enrollment.reject",
    entity: "Enrollment",
    entityId: id,
    meta: { courseId: enrollment.courseId, studentId: enrollment.userId },
  });
  return Response.json({ ok: true, data: rejected });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: { course: { select: { id: true, teacherId: true } } },
  });
  if (!enrollment) {
    return Response.json({ ok: false, error: "Yozuv topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, enrollment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.enrollment.delete({ where: { id: enrollment.id } });

  return Response.json({ ok: true, data: { id: enrollment.id } });
}
